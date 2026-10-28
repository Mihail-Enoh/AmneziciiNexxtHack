// Prototype123 — calculation engine & demo assumptions.
// Demo costs, sourced reference presets and all projection formulas live here.

export type Intensity = "occasional" | "frequent" | "daily" | "residential";
export type Independence = "independent" | "occasional" | "regular";

export interface ParentProfile {
  /** First name (required in the forms). */
  name: string;
  /** Family name (optional). */
  lastName: string;
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
  careStartDate: string;
  costGrowth: number;
  incomeGrowth: number;
  savingsSpreadMonths: number;
  careDurationMonths: number;
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
  /** Part of the parent's current essential expenses that the care setup replaces (e.g. food, utilities in residential care). */
  expensesReplaced: number;
  supports: string[];
  /** Optional typical start offset in years; read by the AI intake (not used in plan math). */
  yearsFromNow: number;
}

export const PLAN_ASSUMPTIONS = {
  costs: { occasional: 900, frequent: 1800, daily: 3000, residential: 5000 } as Record<
    Intensity,
    number
  >,
  savingsSpreadMonths: 60,
  partialCoverageMonths: 12,
  invitationTargetMonths: 24,
};

export const SCENARIOS: CareScenarioDef[] = [
  {
    id: "occasional",
    yearsFromNow: 5,
    label: "Ajutor ocazional",
    short: "Ocazional",
    expensesReplaced: 0,
    supports: ["Transport", "Cumpărături", "Curățenie", "Sprijin administrativ"],
  },
  {
    id: "frequent",
    yearsFromNow: 7,
    label: "Ajutor de câteva ori pe săptămână",
    short: "Câteva ori/săpt.",
    expensesReplaced: 300,
    supports: ["Vizite regulate", "Pregătirea mesei", "Transport", "Treburi casnice"],
  },
  {
    id: "daily",
    yearsFromNow: 10,
    label: "Ajutor zilnic",
    short: "Zilnic",
    expensesReplaced: 800,
    supports: [
      "Asistență zilnică la domiciliu",
      "Transport",
      "Ajutor la masă",
      "Sprijin în gospodărie",
    ],
  },
  {
    id: "residential",
    yearsFromNow: 15,
    label: "Îngrijire rezidențială",
    short: "Rezidențial",
    expensesReplaced: 2600,
    supports: ["Cazare și masă", "Îngrijire permanentă", "Supraveghere", "Activități sociale"],
  },
];

export const scenarioById = (id: Intensity) => SCENARIOS.find((s) => s.id === id)!;

export function demoState(): PlanState {
  return {
    onboarded: true,
    parent: {
      name: "Elena",
      lastName: "Popescu",
      age: 67,
      city: "București",
      living: "Locuiește singur(ă)",
      housing: "Proprietar",
      independence: "independent",
      pension: 3100,
      otherIncome: 0,
      savings: 25000,
      expenses: 2600,
      assets: ["Locuință proprie"],
    },
    user: { name: "Maria", age: 36, income: 8500, savings: 1000 },
    userContribution: 400,
    members: [
      {
        id: "andrei",
        name: "Andrei",
        role: "Frate",
        contribution: 400,
        status: "estimat",
        financial: "da",
        helps: ["Transport", "Programări"],
      },
    ],
    horizon: 10,
    scenario: "daily",
    yearsUntil: 10,
    careStartDate: "",
    costGrowth: 0,
    incomeGrowth: 0,
    savingsSpreadMonths: 60,
    careDurationMonths: 60,
    costs: { ...PLAN_ASSUMPTIONS.costs },
    futureIncome: null,
    useSavings: false,
    monthlySaving: 250,
    checklist: {},
  };
}

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function parseCareDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

/** Calendar-month precision in the user's timezone, rounded up as stated in the UI. */
export function monthsUntilCare(s: PlanState, now = new Date()) {
  const date = parseCareDate(s.careStartDate);
  if (!date) return Math.max(0, Math.round(nonnegative(s.yearsUntil) * 12));
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const current = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)!.value);
  return Math.max(
    0,
    (date.year - current("year")) * 12 +
      date.month -
      current("month") +
      (date.day > current("day") ? 1 : 0),
  );
}

