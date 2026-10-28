// Prototype123 — server functions for the health feature. Owner: P3.
// Secrets (server-only): FEATHERLESS_API_KEY, FEATHERLESS_MODEL (text model),
// FEATHERLESS_VISION_MODEL (optional, defaults to Qwen/Qwen2.5-VL-72B-Instruct).
// Never logs the story, the images or the key. Calls run one at a time (Featherless concurrency limit).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  assessHealth, extractJson, labsAsText, quizAsText, reflag, sanitizeInterpretation, sanitizeRead,
  type DocumentRead, type HealthAssessment, type LabResult,
} from "./health";
import { HEALTH_INTERPRET_PROMPT, VISION_READ_PROMPT, interpretMessage } from "./health-prompt";

const DEFAULT_VISION_MODEL = "Qwen/Qwen2.5-VL-72B-Instruct";
const DEFAULT_TEXT_MODEL = "Qwen/Qwen3-235B-A22B";
type Fail = "no_key" | "timeout" | "network" | `http_${number}` | "parse";
type Content = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

let busy: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(fn: () => Promise<T>): Promise<T> {
  const job = busy.then(fn);
  busy = job.catch(() => null);
  return job;
}

async function chat(model: string, messages: { role: "system" | "user"; content: Content }[], timeoutMs: number, maxTokens: number): Promise<{ text: string } | { fail: Fail }> {
  const key = process.env["FEATHERLESS_API_KEY"]?.trim();
  if (!key || !model) return { fail: "no_key" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.1, max_tokens: maxTokens, messages }),
    });
    if (!res.ok) return { fail: `http_${res.status}` };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: json.choices?.[0]?.message?.content ?? "" };
  } catch (e) {
    return { fail: e instanceof Error && e.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------ 1) read one document image
const ImageInput = z.object({
  image: z.string().max(8_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
});

export const readHealthDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; read: DocumentRead } | { ok: false; reason: Fail }> => {
    const model = process.env["FEATHERLESS_VISION_MODEL"]?.trim() || DEFAULT_VISION_MODEL;
    return oneAtATime(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await chat(model, [{ role: "user", content: [{ type: "text", text: VISION_READ_PROMPT }, { type: "image_url", image_url: { url: data.image } }] }], 90_000, 2000);
        if ("fail" in r) {
          console.error("health: vision call failed", r.fail);
          if (r.fail === "no_key" || r.fail.startsWith("http_4")) return { ok: false as const, reason: r.fail };
          continue;
        }
        const raw = extractJson(r.text);
        if (raw) return { ok: true as const, read: sanitizeRead(raw) };
      }
      console.error("health: vision answer not readable");
      return { ok: false as const, reason: "parse" as const };
    });
  });

// ------------------------------------------------------------ 2) interpret + apply the rules
const LabInput = z.object({
  name: z.string().max(80), value: z.number().finite(), unit: z.string().max(30),
  refLow: z.number().finite().nullable(), refHigh: z.number().finite().nullable(),
  refText: z.string().max(40), flag: z.enum(["low", "high", "normal", "unknown"]),
  date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/).optional(),
});
const AssessInput = z.object({
  name: z.string().max(80).default(""),
  age: z.number().int().min(0).max(120),
  story: z.string().max(4000),
  answers: z.record(z.string().max(40), z.array(z.string().max(40)).max(10)),
  labs: z.array(LabInput).max(60),
});

/** Always returns an assessment. If the AI fails, the quiz + lab rules still work (aiUsed: false). */
export const assessHealthFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AssessInput.parse(d))
  .handler(async ({ data }): Promise<{ assessment: HealthAssessment; aiFail: Fail | null }> => {
    const labs: LabResult[] = reflag(data.labs.map(({ date, ...l }) => (date ? { ...l, date } : l)));
    const model = process.env["FEATHERLESS_MODEL"]?.trim() || DEFAULT_TEXT_MODEL;
    const user = interpretMessage({ name: data.name, age: data.age, story: data.story, quizText: quizAsText(data.answers), labsText: labsAsText(labs) });
    const ai = await oneAtATime(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await chat(model, [{ role: "system", content: HEALTH_INTERPRET_PROMPT }, { role: "user", content: user }], 45_000, 1200);
        if ("fail" in r) {
          console.error("health: interpret call failed", r.fail);
          if (r.fail === "no_key" || r.fail.startsWith("http_4")) return { fail: r.fail };
          continue;
        }
        const parsed = sanitizeInterpretation(extractJson(r.text));
        if (parsed) return { parsed };
      }
      return { fail: "parse" as Fail };
    });
    const interpretation = "parsed" in ai ? ai.parsed : null;
    return {
      assessment: assessHealth({ age: data.age, answers: data.answers, labs, ai: interpretation }),
      aiFail: "fail" in ai ? ai.fail : null,
    };
  });