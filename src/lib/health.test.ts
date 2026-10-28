import { describe, expect, it } from "vitest";
import {
  assessHealth, extractJson, flagOf, healthPatch, labReason, QUIZ, quizAsText, reflag, sanitizeInterpretation, sanitizeRead, scoreQuiz,
  type QuizAnswers,
} from "./health";
import { HEALTH_INTERPRET_PROMPT, interpretMessage, VISION_READ_PROMPT } from "./health-prompt";
import { computePlan, demoState, type PlanState } from "./plan";

// What a good vision model returns for the FICTITIOUS report (scripts/buletin-*.png/jpg).
const FICTIVE = {
  documentType: "lab_report", date: "14.10.2026",
  tests: [
    { name: "Hemoglobină", value: 11.2, unit: "g/dL", refLow: 12, refHigh: 16, refText: "12,0 – 16,0" },
    { name: "Leucocite", value: 6.8, unit: "mii/µL", refLow: 4, refHigh: 10, refText: "4,0 – 10,0" },
    { name: "Glicemie", value: 142, unit: "mg/dL", refLow: 70, refHigh: 105, refText: "70 – 105" },
    { name: "Hemoglobină glicată (HbA1c)", value: 7.4, unit: "%", refLow: 4, refHigh: 6, refText: "4,0 – 6,0" },
    { name: "Creatinină serică", value: 1.4, unit: "mg/dL", refLow: 0.5, refHigh: 1.1, refText: "0,50 – 1,10" },
    { name: "RFG estimat (eGFR)", value: 38, unit: "mL/min/1,73m²", refLow: 60, refHigh: null, refText: "> 60" },
    { name: "Colesterol total", value: 232, unit: "mg/dL", refLow: null, refHigh: 200, refText: "< 200" },
    { name: "LDL colesterol", value: 151, unit: "mg/dL", refLow: null, refHigh: 130, refText: "< 130" },
    { name: "TSH", value: 2.1, unit: "µUI/mL", refLow: 0.4, refHigh: 4, refText: "0,40 – 4,00" },
    { name: "25-OH Vitamina D", value: 14, unit: "ng/mL", refLow: 30, refHigh: 100, refText: "30 – 100" },
    { name: "Vitamina B12", value: 290, unit: "pg/mL", refLow: 200, refHigh: 900, refText: "200 – 900" },
  ],
};
const healthyAnswers: QuizAnswers = Object.fromEntries(QUIZ.map((q) => [q.id, [q.options.find((o) => o.points === 0)!.id]]));
const frailAnswers: QuizAnswers = Object.fromEntries(QUIZ.map((q) => [q.id, q.multi ? q.options.filter((o) => o.points > 0).map((o) => o.id) : [q.options[q.options.length - 1]!.id]]));

describe("quiz", () => {
  it("every question has a 0-point answer and unique ids", () => {
    expect(new Set(QUIZ.map((q) => q.id)).size).toBe(QUIZ.length);
    for (const q of QUIZ) expect(q.options.some((o) => o.points === 0)).toBe(true);
  });
  it("scores single and multi choice, ignores unknown ids", () => {
    const r = scoreQuiz({ smoking: ["daily"], conditions: ["diabetes", "heart"], memory: ["nonsense"] });
    expect(r.find((x) => x.text.startsWith("Fumează"))?.level).toBe(2);
    expect(r.find((x) => x.domain === "chronic")?.level).toBe(2);
    expect(r.some((x) => x.domain === "cognition")).toBe(false);
  });
  it("renders answers as readable text for the prompt", () => {
    expect(quizAsText({ medsCount: ["many"] })).toBe("- Câte medicamente ia zilnic? Peste 5");
  });
});