export const INFLATION_REFERENCE = {
  rate: 2.5,
  low: 1.5,
  high: 3.5,
  url: "https://www.oecd.org/en/publications/oecd-economic-surveys-romania-2024_106b32c4-en/full-report/component-5.html",
  label: "OECD Economic Surveys: Romania 2024 · ținta BNR 2,5% ± 1 punct procentual",
};

// Historical proposed public-centre cost standards, not private tariffs or benefits.
export const RESIDENTIAL_REFERENCES = [
  { label: "Independent · standard anual propus 2025", annual: 43594 },
  { label: "Semidependent · standard anual propus 2025", annual: 57850 },
  { label: "Dependent · standard anual propus 2025", annual: 84488 },
].map((reference) => ({ ...reference, monthly: reference.annual / 12 }));
export const RESIDENTIAL_SOURCE =
  "https://www.pmtgv.ro/MonitorPMT/MOL6.i/2024/Proiect%20de%20hotarare%20nr.%20449.pdf";

const nonnegative = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);
const grow = (amount: number, rate: number, months: number) =>
  nonnegative(amount) * Math.pow(1 + Math.min(100, nonnegative(rate)) / 100, months / 12);

export function costReferenceProjections(baseCost: number) {
  return [5, 10, 15].map((years) => ({
    years,
    low: grow(baseCost, INFLATION_REFERENCE.low, years * 12),
    target: grow(baseCost, INFLATION_REFERENCE.rate, years * 12),
    high: grow(baseCost, INFLATION_REFERENCE.high, years * 12),
  }));
}

