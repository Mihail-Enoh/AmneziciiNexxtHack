import { describe, expect, it } from "vitest";
import { computePlan, demoState, parentMonthlyIncomeOf, parentSavingsOf, type PlanState } from "./plan";

const NOW = new Date("2026-10-28T12:00:00Z");
const withAssets = (assets: string[], amounts: Record<string, number>, extra: Partial<PlanState> = {}): PlanState => {
  const d = demoState();
  return { ...d, ...extra, parent: { ...d.parent, assets, assetAmounts: amounts } };
};

describe("checked resources count in the plan", () => {
  it("private pension and rent add to monthly income; other savings add to savings", () => {
    const p = withAssets(["Pensie privată (Pilon III)", "Altă proprietate", "Alte economii"], { "Pensie privată (Pilon III)": 300, "Altă proprietate": 500, "Alte economii": 10000 }).parent;
    expect(parentMonthlyIncomeOf(p)).toBe(3100 + 300 + 500);
    expect(parentSavingsOf(p)).toBe(25000 + 10000);
  });
  it("an unchecked resource does not count, even if an amount was typed before", () => {
    const p = withAssets(["Locuință proprie"], { "Pensie privată (Pilon III)": 300 }).parent;
    expect(parentMonthlyIncomeOf(p)).toBe(3100);
  });
  it("the family gap drops by the private pension", () => {
    const base = computePlan(demoState(), "daily", NOW).familyFundingGap;
    const more = computePlan(withAssets(["Pensie privată (Pilon III)"], { "Pensie privată (Pilon III)": 300 }), "daily", NOW).familyFundingGap;
    expect(base - more).toBe(300);
  });
  it("other savings are used when the plan uses the parent's savings", () => {
    const off = computePlan(withAssets(["Alte economii"], { "Alte economii": 12000 }), "daily", NOW);
    const on = computePlan(withAssets(["Alte economii"], { "Alte economii": 12000 }, { useSavings: true }), "daily", NOW);
    expect(on.totalRemaining).toBeLessThan(off.totalRemaining);
  });
  it("the demo plan is unchanged (own home has no amount)", () => {
    expect(computePlan(demoState(), "daily", NOW).familyFundingGap).toBe(1700);
  });
});
