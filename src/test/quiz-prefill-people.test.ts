import { afterEach, describe, expect, it, vi } from "vitest";
import { QUIZ_PREFILL_PROMPT } from "@/lib/quiz-prefill";
import { runPrefillCore } from "@/lib/quiz-prefill.functions";
import { INTAKE_SYSTEM_PROMPT } from "@/lib/intake-prompt";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("the quiz is only about the cared-for person", () => {
  it("both prompts tell the AI to ignore other people (spouse, siblings, the housekeeper…)", () => {
    for (const prompt of [QUIZ_PREFILL_PROMPT, INTAKE_SYSTEM_PROMPT]) {
      expect(prompt).toContain("DOAR despre persoana îngrijită");
      expect(prompt).toContain("Soția lui bea zilnic și are hipertensiune");
    }
  });
  it("the AI is told who the cared-for person is", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "abc");
    const f = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"answers":{"smoking":"daily"}}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect(await runPrefillCore("John fumează zilnic. Soția lui bea zilnic.", "John")).toEqual({ smoking: ["daily"] });
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.messages[1].content).toContain("Persoana îngrijită: John");
  });
});
