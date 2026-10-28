import { describe, expect, it } from "vitest";
import { FORECAST_ASSUMPTIONS, forecast, forecastPatch, monthlySavingFor, onsetCurve, presentValue, realRate, riskPoints, habitLogHazard } from "./forecast";
import { assessHealth, QUIZ, type QuizAnswers } from "./health";
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
  it("habits are not points: they act through their hazard ratio", () => {
    expect(riskPoints(null, { smoking: ["daily"], exercise: ["never"] })).toBe(0);
    const both = habitLogHazard({ smoking: ["daily"], exercise: ["never"] });
    const quit = habitLogHazard({ smoking: ["daily"], exercise: ["never"] }, ["smoking"]);
    expect(both).toBeCloseTo(Math.log(2.0) + Math.log(1.9), 6);
    expect(quit).toBeLessThan(both);
    expect(quit).toBeGreaterThan(Math.log(1.9)); // quitting late does not undo all the risk
    expect(habitLogHazard({ smoking: ["no"] })).toBe(0);
  });
  it("other domains count their worst answer; lab/story signals can only raise them", () => {
    const a = assessHealth({ age: 74, answers: { walking: ["difficulty"] }, labs: [], ai: { summary: "x", questionsForDoctor: [], reasons: [{ domain: "mobility", level: 2, text: "nu mai merge singură", source: "poveste" }] } });
    expect(riskPoints(a.domains, { walking: ["difficulty"] })).toBe(4); // mobility 2 (story) × weight 2
    expect(riskPoints(a.domains, { walking: ["alone"] })).toBe(4); // story signal stays
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
    expect(f.saving.months).toBe(Math.round(f.onset.p50 * 12));
    expect(f.habits).toEqual([]); // no quiz → no habit suggestions
  });
  it("shows the same monthly gap as the plan page (one set of assumptions)", () => {
    const plan = demoState(); // yearsUntil 10 = the most likely year for Elena
    const f = forecast(plan, { now: NOW });
    expect(f.atMedian.year).toBe(10);
    expect(f.atMedian.monthlyGapAtStart).toBe(computePlan(plan, "daily", NOW).familyFundingGap);
  });
  it("follows the plan's cost growth and switches to the nominal savings rate", () => {
    const flat = forecast(demoState(), { now: NOW });
    const growing = forecast({ ...demoState(), costGrowth: 3 }, { now: NOW });
    expect(flat.todaysPrices).toBe(true);
    expect(growing.todaysPrices).toBe(false);
    expect(growing.atMedian.monthlyGapAtStart).toBeGreaterThan(flat.atMedian.monthlyGapAtStart);
  });
  it("gives the chart enough years to show the whole interval, and the care duration", () => {
    const f = forecast(demoState(), { now: NOW });
    expect(f.chartYears.length).toBeGreaterThanOrEqual(Math.ceil(f.onset.high));
    expect(f.careDurationMonths).toBe(60);
  });
  it("a condition typed by the user counts as risk", () => {
    const base = riskPoints(null, { conditions: ["none"] });
    expect(riskPoints(null, { conditions: [], conditions__other: ["Parkinson"] })).toBeGreaterThan(base);
  });
  it("says 'persoana' when the name is missing, never 'părintele'", () => {
    const answers: QuizAnswers = { smoking: ["daily"] };
    const s = { ...elena74, parent: { ...elena74.parent, name: "" } };
    const f = forecast(s, { domains: assessHealth({ age: 74, answers, labs: [], ai: null }).domains, answers, now: NOW });
    expect(f.habits[0]!.detail).toMatch(/dacă persoana /);
    expect(f.habits[0]!.detail).not.toMatch(/părinte/);
  });
  it("habit suggestions: one per bad habit + all together, with years and less to set aside monthly", () => {
    const answers: QuizAnswers = { smoking: ["daily"], exercise: ["never"], alcohol: ["rarely"], walking: ["difficulty"] };
    const a = assessHealth({ age: 74, answers, labs: [], ai: null });
    const f = forecast(elena74, { domains: a.domains, answers, now: NOW });
    expect(f.habits.map((h) => h.id)).toEqual(["smoking", "exercise", "all"]); // alcohol already fine
    for (const h of f.habits) {
      expect(h.delayYears).toBeGreaterThan(0);
      expect(h.costSaved).toBeGreaterThan(0);
      expect(h.deferredCost).toBe(h.delayMonths * h.monthlyGap); // never "money lost", grows with the delay
      expect(h.delayMonths).toBe(Math.round(h.delayYears * 12) || 1);
      expect(h.detail).toMatch(/mai târziu: aproximativ .* lei amânați/);
      expect(h.detail).toMatch(/^În modelul nostru, dacă Elena /);
    }
    const all = f.habits.find((h) => h.id === "all")!;
    expect(all.delayYears).toBeGreaterThanOrEqual(Math.max(...f.habits.filter((h) => h.id !== "all").map((h) => h.delayYears)));
  });
  it("every habit in FORECAST_ASSUMPTIONS exists in the quiz", () => {
    for (const h of FORECAST_ASSUMPTIONS.habits) expect(QUIZ.some((q) => q.id === h.id)).toBe(true);
  });
  it("a meaningful effect: quitting daily smoking gains years, not months", () => {
    const answers: QuizAnswers = { smoking: ["daily"] };
    const f = forecast(elena74, { domains: assessHealth({ age: 74, answers, labs: [], ai: null }).domains, answers, now: NOW });
    expect(f.habits[0]!.delayYears).toBeGreaterThanOrEqual(1); // at 74, help is already close
    const younger = forecast({ ...elena74, parent: { ...elena74.parent, age: 60 } }, { domains: assessHealth({ age: 60, answers, labs: [], ai: null }).domains, answers, now: NOW });
    expect(younger.habits[0]!.delayYears).toBeGreaterThanOrEqual(2.5);
  });
  it("habits with a smaller hazard ratio gain fewer years", () => {
    const answers: QuizAnswers = { smoking: ["daily"], alcohol: ["daily"] };
    const f = forecast(elena74, { domains: assessHealth({ age: 74, answers, labs: [], ai: null }).domains, answers, now: NOW });
    const by = Object.fromEntries(f.habits.map((h) => [h.id, h]));
    expect(by["smoking"]!.delayYears).toBeGreaterThan(by["alcohol"]!.delayYears);
    expect(f.habits[0]!.id).toBe("smoking"); // biggest effect first
  });
  it("no suggestions when habits are already good", () => {
    const answers: QuizAnswers = { smoking: ["no"], alcohol: ["rarely"], exercise: ["daily"], social: ["often"] };
    const f = forecast(elena74, { domains: assessHealth({ age: 74, answers, labs: [], ai: null }).domains, answers, now: NOW });
    expect(f.habits).toEqual([]);
  });
  it("health risk brings the date earlier than a no-risk check", () => {
    const answers: QuizAnswers = { smoking: ["daily"], walking: ["helped"] };
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