export function computePlan(s: PlanState, intensity: Intensity = s.scenario, now = new Date()) {
  const p = s.parent;
  const monthsUntilScenario = monthsUntilCare(s, now);
  const duration = Math.max(
    1,
    Math.min(600, Math.round(Number.isFinite(s.careDurationMonths) ? s.careDurationMonths : 60)),
  );
  const spread = Math.max(
    1,
    Math.min(600, Math.round(Number.isFinite(s.savingsSpreadMonths) ? s.savingsSpreadMonths : 60)),
  );
  const currentMonthlyIncome = nonnegative(p.pension) + nonnegative(p.otherIncome);
  const parentAvailableIncome = Math.max(0, currentMonthlyIncome - nonnegative(p.expenses));
  const currentFamilyNeed = Math.max(0, nonnegative(p.expenses) - currentMonthlyIncome);
  const siblingTotal = s.members
    .filter((m) => m.financial === "da")
    .reduce((a, m) => a + nonnegative(m.contribution), 0);
  const familyContributions = nonnegative(s.userContribution) + siblingTotal;
  let savings = s.useSavings ? nonnegative(p.savings) : 0;
  let parentSavingsExhaustedMonth: number | null = null;
  const savingsBudget = savings / spread;
  let familyReserve = nonnegative(s.monthlySaving) * monthsUntilScenario;
  const projection = Array.from({ length: duration }, (_, month) => {
    const elapsed = monthsUntilScenario + month;
    const cost = grow(s.costs[intensity], s.costGrowth, elapsed);
    // A custom future income is an amount at the care start date.
    const income =
      s.futureIncome === null
        ? grow(currentMonthlyIncome, s.incomeGrowth, elapsed)
        : grow(s.futureIncome, s.incomeGrowth, month);
    const expenses = grow(
      Math.max(0, p.expenses - Math.min(scenarioById(intensity).expensesReplaced, p.expenses)),
      s.costGrowth,
      elapsed,
    );
    const incomeContribution = Math.max(0, income - expenses);
    // An income deficit still needs funding, even when no income is available for care.
    const essentialShortfall = Math.max(0, expenses - income);
    const need = cost + essentialShortfall;
    const savingsUsed = Math.min(savings, savingsBudget, Math.max(0, need - incomeContribution));
    savings = Math.max(0, savings - savingsUsed);
    if (s.useSavings && p.savings > 0 && savings < 0.01 && parentSavingsExhaustedMonth === null)
      parentSavingsExhaustedMonth = month + 1;
    const parent = Math.min(need, incomeContribution + savingsUsed);
    const gap = Math.max(0, need - parent);
    const family = Math.min(gap, familyContributions);
    const remaining = Math.max(0, gap - family);
    const reserveUsed = Math.min(familyReserve, remaining);
    familyReserve = Math.max(0, familyReserve - reserveUsed);
    return {
      month: month + 1,
      cost,
      need,
      essentialShortfall,
      income,
      expenses,
      parent,
      family,
      gap,
      remaining,
      savingsUsed,
      savingsLeft: savings,
      reserveUsed,
      reserveLeft: familyReserve,
      unfunded: Math.max(0, remaining - reserveUsed),
    };
  });
  const first = projection[0]!;
  const careMonthlyCost = Math.round(first.cost);
  const totalMonthlyNeed = Math.round(first.need);
  const essentialShortfall = totalMonthlyNeed - careMonthlyCost;
  const parentMonthlyIncome = Math.round(first.income);
  const parentCovered = Math.round(first.parent);
  const parentContributionRaw = parentCovered;
  const familyFundingGap = Math.max(0, totalMonthlyNeed - parentCovered);
  const familyCovered = Math.min(familyFundingGap, Math.round(familyContributions));
  const remainingGap = familyFundingGap - familyCovered;
  const people = [
    { id: "user", name: s.user.name, contribution: nonnegative(s.userContribution) },
    ...s.members
      .filter((m) => m.financial === "da")
      .map((m) => ({ id: m.id, name: m.name, contribution: nonnegative(m.contribution) })),
  ];
  const familyAllocations = people.map((person) => {
    const exact =
      familyContributions > 0 ? (familyCovered * person.contribution) / familyContributions : 0;
    return { ...person, covered: Math.floor(exact), remainder: exact % 1 };
  });
  // Largest-remainder allocation keeps the displayed breakdown equal to the displayed cost.
  const roundingOrder = [...familyAllocations].sort((a, b) => b.remainder - a.remainder);
  const roundingLeft =
    familyCovered - familyAllocations.reduce((sum, person) => sum + person.covered, 0);
  for (let index = 0; index < roundingLeft; index++) roundingOrder[index]!.covered++;
  const futureCareReserve = nonnegative(s.monthlySaving) * monthsUntilScenario;
  const coveredMonths = (key: "gap" | "remaining") => {
    let reserve = futureCareReserve;
    let count = 0;
    for (const row of projection) {
      if (row[key] > reserve + 0.001) break;
      reserve -= row[key];
      count++;
    }
    return count;
  };
  const monthsOfGapCovered = coveredMonths("gap");
  const monthsOfRemainingCovered = coveredMonths("remaining");
  const payers = 1 + s.members.filter((m) => m.financial === "da").length;
  const perPersonShare = Math.ceil(safeDiv(familyFundingGap, payers));
  const targetReserve = Math.ceil(
    projection
      .slice(0, PLAN_ASSUMPTIONS.invitationTargetMonths)
      .reduce((sum, row) => sum + row.remaining, 0),
  );
  const savingNeededToday =
    monthsUntilScenario > 0 ? Math.ceil(targetReserve / monthsUntilScenario) : null;
  const totalRemaining = projection.reduce((sum, row) => sum + row.remaining, 0);
  const totalCost = projection.reduce((sum, row) => sum + row.need, 0);
  const totalUnfunded = projection.reduce((sum, row) => sum + row.unfunded, 0);
  const readiness =
    totalCost > 0
      ? Math.min(
          totalUnfunded > 0.001 ? 99 : 100,
          Math.round((1 - totalUnfunded / totalCost) * 100),
        )
      : 100;
  const status: "ready" | "almost" | "attention" =
    monthsOfRemainingCovered === duration
      ? "ready"
      : monthsOfRemainingCovered >= PLAN_ASSUMPTIONS.partialCoverageMonths
        ? "almost"
        : "attention";
  return {
    parentMonthlyIncome,
    parentAvailableIncome,
    currentMonthlyIncome,
    currentFamilyNeed,
    careMonthlyCost,
    totalMonthlyNeed,
    essentialShortfall,
    parentContributionRaw,
    parentCovered,
    familyCovered,
    familyAllocations,
    familyFundingGap,
    siblingTotal,
    familyContributions,
    remainingGap,
    monthsUntilScenario,
    futureCareReserve,
    monthsOfGapCovered,
    monthsOfRemainingCovered,
    perPersonShare,
    targetReserve,
    savingNeededToday,
    readiness,
    status,
    scenarioAge: Math.round((p.age + monthsUntilScenario / 12) * 10) / 10,
    projection,
    parentSavingsExhaustedMonth,
    totalRemaining: Math.ceil(totalRemaining),
    totalUnfunded: Math.ceil(Math.max(0, totalUnfunded - 0.001)),
    projectedEssentialExpenses: Math.round(first.expenses),
    parentSavingsMonthlyBudget: Math.round(savingsBudget),
    comparisonSavingLater: requiredMonthlySaving(futureCareReserve, monthsUntilScenario, 60),
    targetMonths: Math.min(duration, PLAN_ASSUMPTIONS.invitationTargetMonths),
    yearsUntilScenario: Math.round((monthsUntilScenario / 12) * 10) / 10,
    fundingStartLabel:
      parseCareDate(s.careStartDate) && monthsUntilScenario > 0
        ? s.careStartDate.split("-").reverse().join(".")
        : monthsUntilScenario === 0
          ? "Acum"
          : `Peste ${monthsUntilScenario} luni`,
    reserveGrowth: Array.from({ length: Math.ceil(monthsUntilScenario / 12) + 1 }, (_, index) => {
      const month = Math.min(index * 12, monthsUntilScenario);
      const delayedSaving = requiredMonthlySaving(futureCareReserve, monthsUntilScenario, 60);
      return {
        month,
        years: Math.round((month / 12) * 10) / 10,
        reserve: s.monthlySaving * month,
        delayedReserve: delayedSaving === null ? 0 : Math.max(0, month - 60) * delayedSaving,
      };
    }),
    careDurationMonths: duration,
    endRemainingGap: Math.round(projection[duration - 1]!.remaining),
  };
}

