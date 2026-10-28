import { useSyncExternalStore } from "react";
import { demoState, fullName, type PlanState } from "./plan";
import { blankState } from "./intake";

/**
 * Several people can be planned for. Each person has a full plan; pages keep using usePlan()/setPlan(),
 * which always work on the ACTIVE person. Everything stays in this browser (localStorage).
 *
 * - PROFILES_KEY holds all people.
 * - KEY mirrors the active person's plan (the format used before profiles existed); if it was written
 *   by an older version it wins for the active person, so nothing saved earlier is lost.
 */
const KEY = "prototype123-plan-v1";
const PROFILES_KEY = "prototype123-profiles-v1";
export const DEMO_ID = "demo";

/** Per-person keys for health answers (tab only) and document consent. */
export const healthSessionKey = (id: string) => `prototype123-health-v1:${id}`;
export const consentKey = (id: string) => `prototype123-health-consent:${id}`;

interface Profiles { activeId: string; order: string[]; plans: Record<string, PlanState> }
export interface PersonSummary { id: string; name: string; firstName: string; age: number; isDemo: boolean }
export interface ProfilesView { activeId: string; people: PersonSummary[] }

const initial = (): Profiles => ({ activeId: DEMO_ID, order: [DEMO_ID], plans: { [DEMO_ID]: demoState() } });
let profiles: Profiles = initial();
let state: PlanState = profiles.plans[DEMO_ID]!;
const listeners = new Set<() => void>();
const serverSnapshot = demoState();

function summarize(p: Profiles): ProfilesView {
  return {
    activeId: p.activeId,
    people: p.order.filter((id) => p.plans[id]).map((id) => {
      const plan = p.plans[id]!;
      return { id, name: plan.parent.name.trim() ? fullName(plan.parent) : "Persoană nouă", firstName: plan.parent.name.trim(), age: plan.parent.age, isDemo: id === DEMO_ID };
    }),
  };
}
let view: ProfilesView = summarize(profiles);
const serverView: ProfilesView = summarize(initial());

function emit() {
  view = summarize(profiles);
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

/** Fill missing fields from the defaults and reject invalid projection inputs (older saved plans). */
export function normalizePlan(saved: unknown): PlanState | null {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return null;
  const s = saved as Partial<PlanState> & Record<string, unknown>;
  const defaults = demoState();
  const plan: PlanState = {
    ...defaults,
    ...s,
    parent: { ...defaults.parent, lastName: "", ...(s.parent ?? {}) },
    user: { ...defaults.user, ...(s.user ?? {}) },
    costs: { ...defaults.costs, ...(s.costs ?? {}) },
  } as PlanState;
  for (const key of ["costGrowth", "incomeGrowth", "savingsSpreadMonths", "careDurationMonths"] as const) {
    const value = plan[key];
    const maximum = key.endsWith("Months") ? 600 : 100;
    const minimum = key.endsWith("Months") ? 1 : 0;
    plan[key] =
      typeof value === "number" && Number.isFinite(value)
        ? key.endsWith("Months")
          ? Math.round(Math.max(minimum, Math.min(maximum, value)))
          : Math.max(minimum, Math.min(maximum, value))
        : defaults[key];
  }
  if (typeof plan.careStartDate !== "string") plan.careStartDate = "";
  return plan;
}

export function loadPlanFromStorage() {
  try {
    const rawProfiles = localStorage.getItem(PROFILES_KEY);
    if (rawProfiles) {
      const parsed = JSON.parse(rawProfiles) as Partial<Profiles> | null;
      const plans: Record<string, PlanState> = {};
      for (const id of Array.isArray(parsed?.order) ? parsed!.order : []) {
        const plan = typeof id === "string" ? normalizePlan(parsed?.plans?.[id]) : null;
        if (plan) plans[id] = plan;
      }
      const order = Object.keys(plans);
      if (order.length) {
        const activeId = typeof parsed?.activeId === "string" && plans[parsed.activeId] ? parsed.activeId : order[0]!;
        profiles = { activeId, order, plans };
      }
    }
    const rawActive = localStorage.getItem(KEY);
    if (rawActive) {
      const plan = normalizePlan(JSON.parse(rawActive));
      if (plan) {
        if (rawProfiles) profiles.plans[profiles.activeId] = plan;
        else {
          profiles = { activeId: "p1", order: ["p1"], plans: { p1: plan } }; // first visit after the update
          state = plan;
          persist();
        }
      }
    }
    state = profiles.plans[profiles.activeId]!;
    emit();
  } catch {
    /* ignore */
  }
}

export function setPlan(update: Partial<PlanState> | ((s: PlanState) => Partial<PlanState>)) {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  profiles = { ...profiles, plans: { ...profiles.plans, [profiles.activeId]: state } };
  persist();
  emit();
}

export function getActiveProfileId() {
  return profiles.activeId;
}

/** Make another saved person the active one. */
export function switchProfile(id: string) {
  if (!profiles.plans[id] || id === profiles.activeId) return;
  profiles = { ...profiles, activeId: id };
  state = profiles.plans[id]!;
  persist();
  emit();
}

/** Add a person (blank plan unless one is given) and make them active. Returns the new id. */
export function addProfile(plan: PlanState = blankState()): string {
  const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  profiles = { activeId: id, order: [...profiles.order, id], plans: { ...profiles.plans, [id]: plan } };
  state = plan;
  persist();
  emit();
  return id;
}

/** Remove a person and their health answers and consent. The last person cannot be removed. */
export function removeProfile(id: string): boolean {
  if (!profiles.plans[id] || profiles.order.length <= 1) return false;
  const order = profiles.order.filter((x) => x !== id);
  const plans = { ...profiles.plans };
  delete plans[id];
  const activeId = profiles.activeId === id ? order[0]! : profiles.activeId;
  profiles = { activeId, order, plans };
  state = plans[activeId]!;
  try { sessionStorage.removeItem(healthSessionKey(id)); } catch { /* unavailable */ }
  try { localStorage.removeItem(consentKey(id)); } catch { /* unavailable */ }
  persist();
  emit();
  return true;
}

/** "Încearcă exemplul Elenei": the example is its own person, so it never overwrites someone you added. */
export function loadDemo() {
  const exists = !!profiles.plans[DEMO_ID];
  profiles = {
    activeId: DEMO_ID,
    order: exists ? profiles.order : [...profiles.order, DEMO_ID],
    plans: { ...profiles.plans, [DEMO_ID]: demoState() },
  };
  state = profiles.plans[DEMO_ID]!;
  persist();
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePlan() {
  return useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
}

/** The saved people and who is active (for the person switcher). */
export function useProfiles() {
  return useSyncExternalStore(subscribe, () => view, () => serverView);
}
