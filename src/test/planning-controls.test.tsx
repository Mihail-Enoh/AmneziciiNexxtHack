import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CareDateInput, PlanningAssumptions } from "@/components/app/PlanningAssumptions";
import { computePlan, demoState } from "@/lib/plan";
import { loadDemo, loadPlanFromStorage, setPlan, usePlan } from "@/lib/store";

function Results() {
  const state = usePlan();
  const plan = computePlan(state);
  return (
    <output data-result>
      {JSON.stringify({
        date: state.careStartDate,
        months: plan.monthsUntilScenario,
        reserve: plan.futureCareReserve,
        cost: plan.careMonthlyCost,
        endGap: plan.endRemainingGap,
        status: plan.status,
        savingsEnd: plan.parentSavingsExhaustedMonth,
      })}
    </output>
  );
}

describe("Live planning controls and persistence", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
    localStorage.clear();
    sessionStorage.clear();
    loadDemo();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <>
          <CareDateInput />
          <PlanningAssumptions editable showTiming={false} />
          <Results />
        </>,
      ),
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    sessionStorage.clear();
    loadDemo();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const result = () => JSON.parse(container.querySelector("[data-result]")!.textContent!);
  const button = (text: string) =>
    [...container.querySelectorAll("button")].find((node) => node.textContent === text)!;
  const change = (selector: string, value: string) => {
    const input = container.querySelector<HTMLInputElement>(selector)!;
    expect(input).not.toBeNull();
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  it("offers custom timing beside presets, recalculates immediately and persists the date", () => {
    act(() => button("Dată personalizată").click());
    expect(button("Dată personalizată")).toHaveAttribute("aria-pressed", "true");
    change('input[type="date"]', "2028-04-28");
    expect(result()).toMatchObject({ date: "2028-04-28", months: 18, reserve: 4500 });
    expect(button("Peste 10 ani")).toHaveAttribute("aria-pressed", "false");
    expect(JSON.parse(sessionStorage.getItem("prototype123-plan-v1")!).careStartDate).toBe(
      "2028-04-28",
    );
    act(() => setPlan({ scenario: "residential" }));
    expect(result()).toMatchObject({ date: "2028-04-28", months: 18, cost: 5000 });
    act(() => button("Peste 5 ani").click());
    expect(result()).toMatchObject({ date: "", months: 60, reserve: 15000 });
    expect(container.querySelector('input[type="date"]')).toBeNull();
  });

  it("recalculates the selected cost when applying inflation and custom growth rates", () => {
    expect(result().cost).toBe(3000);
    act(() => button("2.5% / an").click());
    expect(result().cost).toBe(Math.round(3000 * 1.025 ** 10));
    change("#cost-growth", "10");
    expect(result().cost).toBe(Math.round(3000 * 1.1 ** 10));
    const previousGap = result().endGap;
    change("#income-growth", "15");
    expect(result().endGap).toBeLessThan(previousGap);
  });

  it("persists category edits and their total together, and restores the default costs", () => {
    change("#cost-slice-daily-0-amount", "2000");
    change("#cost-slice-daily-1-amount", "500");
    const saved = JSON.parse(sessionStorage.getItem("prototype123-plan-v1") ?? "{}");
    expect(saved.costs.daily).toBe(2800);
    expect(saved.costBreakdown.daily.map((slice: { amount: number }) => slice.amount)).toEqual([2000, 500, 150, 150]);
    expect(result().cost).toBe(2800);
    act(() => button("Revino la valorile demonstrative").click());
    const reset = JSON.parse(sessionStorage.getItem("prototype123-plan-v1") ?? "{}");
    expect(reset.costs.daily).toBe(3000);
    expect(reset.costBreakdown.daily).toBeUndefined();
  });

  it("updates savings depletion, duration and readiness from the controls", () => {
    act(() =>
      setPlan({
        yearsUntil: 0,
        monthlySaving: 0,
        userContribution: 0,
        members: [],
        useSavings: true,
        parent: { ...demoState().parent, savings: 20400 },
      }),
    );
    change("#savings-months", "12");
    change("#care-duration", "12");
    expect(result()).toMatchObject({ savingsEnd: 12, status: "ready" });
    change("#care-duration", "24");
    expect(result()).toMatchObject({ savingsEnd: 12, status: "almost", endGap: 1700 });
    expect(container.textContent).toContain("sfârșitul lunii 12");
  });

  it("reloads custom choices and migrates saved plans created before projection fields existed", () => {
    act(() =>
      setPlan({
        careStartDate: "2029-10-28",
        costGrowth: 5,
        incomeGrowth: 2,
        careDurationMonths: 36,
      }),
    );
    const saved = sessionStorage.getItem("prototype123-plan-v1")!;
    act(() => {
      loadDemo();
      sessionStorage.setItem("prototype123-plan-v1", saved);
      loadPlanFromStorage();
    });
    expect(result()).toMatchObject({
      date: "2029-10-28",
      months: 36,
      cost: Math.round(3000 * 1.05 ** 3),
    });
    act(() => {
      sessionStorage.setItem(
        "prototype123-plan-v1",
        JSON.stringify({ yearsUntil: 5, parent: { pension: 4000 } }),
      );
      loadPlanFromStorage();
    });
    expect(result()).toMatchObject({ date: "", months: 60, cost: 3000 });
    expect(container.querySelector<HTMLInputElement>("#cost-growth")!.value).toBe("0");
  });
});