describe("lab results from the vision model", () => {
  it("reads the fictitious report: 11 tests, 8 out of range", () => {
    const r = sanitizeRead(FICTIVE);
    expect(r.labs).toHaveLength(11);
    expect(r.labs.filter((l) => l.flag !== "normal").map((l) => l.name)).toEqual([
      "Hemoglobină", "Glicemie", "Hemoglobină glicată (HbA1c)", "Creatinină serică", "RFG estimat (eGFR)", "Colesterol total", "LDL colesterol", "25-OH Vitamina D",
    ]);
    expect(r.date).toBe("14.10.2026");
    expect(labReason(r.labs)?.level).toBe(2);
  });
  it("computes flags itself and handles open intervals", () => {
    expect(flagOf(38, 60, null)).toBe("low");
    expect(flagOf(232, null, 200)).toBe("high");
    expect(flagOf(5, null, null)).toBe("unknown");
    expect(flagOf(12, 12, 16)).toBe("normal");
  });
  it("accepts '11,2' strings, drops junk rows, never throws", () => {
    const r = sanitizeRead({ tests: [{ name: "Hemoglobină", value: "11,2", refLow: "12", refHigh: "16" }, { name: "", value: 1 }, { name: "X", value: "abc" }, null, 7] });
    expect(r.labs).toEqual([expect.objectContaining({ name: "Hemoglobină", value: 11.2, flag: "low" })]);
    for (const g of [null, 5, "x", [], { tests: "no" }, { tests: [{}] }]) expect(() => sanitizeRead(g)).not.toThrow();
  });
  it("re-flags after the user corrects a value", () => {
    const [hb] = sanitizeRead(FICTIVE).labs;
    expect(reflag([{ ...hb!, value: 13 }])[0]!.flag).toBe("normal");
  });
  it("extracts JSON from fenced / thinking answers", () => {
    expect(extractJson("<think>{x}</think>```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
    expect(extractJson("nimic")).toBeNull();
  });
});

describe("AI interpretation is sanitized", () => {
  it("keeps valid signals, clamps levels, drops unknown domains and empty evidence", () => {
    const ai = sanitizeInterpretation({
      summary: "Rezumat.",
      signals: [
        { domain: "mobility", level: 5, evidence: "a căzut de două ori" },
        { domain: "astrology", level: 2, evidence: "x" },
        { domain: "social", level: 1, evidence: "" },
      ],
      questionsForDoctor: ["Q1", 3, "", "Q2"],
    })!;
    expect(ai.reasons).toEqual([{ domain: "mobility", level: 2, text: "a căzut de două ori", source: "poveste" }]);
    expect(ai.questionsForDoctor).toEqual(["Q1", "Q2"]);
  });
  it("returns null for empty or garbage answers", () => {
    expect(sanitizeInterpretation(null)).toBeNull();
    expect(sanitizeInterpretation({ signals: [] })).toBeNull();
  });
});

describe("rules (deterministic prediction)", () => {
  it("no risk signals at 67 → base timeline, independent", () => {
    const a = assessHealth({ age: 67, answers: healthyAnswers, labs: [], ai: null });
    expect(a.riskPoints).toBe(0);
    expect(a.independence).toBe("independent");
    expect(a.timeline.map((t) => t.years)).toEqual([5, 7, 10, 15]);
    expect(a.focus).toEqual({ scenario: "daily", years: 10 });
    expect(a.aiUsed).toBe(false);
  });
  it("frail answers + fictitious labs at 81 → help needed now, scenarios much sooner, never below 1 year", () => {
    const labs = sanitizeRead(FICTIVE).labs;
    const a = assessHealth({ age: 81, answers: frailAnswers, labs, ai: null });
    expect(a.independence).toBe("regular");
    expect(a.timeline.find((t) => t.id === "occasional")?.years).toBe(0);
    expect(a.timeline.find((t) => t.id === "frequent")?.years).toBe(0);
    expect(a.focus.years).toBeGreaterThanOrEqual(1);
    expect(a.focus.years).toBeLessThan(10);
    expect(a.sooner).toBe(70); // capped
    expect(a.riskPoints).toBeLessThanOrEqual(a.maxPoints);
  });
  it("more risk never makes care come later", () => {
    const mild = assessHealth({ age: 70, answers: { walking: ["difficulty"] }, labs: [], ai: null });
    const worse = assessHealth({ age: 70, answers: { walking: ["helped"], memory: ["some"] }, labs: [], ai: null });
    worse.timeline.forEach((t, i) => expect(t.years).toBeLessThanOrEqual(mild.timeline[i]!.years));
  });
  it("story signals from the AI raise a domain and appear as reasons", () => {
    const ai = sanitizeInterpretation({ summary: "S", signals: [{ domain: "cognition", level: 2, evidence: "se rătăcește în cartier" }] });
    const a = assessHealth({ age: 75, answers: {}, labs: [], ai });
    expect(a.domains.find((d) => d.domain === "cognition")).toMatchObject({ level: 2, reasons: [expect.objectContaining({ source: "poveste" })] });
    expect(a.independence).toBe("regular");
    expect(a.summary).toBe("S");
  });
  it("patch works with the real engine and clears a manual care date", () => {
    const s: PlanState = { ...demoState(), careStartDate: "2030-01-01" };
    const a = assessHealth({ age: 78, answers: { walking: ["difficulty"] }, labs: [], ai: null });
    const next = { ...s, ...healthPatch(s, a) } as PlanState;
    expect(next.careStartDate).toBe("");
    expect(next.parent.independence).toBe("occasional");
    expect(next.parent.name).toBe(s.parent.name); // rest of the parent untouched
    const c = computePlan(next);
    expect(Number.isFinite(c.familyFundingGap)).toBe(true);
    expect(c.monthsUntilScenario).toBe(a.focus.years * 12);
  });
});

describe("prompts", () => {
  it("vision prompt forbids personal identifiers; interpretation forbids diagnosis and life expectancy", () => {
    expect(VISION_READ_PROMPT).toMatch(/Never output the patient's name/);
    expect(HEALTH_INTERPRET_PROMPT).toMatch(/NU pui diagnostice/);
    expect(HEALTH_INTERPRET_PROMPT).toMatch(/NU estimezi câți ani mai trăiește/);
  });
  it("builds the user message with all four parts", () => {
    const m = interpretMessage({ age: 74, story: "Mama stă singură.", quizText: "- Cum se deplasează? Singură", labsText: "- TSH: 2.1" });
    for (const s of ["74 ani", "Mama stă singură.", "Cum se deplasează? Singură", "TSH: 2.1"]) expect(m).toContain(s);
  });
});