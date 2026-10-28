import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { INTAKE_SYSTEM_PROMPT } from "./intake-prompt";
import { intakeFromModelText, type IntakeResult } from "./intake";

let busy: Promise<unknown> = Promise.resolve();

async function callModel(story: string): Promise<string | null> {
  const key = process.env["FEATHERLESS_API_KEY"];
  const model = process.env["FEATHERLESS_MODEL"];
  if (!key || !model) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: INTAKE_SYSTEM_PROMPT },
          { role: "user", content: story },
        ],
      }),
    });
    if (!res.ok) {
      console.error("intake: model call failed", res.status);
      return null;
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    console.error("intake: model call error");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const runIntake = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ story: z.string().trim().min(1).max(600) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; result: IntakeResult } | { ok: false }> => {
    const job = busy.then(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const text = await callModel(data.story);
        if (text === null) return null;
        const result = intakeFromModelText(text);
        if (result) return result;
      }
      return null;
    });
    busy = job.catch(() => null);
    const result = await job.catch(() => null);
    return result ? { ok: true, result } : { ok: false };
  });
