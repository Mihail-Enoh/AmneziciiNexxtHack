// Diagnose the AI intake outside the app. Run from the project root:
//   bun scripts/test-intake.ts            (uses the example story)
//   bun scripts/test-intake.ts "Tata are 80 de ani..."
// Needs FEATHERLESS_API_KEY and FEATHERLESS_MODEL set in this terminal.
import { INTAKE_SYSTEM_PROMPT } from "../src/lib/intake-prompt";
import { intakeFromModelText } from "../src/lib/intake";

const key = process.env.FEATHERLESS_API_KEY;
const model = process.env.FEATHERLESS_MODEL;
const story =
  process.argv[2] ??
  "Mama are 72 de ani, stă singură la Iași, are pensie 1.800 lei și 15.000 de economii. Încă se descurcă, dar îi fac eu cumpărăturile. Eu câștig 7.000 net și fratele meu Radu ar putea da 300 lei pe lună. Eu aș putea da 500.";

if (!key || !model) {
  console.log("LIPSEȘTE:", !key ? "FEATHERLESS_API_KEY" : "", !model ? "FEATHERLESS_MODEL" : "");
  process.exit(1);
}
console.log("Model:", model);

const t0 = Date.now();
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), 90_000);
let res: Response;
try {
  res = await fetch("https://api.featherless.ai/v1/chat/completions", {
    method: "POST",
    signal: ctrl.signal,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: INTAKE_SYSTEM_PROMPT },
        { role: "user", content: story },
      ],
    }),
  });
} catch (e) {
  console.log(`EROARE DE REȚEA după ${Date.now() - t0} ms:`, String(e));
  process.exit(1);
}
clearTimeout(timer);
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const body = await res.text();
console.log(`HTTP ${res.status} în ${secs} s`);

if (!res.ok) {
  console.log("Răspunsul serverului:", body.slice(0, 800));
  process.exit(1);
}

let data: { choices?: { message?: { content?: string }; finish_reason?: string }[] };
try {
  data = JSON.parse(body);
} catch {
  console.log("Serverul nu a trimis JSON:", body.slice(0, 800));
  process.exit(1);
}
const choice = data.choices?.[0];
const text = choice?.message?.content ?? "";
console.log("finish_reason:", choice?.finish_reason, "| lungime text:", text.length);
console.log("----- TEXTUL MODELULUI -----");
console.log(text.slice(0, 3000));
console.log("----------------------------");

const result = intakeFromModelText(text);
if (!result) {
  console.log("REZULTAT: intakeFromModelText a întors null (textul nu conține un JSON valid).");
} else {
  console.log("REZULTAT OK → pagina:", result.path);
  console.log("Completat:", result.filled.map((c) => `${c.label}: ${c.value}`).join(" | "));
  console.log("Estimat:", result.assumed.map((c) => `${c.label}: ${c.value}`).join(" | ") || "-");
  console.log("Lipsește:", result.missing.join(", ") || "-");
}
if (Number(secs) > 25) console.log(`ATENȚIE: a durat ${secs} s, peste limita de 25 s din aplicație.`);