export function parentCareContribution(s: PlanState, intensity: Intensity) {
  return computePlan(s, intensity).parentCovered;
}

/** Monthly saving needed to reach `target` if you start `delayMonths` later than today. */
export function requiredMonthlySaving(target: number, monthsUntil: number, delayMonths = 0) {
  const months = monthsUntil - delayMonths;
  return months > 0 ? Math.ceil(target / months) : null;
}

const nf = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
  useGrouping: "always",
} as unknown as Intl.NumberFormatOptions);
export const formatNumber = (n: number) => nf.format(Math.round(n));
export const ron = (n: number) => `${formatNumber(Math.max(0, n))} RON`;

export const STATUS_META = {
  ready: { label: "Pregătit", tone: "success" },
  almost: { label: "Aproape acoperit", tone: "warning" },
  attention: { label: "Necesită atenție", tone: "danger" },
} as const;

/** Romanian genitive for first names: Elena → Elenei, Maria → Mariei, Ion → lui Ion. */
export function genitive(name: string) {
  const n = name.trim();
  if (!n) return "persoanei";
  return /a$/i.test(n) ? n.slice(0, -1) + "ei" : `lui ${n}`;
}

/** "Elena Popescu" (or just "Elena"); a neutral label when no name was given. */
export function fullName(p: { name: string; lastName?: string }, fallback = "Persoana îngrijită") {
  return [p.name, p.lastName ?? ""].map((x) => x.trim()).filter(Boolean).join(" ") || fallback;
}

/** "Maria Ionescu Pop" → first name "Maria", family name "Ionescu Pop". */
export function splitName(full: string): { name: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { name: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}
