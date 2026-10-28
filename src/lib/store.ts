import { useSyncExternalStore } from "react";
import { demoState, type PlanState } from "./plan";

const KEY = "prototype123-plan-v1";
let state: PlanState = demoState();
const listeners = new Set<() => void>();
const serverSnapshot = demoState();

function emit() {
  listeners.forEach((l) => l());
}

export function loadPlanFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
      const defaults = demoState();
      state = {
        ...defaults,
        ...saved,
        parent: { ...defaults.parent, ...saved.parent },
        user: { ...defaults.user, ...saved.user },
        costs: { ...defaults.costs, ...saved.costs },
      };
      // Migrate older local plans and reject invalid new projection inputs.
      for (const key of [
        "costGrowth",
        "incomeGrowth",
        "savingsSpreadMonths",
        "careDurationMonths",
      ] as const) {
        const value = state[key];
        const maximum = key.endsWith("Months") ? 600 : 100;
        const minimum = key.endsWith("Months") ? 1 : 0;
        state[key] =
          typeof value === "number" && Number.isFinite(value)
            ? key.endsWith("Months")
              ? Math.round(Math.max(minimum, Math.min(maximum, value)))
              : Math.max(minimum, Math.min(maximum, value))
            : defaults[key];
      }
      if (typeof state.careStartDate !== "string") state.careStartDate = "";
      emit();
    }
  } catch {
    /* ignore */
  }
}

export function setPlan(update: Partial<PlanState> | ((s: PlanState) => Partial<PlanState>)) {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  emit();
}

export function loadDemo() {
  setPlan(demoState());
}

export function usePlan() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => serverSnapshot,
  );
}
