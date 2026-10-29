// WeCare — server function: health story → pre-filled quiz answers. Never logs the story.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { extractJson, type QuizAnswers } from "./health";
import { QUIZ_PREFILL_PROMPT, sanitizeQuizPrefill } from "./quiz-prefill";
import { textTask } from "./featherless";

let busy: Promise<unknown> = Promise.resolve();

/** Plain function (testable). Any failure → no answers, so the quiz simply stays empty. */
export function runPrefillCore(story: string, name = ""): Promise<QuizAnswers> {
  const job = busy.then(async () => {
    const r = await textTask(
      [{ role: "system", content: QUIZ_PREFILL_PROMPT }, { role: "user", content: `Persoana îngrijită: ${name.trim() || "părintele"}\n\nTEXTUL:\n${story}` }],
      (text) => {
        const json = extractJson(text) as { answers?: unknown } | null;
        return json && typeof json === "object" ? sanitizeQuizPrefill(json.answers ?? json) : null;
      },
      30_000,
      600,
    );
    if ("ok" in r) return r.ok;
    console.error("quiz prefill: failed", r.fail);
    return {};
  });
  busy = job.catch(() => null);
  return job.catch((): QuizAnswers => ({}));
}

export const prefillQuizFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ story: z.string().trim().min(1).max(4000), name: z.string().trim().max(80).default("") }).parse(d))
  .handler(async ({ data }): Promise<{ answers: QuizAnswers }> => ({ answers: await runPrefillCore(data.story, data.name) }));
