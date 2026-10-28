import { describe, expect, it } from "vitest";
import { computePlan, demoState, requiredMonthlySaving, ron } from "./plan";

describe("Elena demo plan", () => {
  const s = demoState();
  const c = computePlan(s);
  it("daily care gap is 3000 - 1300 = 1700", () => {
    expect(c.careMonthlyCost).toBe(3000);
    expect(c.parentCovered).toBe(1300);
    expect(c.familyFundingGap).toBe(1700);
  });
  it("remaining after Maria 400 + Andrei 400 is 900", () => expect(c.remainingGap).toBe(900));
  it("250 RON for 10 years = 30000 reserve, ~17 months of gap", () => {
    expect(c.futureCareReserve).toBe(30000);
    expect(c.monthsOfGapCovered).toBe(17);
  });
  it("waiting 5 years doubles the monthly saving", () =>
    expect(requiredMonthlySaving(30000, 120, 60)).toBe(500));
  it("occasional care gap is 400", () =>
    expect(computePlan(s, "occasional").familyFundingGap).toBe(400));
  it("residential gap is 1900", () =>
    expect(computePlan(s, "residential").familyFundingGap).toBe(1900));
  it("formats Romanian thousands", () => expect(ron(1700)).toBe("1.700 RON"));
  it("never negative", () =>
    expect(computePlan({ ...s, costs: { ...s.costs, daily: 100 } }).familyFundingGap).toBe(0));
});

describe("Custom care projections", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  it("uses the chosen residential date rather than a fixed age", () => {
    const c = computePlan(
      { ...demoState(), scenario: "residential", careStartDate: "2028-04-28" },
      "residential",
      now,
    );
    expect(c.monthsUntilScenario).toBe(18);
    expect(c.futureCareReserve).toBe(4500);
    expect(c.reserveGrowth.at(-1)?.reserve).toBe(4500);
    expect(c.scenarioAge).toBe(68.5);
  });
  it("treats past dates as immediate care and rounds partial months up", () => {
    const immediate = computePlan({ ...demoState(), careStartDate: "2020-01-01" }, "daily", now);
    expect(immediate.monthsUntilScenario).toBe(0);
    expect(immediate.savingNeededToday).toBeNull();
    expect(
      computePlan({ ...demoState(), careStartDate: "2026-10-29" }, "daily", now)
        .monthsUntilScenario,
    ).toBe(1);
  });
  it("compounds costs, essential expenses and income with separate rates", () => {
    const c = computePlan(
      { ...demoState(), yearsUntil: 1, costGrowth: 10, incomeGrowth: 5 },
      "daily",
      now,
    );
    expect(c.careMonthlyCost).toBe(3300);
    expect(c.parentMonthlyIncome).toBe(3255);
    expect(c.parentCovered).toBe(1275); // 3255 - (2600 - 800) * 1.1
    expect(c.projection[12]!.cost).toBeCloseTo(3630);
  });
  it("stops savings contributions after depletion and downgrades readiness", () => {
    const s = {
      ...demoState(),
      yearsUntil: 0,
      useSavings: true,
      savingsSpreadMonths: 12,
      careDurationMonths: 24,
      monthlySaving: 0,
      userContribution: 0,
      members: [],
      parent: { ...demoState().parent, savings: 20400 },
    };
    const c = computePlan(s, "daily", now);
    expect(c.parentSavingsExhaustedMonth).toBe(12);
    expect(c.projection[11]!.remaining).toBe(0);
    expect(c.projection[12]!.remaining).toBe(1700);
    expect(c.monthsOfRemainingCovered).toBe(12);
    expect(c.status).not.toBe("ready");
    expect(c.projection.reduce((sum, r) => sum + r.savingsUsed, 0)).toBeCloseTo(20400);
  });
  it("only spends parent savings on an actual care gap", () => {
    const c = computePlan(
      { ...demoState(), useSavings: true, costs: { ...demoState().costs, daily: 100 } },
      "daily",
      now,
    );
    expect(c.projection[0]!.savingsUsed).toBe(0);
    expect(c.parentSavingsExhaustedMonth).toBeNull();
  });
  it("does not mark an initially balanced plan ready when later cost growth opens a gap", () => {
    const c = computePlan(
      {
        ...demoState(),
        yearsUntil: 0,
        userContribution: 1700,
        members: [],
        monthlySaving: 0,
        costGrowth: 10,
      },
      "daily",
      now,
    );
    expect(c.remainingGap).toBe(0);
    expect(c.endRemainingGap).toBeGreaterThan(0);
    expect(c.status).not.toBe("ready");
  });
  it("projects a manually entered future income from the care start date", () => {
    const c = computePlan({ ...demoState(), futureIncome: 4000, incomeGrowth: 10 }, "daily", now);
    expect(c.parentMonthlyIncome).toBe(4000);
    expect(c.projection[12]!.income).toBeCloseTo(4400);
  });
});

