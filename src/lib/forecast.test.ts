import { describe, expect, it } from "vitest";
import { forecast, forecastPatch, monthlySavingFor, onsetCurve, presentValue, realRate, riskPoints } from "./forecast";
import { assessHealth, type QuizAnswers } from "./health";
import { computePlan, demoState, SCENARIOS, type PlanState } from "./plan";

const NOW = new Date("2026-10-28T12:00:00Z");
const close = (a: number, b: number, tol = 0.2) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
const elena74: PlanState = { ...demoState(), parent: { ...demoState().parent, age: 74 } };

describe("math helpers", () => {
  it("Fisher real rate", () => close(realRate(0.07, 0.04), 0.028846, 1e-5));
  it("present value: 0% equals the sum", () => expect(presentValue([100, 100, 100], 0)).toBeCloseTo(300, 6));
  it("monthly saving: 0% is target/months, interest lowers it, edge cases", () => {
    expect(monthlySavingFor(12000, 120, 0)).toBeCloseTo(100, 6);
    expect(monthlySavingFor(12000, 120, 0.03)!).toBeLessThan(100);
    expect(monthlySavingFor(12000, 0, 0.03)).toBeNull();
    expect(monthlySavingFor(0, 12, 0.03)).toBe(0);
  });
});

describe("when help may be needed", () => {
  it("is calibrated to the plan's thresholds for a 67-year-old with no risk", () => {
    for (const sc of SCENARIOS) close(onsetCurve(67, 0, sc.id, 20).p50, sc.yearsFromNow);
  });
  it("shows a narrow central interval around the most likely year", () => {
    const c = onsetCurve(67, 0, "daily", 10);
    expect(c.low).toBeLessThan(c.p50);
    expect(c.high).toBeGreaterThan(c.p50);
    expect(c.high - c.low).toBeLessThanOrEqual(4); // ~8–12 years, not 5–15
  });
  it("probabilities add up to the cumulative chance", () => {
    const c = onsetCurve(70, 5, "daily", 15);
    let sum = 0;
    for (const y of c.years) { sum += y.probability; expect(y.cumulative).toBeCloseTo(sum, 10); }
  });
  it("more risk or older age → earlier; missing age handled", () => {
    expect(onsetCurve(70, 10, "daily", 15).p50).toBeLessThan(onsetCurve(70, 0, "daily", 15).p50);
    expect(onsetCurve(82, 0, "daily", 15).p50).toBeLessThan(onsetCurve(70, 0, "daily", 15).p50);
    expect(Number.isFinite(onsetCurve(0, 0, "daily", 10).p50)).toBe(true);
  });
});

describe("risk points", () => {
  it("each habit counts on its own (quitting one bad habit always helps)", () => {
    const both: QuizAnswers = { smoking: ["daily"], exercise: ["never"] };
    const quit: QuizAnswers = { smoking: ["no"], exercise: ["never"] };
    expect(riskPoints(null, both)).toBe(4);
    expect(riskPoints(null, quit)).toBe(2);
  });
  it("other domains count their worst answer; lab/story signals can only raise them", () => {
    const a = assessHealth({ age: 74, answers: { falls: ["once"], walking: ["alone"] }, labs: [], ai: { summary: "x", questionsForDoctor: [], reasons: [{ domain: "mobility", level: 2, text: "nu mai merge singură", source: "poveste" }] } });
    expect(riskPoints(a.domains, { falls: ["once"], walking: ["alone"] })).toBe(4); // mobility 2 × weight 2
    expect(riskPoints(a.domains, { falls: ["no"], walking: ["alone"] })).toBe(4); // story signal stays
  });
  it("works with domains only (older saved results)", () => {
    expect(riskPoints([{ domain: "daily", level: 1, reasons: [] }], null)).toBe(2);
  });
});

