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
      state = { ...demoState(), ...JSON.parse(raw) };
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
