import { afterEach, describe, expect, it, vi } from "vitest";
import { markAsUser, mergePrefill, QUIZ_PREFILL_PROMPT, sanitizeQuizPrefill } from "@/lib/quiz-prefill";
import { runPrefillCore } from "@/lib/quiz-prefill.functions";
import { applyIntake, IntakeSchema } from "@/lib/intake";
import { INTAKE_SYSTEM_PROMPT } from "@/lib/intake-prompt";
import { otherKey } from "@/lib/health";

const reply = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("AI answers are checked before they reach the quiz", () => {
  it("keeps known questions and options (ids or labels), drops the rest", () => {
    expect(sanitizeQuizPrefill({
      smoking: "no", alcohol: "Deloc sau rar", exercise: "maybe", walking: ["difficulty"],
      unknownQuestion: "x", conditions: ["bp", "cancer", "Diabet"],
    })).toEqual({ smoking: ["no"], alcohol: ["rarely"], walking: ["difficulty"], conditions: ["bp", "diabetes"] });
  });
  it("drops a single-choice question with two different answers (unsure)", () => {
    expect(sanitizeQuizPrefill({ smoking: ["no", "daily"] })).toEqual({});
  });
  it("'Niciuna' is not combined with real conditions", () => {
    expect(sanitizeQuizPrefill({ conditions: ["none", "bp"] })).toEqual({ conditions: ["bp"] });
    expect(sanitizeQuizPrefill({ conditions: ["none"] })).toEqual({ conditions: ["none"] });
  });
  it("anything that is not an object gives no answers", () => {
    expect(sanitizeQuizPrefill(null)).toEqual({});
    expect(sanitizeQuizPrefill("smoking: no")).toEqual({});
    expect(sanitizeQuizPrefill([1, 2])).toEqual({});
  });
});

describe("pre-filled answers never overwrite what the user picked", () => {
  it("fills only empty questions and earlier AI answers", () => {
    const answers = { smoking: ["daily"], exercise: ["weekly"] };
    const m = mergePrefill(answers, ["exercise"], { smoking: ["no"], exercise: ["never"], walking: ["difficulty"] });
    expect(m.answers).toEqual({ smoking: ["daily"], exercise: ["never"], walking: ["difficulty"] });
    expect(m.fromAi).toEqual(["exercise", "walking"]);
    expect(m.added).toBe(2);
  });
  it("own answers typed for 'conditions' count as picked by the user", () => {
    const m = mergePrefill({ [otherKey("conditions")]: ["Glaucom"] }, [], { conditions: ["bp"] });
    expect(m.added).toBe(0);
  });
  it("changing an answer makes it the user's", () => {
    expect(markAsUser(["smoking", "walking"], "smoking")).toEqual(["walking"]);
  });
});

describe("health story → quiz (mocked Featherless)", () => {
  it("returns only valid answers", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "abc");
    vi.stubGlobal("fetch", vi.fn(async () => reply('{"answers":{"smoking":"no","walking":"difficulty","memory":"???"}}')));
    expect(await runPrefillCore("Nu fumează și merge cu bastonul.")).toEqual({ smoking: ["no"], walking: ["difficulty"] });
  });
  it("a failure leaves the quiz empty", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "");
    expect(await runPrefillCore("x")).toEqual({});
    vi.stubEnv("FEATHERLESS_API_KEY", "abc");
    vi.stubGlobal("fetch", vi.fn(async () => reply("nu știu")));
    expect(await runPrefillCore("x")).toEqual({});
  });
  it("the prompt lists every question id", () => {
    for (const id of ["smoking", "alcohol", "exercise", "walking", "selfcare", "medsAlone", "memory", "medsCount", "conditions", "social"]) {
      expect(QUIZ_PREFILL_PROMPT).toContain(`- ${id}`);
    }
  });
});

describe("the first text on the home page also answers the quiz", () => {
  it("passes valid health answers through and says so in 'Ai spus tu'", () => {
    const r = applyIntake(IntakeSchema.parse({ parent: { age: 74, pension: 2100 }, health: { smoking: "daily", walking: "difficulty", social: "sometimes" } }), { name: "Maria Ionescu" });
    expect(r.quiz).toEqual({ smoking: ["daily"], walking: ["difficulty"] });
    expect(r.filled).toContainEqual({ label: "Sănătate și obiceiuri", value: "2 răspunsuri completate în chestionar" });
  });
  it("no health info → no answers and no chip", () => {
    const r = applyIntake(IntakeSchema.parse({ parent: { age: 74, pension: 2100 } }));
    expect(r.quiz).toEqual({});
    expect(r.filled.some((f) => f.label === "Sănătate și obiceiuri")).toBe(false);
  });
  it("the intake prompt explains the health key", () => {
    expect(INTAKE_SYSTEM_PROMPT).toContain('"health"');
    expect(INTAKE_SYSTEM_PROMPT).toContain('"difficulty" = Cu greutate sau cu baston');
  });
});