describe("Funding correctness across user choices", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const calculate = (patch: Partial<ReturnType<typeof demoState>> = {}) =>
    computePlan({ ...demoState(), ...patch }, patch.scenario ?? "daily", now);

  it("uses Bucharest's calendar date, including near UTC midnight", () => {
    const c = computePlan(
      { ...demoState(), careStartDate: "2026-10-28" },
      "daily",
      new Date("2026-10-27T23:30:00Z"),
    );
    expect(c.monthsUntilScenario).toBe(0);
    expect(c.fundingStartLabel).toBe("Acum");
  });

  it("accepts leap days and falls back consistently for invalid or cleared dates", () => {
    expect(calculate({ careStartDate: "2028-02-29" }).monthsUntilScenario).toBe(17);
    for (const careStartDate of ["2027-02-29", "not-a-date", ""]) {
      const c = calculate({ careStartDate, yearsUntil: 3 });
      expect(c.monthsUntilScenario).toBe(36);
      expect(c.fundingStartLabel).toBe("Peste 36 luni");
    }
  });

  it("keeps a custom date and reserve when switching all four care scenarios", () => {
    const costs = { occasional: 1200, frequent: 2400, daily: 3600, residential: 6000 };
    for (const scenario of ["occasional", "frequent", "daily", "residential"] as const) {
      const c = calculate({ scenario, costs, careStartDate: "2028-04-28" });
      expect(c.monthsUntilScenario).toBe(18);
      expect(c.futureCareReserve).toBe(4500);
      expect(c.careMonthlyCost).toBe(costs[scenario]);
    }
  });

  it("includes the parent's uncovered essential expenses instead of silently dropping them", () => {
    const c = calculate({
      scenario: "occasional",
      parent: { ...demoState().parent, pension: 1000, otherIncome: 0, expenses: 2600 },
    });
    expect(c.currentFamilyNeed).toBe(1600);
    expect(c.careMonthlyCost).toBe(900);
    expect(c.essentialShortfall).toBe(1600);
    expect(c.totalMonthlyNeed).toBe(2500);
    expect(c.familyFundingGap).toBe(2500);
    expect(c.remainingGap).toBe(1700);
  });

  it("recalculates income, essential expenses, family contributions and exclusions", () => {
    const base = demoState();
    expect(calculate({ parent: { ...base.parent, otherIncome: 500 } }).familyFundingGap).toBe(1200);
    expect(calculate({ parent: { ...base.parent, expenses: 3100 } }).familyFundingGap).toBe(2200);
    expect(calculate({ userContribution: 1000 }).remainingGap).toBe(300);
    expect(
      calculate({
        members: [{ ...base.members[0]!, contribution: 1000, financial: "alte-moduri" }],
      }).remainingGap,
    ).toBe(1300);
    expect(calculate({ members: [] }).remainingGap).toBe(1300);
  });

  it("caps and allocates overfunding so the summary chart exactly equals the need", () => {
    const c = calculate({
      userContribution: 2000,
      members: [{ ...demoState().members[0]!, contribution: 2000 }],
    });
    expect(c.familyCovered).toBe(1700);
    expect(c.familyAllocations.map((person) => person.covered)).toEqual([850, 850]);
    expect(
      c.parentCovered +
        c.familyAllocations.reduce((sum, person) => sum + person.covered, 0) +
        c.remainingGap,
    ).toBe(c.totalMonthlyNeed);
    expect(c.projection.every((row) => row.family <= row.gap)).toBe(true);
  });

  it("reconciles fractional reference costs and several contributors after display rounding", () => {
    const c = calculate({
      scenario: "residential",
      costs: { ...demoState().costs, residential: 84488 / 12 },
      userContribution: 4000,
      members: [
        { ...demoState().members[0]!, contribution: 5000 },
        { ...demoState().members[0]!, id: "another", contribution: 3000 },
      ],
    });
    expect(
      c.parentCovered +
        c.familyAllocations.reduce((sum, person) => sum + person.covered, 0) +
        c.remainingGap,
    ).toBe(c.totalMonthlyNeed);
    expect(c.familyAllocations.every((person) => person.covered <= person.contribution)).toBe(true);
  });

  it("spends the family reserve once and reports the uncovered remainder", () => {
    const c = calculate();
    expect(c.futureCareReserve).toBe(30000);
    expect(c.monthsOfRemainingCovered).toBe(33);
    expect(c.projection[32]!.reserveLeft).toBe(300);
    expect(c.projection[33]!.reserveUsed).toBe(300);
    expect(c.projection[33]!.unfunded).toBe(600);
    expect(c.totalUnfunded).toBe(24000);
    expect(c.projection.reduce((sum, row) => sum + row.reserveUsed, 0)).toBeCloseTo(30000);
  });

  it("recalculates the savings target using changing gaps and the selected care duration", () => {
    const short = calculate({ careDurationMonths: 6 });
    expect(short.targetMonths).toBe(6);
    expect(short.targetReserve).toBe(5400);
    expect(short.savingNeededToday).toBe(45);
    const growing = calculate({ costGrowth: 5 });
    const expected = growing.projection.slice(0, 24).reduce((sum, row) => sum + row.remaining, 0);
    expect(growing.targetReserve).toBe(Math.ceil(expected));
    expect(growing.targetReserve).toBeGreaterThan(24 * growing.remainingGap);
    expect(calculate({ monthlySaving: 1000 }).totalUnfunded).toBe(0);
    expect(calculate({ careDurationMonths: 12 }).status).toBe("ready");
    expect(calculate({ careDurationMonths: 60 }).status).not.toBe("ready");
  });

  it("does not claim waiting is impossible when the target reserve is zero", () => {
    const c = calculate({ monthlySaving: 0 });
    expect(c.comparisonSavingLater).toBe(0);
    expect(c.reserveGrowth.at(-1)!.delayedReserve).toBe(0);
    expect(calculate({ yearsUntil: 5 }).comparisonSavingLater).toBeNull();
  });

  it("conserves all money across scenarios, inflation, dates, savings and contributions", () => {
    for (const scenario of ["occasional", "frequent", "daily", "residential"] as const) {
      for (const costGrowth of [0, 2.5, 10]) {
        for (const useSavings of [false, true]) {
          const c = calculate({
            scenario,
            costGrowth,
            incomeGrowth: 1.5,
            useSavings,
            careStartDate: "2029-03-12",
            savingsSpreadMonths: 12,
            careDurationMonths: 84,
          });
          for (const row of c.projection) {
            expect(row.parent + row.family + row.reserveUsed + row.unfunded).toBeCloseTo(
              row.need,
              6,
            );
            expect(row.savingsLeft).toBeGreaterThanOrEqual(0);
            expect(row.reserveLeft).toBeGreaterThanOrEqual(0);
          }
          expect(c.projection.reduce((sum, row) => sum + row.savingsUsed, 0)).toBeLessThanOrEqual(
            25000.001,
          );
          expect(c.projection.reduce((sum, row) => sum + row.reserveUsed, 0)).toBeLessThanOrEqual(
            c.futureCareReserve + 0.001,
          );
          expect(c.readiness).toBeGreaterThanOrEqual(0);
          expect(c.readiness).toBeLessThanOrEqual(100);
          if (c.status === "ready") expect(c.totalUnfunded).toBe(0);
        }
      }
    }
  });
});
