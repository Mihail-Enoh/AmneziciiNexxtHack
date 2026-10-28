import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { INTAKE_SYSTEM_PROMPT } from "./intake-prompt";
import { intakeFromModelText, type IntakeResult } from "./intake";

import { textTask, type Fail } from "./featherless";

export type IntakeFail = Fail;
let busy: Promise<unknown> = Promise.resolve();

type IntakeResponse = { ok: true; result: IntakeResult } | { ok: false; reason: IntakeFail };

/** The whole endpoint logic as a plain function (testable without the server runtime). */
export function runIntakeCore(story: string, name = ""): Promise<IntakeResponse> {
  const job = busy.then(async (): Promise<IntakeResponse> => {
    const r = await textTask(
      [{ role: "system", content: INTAKE_SYSTEM_PROMPT }, { role: "user", content: story }],
      (text) => intakeFromModelText(text, { name }),
      60_000,
      2000,
    );
    if ("ok" in r) return { ok: true, result: r.ok };
    console.error("intake: failed", r.fail);
    return { ok: false, reason: r.fail };
  });
  busy = job.catch(() => null);
  return job.catch((): IntakeResponse => ({ ok: false, reason: "network" }));
}

export const runIntake = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ story: z.string().trim().min(1).max(600), name: z.string().trim().max(80).default("") }).parse(d))
  .handler(({ data }): Promise<IntakeResponse> => runIntakeCore(data.story, data.name));