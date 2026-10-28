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

import { chat, fatal, textTask, visionModel, type Fail } from "./featherless";

let busy: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(fn: () => Promise<T>): Promise<T> {
  const job = busy.then(fn);
  busy = job.catch(() => null);
  return job;
}

// ------------------------------------------------------------ 1) read one document image
const ImageInput = z.object({
  image: z.string().max(8_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
});

export const readHealthDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; read: DocumentRead } | { ok: false; reason: Fail }> => {
    const model = visionModel();
    return oneAtATime(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await chat(model, [{ role: "user", content: [{ type: "text", text: VISION_READ_PROMPT }, { type: "image_url", image_url: { url: data.image } }] }], 90_000, 2000);
        if ("fail" in r) {
          console.error("health: vision call failed", r.fail);
          if (fatal(r.fail) || r.fail.startsWith("http_4")) return { ok: false as const, reason: r.fail };
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
    const user = interpretMessage({ name: data.name, age: data.age, story: data.story, quizText: quizAsText(data.answers), labsText: labsAsText(labs) });
    const r = await oneAtATime(() => textTask(
      [{ role: "system", content: HEALTH_INTERPRET_PROMPT }, { role: "user", content: user }],
      (text) => sanitizeInterpretation(extractJson(text)),
      60_000,
      2000,
    ));
    const ai = "ok" in r ? { parsed: r.ok } : { fail: r.fail };
    const interpretation = "parsed" in ai ? ai.parsed : null;
    return {
      assessment: assessHealth({ age: data.age, answers: data.answers, labs, ai: interpretation }),
      aiFail: "fail" in ai ? ai.fail : null,
    };
  });