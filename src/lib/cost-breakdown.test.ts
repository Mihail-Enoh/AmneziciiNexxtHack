import { describe, expect, it } from "vitest";
import { breakdownOf, computePlan, DEFAULT_BREAKDOWN, demoState, PLAN_ASSUMPTIONS, replacedExpensesOf, SCENARIOS } from "./plan";

describe("Care cost categories", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.id}: default categories preserve the existing cost and replaced expenses`, () => {
      const slices = DEFAULT_BREAKDOWN[scenario.id];
      expect(slices.reduce((sum, slice) => sum + slice.amount, 0)).toBe(PLAN_ASSUMPTIONS.costs[scenario.id]);
      expect(slices.reduce((sum, slice) => sum + (slice.replacesOwnExpense ? slice.amount : 0), 0)).toBe(scenario.expensesReplaced);
    });
  }

  it("keeps the demo's original coverage and gaps without a custom breakdown", () => {
    const s = demoState();
    expect(computePlan(s)).toMatchObject({ careMonthlyCost: 3000, parentCovered: 1300, familyFundingGap: 1700, remainingGap: 900, futureCareReserve: 30000, monthsOfGapCovered: 17 });
    const original = { occasional: [500, 400], frequent: [800, 1000], daily: [1300, 1700], residential: [3100, 1900] };
    for (const scenario of SCENARIOS) {
      const c = computePlan(s, scenario.id);
      expect([c.parentCovered, c.familyFundingGap]).toEqual(original[scenario.id]);
    }
  });

  it("uses 500 lei of already-paid meals in the custom daily family gap", () => {
    const base = demoState();
    const s = { ...base, parent: { ...base.parent, pension: 1800, expenses: 1500 }, costs: { ...base.costs, daily: 2500 }, costBreakdown: { daily: [
      { id: "meals", label: "Masă", amount: 500, replacesOwnExpense: true },
      { id: "carer", label: "Îngrijitoare", amount: 2000, replacesOwnExpense: false },
    ] } };
    expect(s.costs.daily).toBe(2500);
    expect(replacedExpensesOf(s, "daily")).toBe(500);
    expect(computePlan(s).familyFundingGap).toBe(1700);
  });

  it("scales the default daily categories to exactly 6000 lei", () => {
    const base = demoState();
    const slices = breakdownOf({ ...base, costs: { ...base.costs, daily: 6000 } }, "daily");
    expect(slices.map((slice) => slice.amount)).toEqual([3800, 1600, 300, 300]);
    expect(slices.reduce((sum, slice) => sum + slice.amount, 0)).toBe(6000);
  });

  it("makes negative amounts zero", () => {
    const s = demoState();
    s.costBreakdown = { daily: [{ id: "a", label: "Masă", amount: -10, replacesOwnExpense: true }] };
    expect(breakdownOf(s, "daily")[0]?.amount).toBe(0);
  });

  it("trims 60-character labels to 40 characters", () => {
    const s = demoState();
    s.costBreakdown = { daily: [{ id: "a", label: `  ${"a".repeat(60)}  `, amount: 10, replacesOwnExpense: false }] };
    expect(breakdownOf(s, "daily")[0]?.label).toBe("a".repeat(40));
  });

  it("limits ten categories to eight", () => {
    const s = demoState();
    s.costBreakdown = { daily: Array.from({ length: 10 }, (_, index) => ({ id: String(index), label: "Masă", amount: 100, replacesOwnExpense: false })) };
    expect(breakdownOf(s, "daily")).toHaveLength(8);
  });

  it("sanitizes non-finite amounts, maximums, rounding, blank labels and flags", () => {
    const s = demoState();
    s.costBreakdown = { daily: [NaN, Infinity, 100001, 12.6].map((amount, index) => ({ id: String(index), label: "   ", amount, replacesOwnExpense: false })) };
    expect(breakdownOf(s, "daily").map((slice) => slice.amount)).toEqual([0, 0, 100000, 13]);
    expect(breakdownOf(s, "daily")[0]?.label).toBe("Altele");
  });
});