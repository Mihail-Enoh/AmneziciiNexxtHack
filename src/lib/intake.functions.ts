import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { INTAKE_SYSTEM_PROMPT } from "./intake-prompt";
import { intakeFromModelText, type IntakeResult } from "./intake";

/** Used when the FEATHERLESS_MODEL secret is missing. Same model that passed the terminal test. */
const DEFAULT_TEXT_MODEL = "Qwen/Qwen3-235B-A22B";
export type IntakeFail = "no_key" | "timeout" | "network" | `http_${number}` | "parse";

let busy: Promise<unknown> = Promise.resolve();

async function callModel(story: string): Promise<{ text: string } | { fail: IntakeFail }> {
  // .trim(): a secret pasted with a trailing space/newline is a common silent failure.
  const key = process.env["FEATHERLESS_API_KEY"]?.trim();
  const model = process.env["FEATHERLESS_MODEL"]?.trim() || DEFAULT_TEXT_MODEL;
  if (!key) return { fail: "no_key" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          { role: "system", content: INTAKE_SYSTEM_PROMPT },
          { role: "user", content: story },
        ],
      }),
    });
    if (!res.ok) {
      console.error("intake: model call failed", res.status, model);
      return { fail: `http_${res.status}` };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: json.choices?.[0]?.message?.content ?? "" };
  } catch (e) {
    const fail: IntakeFail = e instanceof Error && e.name === "AbortError" ? "timeout" : "network";
    console.error("intake: model call error", fail);
    return { fail };
  } finally {
    clearTimeout(timer);
  }
}

type IntakeResponse = { ok: true; result: IntakeResult } | { ok: false; reason: IntakeFail };

/** The whole endpoint logic as a plain function (testable without the server runtime). */
export function runIntakeCore(story: string): Promise<IntakeResponse> {
  const job = busy.then(async (): Promise<IntakeResponse> => {
    let reason: IntakeFail = "parse";
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await callModel(story);
      if ("fail" in r) {
        reason = r.fail;
        if (r.fail === "no_key" || r.fail.startsWith("http_4")) break; // retrying won't help
        continue;
      }
      const result = intakeFromModelText(r.text);
      if (result) return { ok: true, result };
      reason = "parse";
    }
    console.error("intake: failed", reason);
    return { ok: false, reason };
  });
  busy = job.catch(() => null);
  return job.catch((): IntakeResponse => ({ ok: false, reason: "network" }));
}

export const runIntake = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ story: z.string().trim().min(1).max(600) }).parse(d))
  .handler(({ data }): Promise<IntakeResponse> => runIntakeCore(data.story));