describe("forecast", () => {
  it("demo plan without health check: finite numbers, one saving figure", () => {
    const f = forecast(demoState(), { now: NOW });
    expect(f.onset.years).toHaveLength(10);
    expect(f.expectedFamilyCost).toBeGreaterThan(0);
    expect(f.expectedFamilyCost).toBeLessThanOrEqual(f.atMedian.familyCost);
    expect(f.saving.perMonth).toBeGreaterThan(0);
    expect(f.saving.months).toBe(f.atMedian.year * 12);
    expect(f.habits).toEqual([]); // no quiz → no habit suggestions
  });
  it("matches plan.ts at the most likely year", () => {
    const f = forecast(demoState(), { now: NOW });
    const p = computePlan({ ...demoState(), yearsUntil: f.atMedian.year, careStartDate: "", costGrowth: 1.5, incomeGrowth: 0 }, "daily", NOW);
    expect(f.atMedian.monthlyGapAtStart).toBe(p.familyFundingGap);
  });
  it("habit suggestions: one per bad habit + all together, with years and % saved", () => {
    const answers: QuizAnswers = { smoking: ["daily"], exercise: ["never"], fruit: ["daily"], falls: ["once"] };
    const a = assessHealth({ age: 74, answers, labs: [], ai: null });
    const f = forecast(elena74, { domains: a.domains, answers, now: NOW });
    expect(f.habits.map((h) => h.id)).toEqual(["smoking", "exercise", "all"]); // fruit already fine
    for (const h of f.habits) {
      expect(h.delayYears).toBeGreaterThan(0);
      expect(h.costSaved).toBeGreaterThan(0);
      expect(h.detail).not.toMatch(/ 0%/);
      expect(h.costSavedPct).toBeLessThanOrEqual(100);
      expect(h.detail).toMatch(/^În modelul nostru, dacă Elena /);
    }
    const all = f.habits.find((h) => h.id === "all")!;
    expect(all.delayYears).toBeGreaterThanOrEqual(Math.max(...f.habits.filter((h) => h.id !== "all").map((h) => h.delayYears)));
  });
  it("habits with a smaller weight gain fewer years", () => {
    const answers: QuizAnswers = { smoking: ["daily"], fruit: ["rarely"] };
    const f = forecast(elena74, { domains: assessHealth({ age: 74, answers, labs: [], ai: null }).domains, answers, now: NOW });
    const by = Object.fromEntries(f.habits.map((h) => [h.id, h]));
    expect(by["smoking"]!.delayYears).toBeGreaterThan(by["fruit"]!.delayYears);
    expect(f.habits[0]!.id).toBe("smoking"); // biggest effect first
  });
  it("no suggestions when habits are already good", () => {
    const answers: QuizAnswers = { smoking: ["no"], alcohol: ["rarely"], exercise: ["daily"], fruit: ["daily"], social: ["often"] };
    const f = forecast(elena74, { domains: assessHealth({ age: 74, answers, labs: [], ai: null }).domains, answers, now: NOW });
    expect(f.habits).toEqual([]);
  });
  it("health risk brings the date earlier than a no-risk check", () => {
    const answers: QuizAnswers = { smoking: ["daily"], falls: ["more"] };
    const risky = forecast(elena74, { domains: assessHealth({ age: 74, answers, labs: [], ai: null }).domains, answers, now: NOW });
    const fine = forecast(elena74, { answers: {}, now: NOW });
    expect(risky.onset.p50).toBeLessThan(fine.onset.p50);
  });
  it("patch writes the same year the screen shows", () => {
    const f = forecast(demoState(), { now: NOW });
    expect(forecastPatch(f)).toEqual({ scenario: "daily", yearsUntil: Math.round(f.onset.p50), careStartDate: "" });
  });
  it("lists its assumptions in Romanian", () => {
    const f = forecast(demoState(), { now: NOW });
    expect(f.assumptions.map((x) => x.label)).toContain("Intervalul afișat");
  });
});