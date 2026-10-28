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
  it("waiting 5 years doubles the monthly saving", () => expect(requiredMonthlySaving(30000, 120, 60)).toBe(500));
  it("occasional care gap is 400", () => expect(computePlan(s, "occasional").familyFundingGap).toBe(400));
  it("residential gap is 1900", () => expect(computePlan(s, "residential").familyFundingGap).toBe(1900));
  it("formats Romanian thousands", () => expect(ron(1700)).toBe("1.700 RON"));
  it("never negative", () => expect(computePlan({ ...s, costs: { ...s.costs, daily: 100 } }).familyFundingGap).toBe(0));
});
