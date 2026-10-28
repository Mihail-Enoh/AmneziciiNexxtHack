// Prototype123 — calculation engine & demo assumptions.
// All numbers here are HACKATHON DEMO ASSUMPTIONS. They are centralised so they
// can later be replaced by verified Romanian datasets or an API.

export type Intensity = "occasional" | "frequent" | "daily" | "residential";
export type Independence = "independent" | "occasional" | "regular";

export interface ParentProfile {
  name: string;
  age: number;
  city: string;
  living: string;
  housing: string;
  independence: Independence;
  pension: number;
  otherIncome: number;
  savings: number;
  expenses: number;
  assets: string[];
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  contribution: number;
  status: "estimat" | "invitat" | "a răspuns";
  financial: "da" | "nu-spun" | "alte-moduri";
  helps: string[];
}

export interface PlanState {
  onboarded: boolean;
  parent: ParentProfile;
  user: { name: string; age: number; income: number; savings: number };
  userContribution: number;
  members: FamilyMember[];
  horizon: 5 | 10 | 15;
  scenario: Intensity;
  yearsUntil: number;
  costs: Record<Intensity, number>;
  futureIncome: number | null;
  useSavings: boolean;
  monthlySaving: number;
  checklist: Record<string, boolean>;
}

export interface CareScenarioDef {
  id: Intensity;
  label: string;
  short: string;
  yearsFromNow: number;
  /** Part of the parent's current essential expenses that the care setup replaces (e.g. food, utilities in residential care). */
  expensesReplaced: number;
  supports: string[];
}

export const PLAN_ASSUMPTIONS = {
  costs: { occasional: 900, frequent: 1800, daily: 3000, residential: 5000 } as Record<Intensity, number>,
  savingsSpreadMonths: 60,
  comfortableCoverageMonths: 36,
  partialCoverageMonths: 12,
  invitationTargetMonths: 24,
};

export const SCENARIOS: CareScenarioDef[] = [
  { id: "occasional", label: "Ajutor ocazional", short: "Ocazional", yearsFromNow: 5, expensesReplaced: 0, supports: ["Transport", "Cumpărături", "Curățenie", "Sprijin administrativ"] },
  { id: "frequent", label: "Ajutor de câteva ori pe săptămână", short: "Câteva ori/săpt.", yearsFromNow: 7, expensesReplaced: 300, supports: ["Vizite regulate", "Pregătirea mesei", "Transport", "Treburi casnice"] },
  { id: "daily", label: "Ajutor zilnic", short: "Zilnic", yearsFromNow: 10, expensesReplaced: 800, supports: ["Asistență zilnică la domiciliu", "Transport", "Ajutor la masă", "Sprijin în gospodărie"] },
  { id: "residential", label: "Îngrijire rezidențială", short: "Rezidențial", yearsFromNow: 15, expensesReplaced: 2600, supports: ["Cazare și masă", "Îngrijire permanentă", "Supraveghere", "Activități sociale"] },
];

export const scenarioById = (id: Intensity) => SCENARIOS.find((s) => s.id === id)!;

export function demoState(): PlanState {
  return {
    onboarded: true,
    parent: { name: "Elena", age: 67, city: "București", living: "Locuiește singur(ă)", housing: "Proprietar", independence: "independent", pension: 3100, otherIncome: 0, savings: 25000, expenses: 2600, assets: ["Locuință proprie"] },
    user: { name: "Maria", age: 36, income: 8500, savings: 1000 },
    userContribution: 400,
    members: [{ id: "andrei", name: "Andrei", role: "Frate", contribution: 400, status: "estimat", financial: "da", helps: ["Transport", "Programări"] }],
    horizon: 10,
    scenario: "daily",
    yearsUntil: 10,
    costs: { ...PLAN_ASSUMPTIONS.costs },
    futureIncome: null,
    useSavings: false,
    monthlySaving: 250,
    checklist: {},
  };
}

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function parentCareContribution(s: PlanState, intensity: Intensity) {
  const p = s.parent;
  const income = s.futureIncome ?? p.pension + p.otherIncome;
  const def = scenarioById(intensity);
  const replaced = Math.min(def.expensesReplaced, p.expenses);
  const fromIncome = Math.max(0, income - p.expenses + replaced);
  const fromSavings = s.useSavings ? safeDiv(p.savings, PLAN_ASSUMPTIONS.savingsSpreadMonths) : 0;
  return Math.round(fromIncome + fromSavings);
}

export function computePlan(s: PlanState, intensity: Intensity = s.scenario) {
  const p = s.parent;
  const parentMonthlyIncome = s.futureIncome ?? p.pension + p.otherIncome;
  const parentAvailableIncome = Math.max(0, p.pension + p.otherIncome - p.expenses);
  const careMonthlyCost = s.costs[intensity];
  const parentContributionRaw = parentCareContribution(s, intensity);
  const parentCovered = Math.min(parentContributionRaw, careMonthlyCost);
  const familyFundingGap = Math.max(0, careMonthlyCost - parentContributionRaw);
  const siblingTotal = s.members.filter((m) => m.financial === "da").reduce((a, m) => a + m.contribution, 0);
  const familyContributions = s.userContribution + siblingTotal;
  const remainingGap = Math.max(0, familyFundingGap - familyContributions);
  const monthsUntilScenario = Math.max(0, Math.round(s.yearsUntil * 12));
  const futureCareReserve = s.monthlySaving * monthsUntilScenario;
  const monthsOfGapCovered = Math.floor(safeDiv(futureCareReserve, familyFundingGap));
  const monthsOfRemainingCovered = Math.floor(safeDiv(futureCareReserve, remainingGap));
  const payers = 1 + s.members.filter((m) => m.financial === "da").length;
  const perPersonShare = Math.ceil(safeDiv(familyFundingGap, payers));
  const targetReserve = remainingGap * PLAN_ASSUMPTIONS.invitationTargetMonths;
  const savingNeededToday = Math.ceil(safeDiv(targetReserve, monthsUntilScenario));
  const readiness = careMonthlyCost > 0 ? Math.min(100, Math.round(((parentCovered + Math.min(familyContributions, familyFundingGap)) / careMonthlyCost) * 100)) : 100;

  let status: "ready" | "almost" | "attention";
  if (remainingGap === 0 || monthsOfRemainingCovered >= PLAN_ASSUMPTIONS.comfortableCoverageMonths) status = "ready";
  else if (monthsOfRemainingCovered >= PLAN_ASSUMPTIONS.partialCoverageMonths) status = "almost";
  else status = "attention";

  return {
    parentMonthlyIncome, parentAvailableIncome, careMonthlyCost, parentContributionRaw, parentCovered,
    familyFundingGap, siblingTotal, familyContributions, remainingGap, monthsUntilScenario, futureCareReserve,
    monthsOfGapCovered, monthsOfRemainingCovered, perPersonShare, targetReserve, savingNeededToday, readiness, status,
    scenarioAge: p.age + s.yearsUntil,
  };
}

/** Monthly saving needed to reach `target` if you start `delayYears` later than today. */
export function requiredMonthlySaving(target: number, monthsUntil: number, delayMonths = 0) {
  const months = monthsUntil - delayMonths;
  return months > 0 ? Math.ceil(target / months) : null;
}

const nf = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);
export const formatNumber = (n: number) => nf.format(Math.round(n));
export const ron = (n: number) => `${formatNumber(Math.max(0, n))} RON`;

export const STATUS_META = {
  ready: { label: "Pregătit", tone: "success" },
  almost: { label: "Aproape acoperit", tone: "warning" },
  attention: { label: "Necesită atenție", tone: "danger" },
} as const;
