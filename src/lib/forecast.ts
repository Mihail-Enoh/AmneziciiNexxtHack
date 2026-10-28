// Prototype123 — forecast engine. Owner: P3 (assumptions reviewed by P1).
// Builds on plan.ts (month-by-month care costs) and health.ts (quiz + risk signals) and answers:
//   1. WHEN daily help may be needed: a probability per year (Gompertz curve) + a central interval.
//   2. WHAT it may cost the family: plan.ts run for every possible start year, weighted by probability.
//   3. HOW MUCH to set aside per month to have the reserve by the most likely year.
//   4. WHICH HABITS move the date: per habit, years gained and % of family cost saved.
// Everything is in TODAY'S LEI. Planning estimates only: not medical or financial advice.
// Every assumption lives in FORECAST_ASSUMPTIONS with its source or "Demo".
import { computePlan, type Intensity, type PlanState } from "./plan";
import { DOMAIN_WEIGHT, DOMAINS, QUIZ, questionPoints, type Domain, type DomainResult, type QuizAnswers } from "./health";

// ------------------------------------------------------------------ assumptions
export const FORECAST_ASSUMPTIONS = {
  onset: {
    /** Gompertz hazard h(age) = a · e^(b·(age − 65)) per year, for needing DAILY help. */
    a: 0.03303,
    b: 0.1,
    note: "Demo: calibrat astfel încât o persoană de 67 de ani fără factori de risc să ajungă la pragurile din plan (5 / 7 / 10 / 15 ani). De înlocuit cu date Eurostat/INS despre dependență.",
    /** Lighter help starts earlier, residential care later (same calibration). */
    intensity: { occasional: 2.65, frequent: 1.69, daily: 1, residential: 0.49 } as Record<Intensity, number>,
    /** Each risk point multiplies the yearly chance by e^0.12 ≈ 1.13 (age is already in the curve). */
    perRiskPoint: 0.12,
    /** Risk points assumed when no health check was done, from today's independence. */
    fromIndependence: { independent: 0, occasional: 6, regular: 12 },
    /** Interval shown around the most likely year: between the 40th and 60th percentile. */
    band: [0.4, 0.6] as const,
    bandNote: "Intervalul afișat cuprinde cele mai probabile 20% din situații, în jurul anului celui mai probabil. Anul real poate fi și în afara lui.",
  },
  economy: {
    /** Long-run inflation used to turn the savings rate into a real (today's lei) rate. */
    inflation: 0.04,
    inflationNote: "Presupunere între inflația din sept. 2026 (6,6%, INS) și ținta BNR (2,5%).",
    /** Cost and pension growth come from the plan's own assumptions (Ipoteze), so every number on the page agrees. */
    growthNote: "Aceleași valori ca în ipotezele planului; le poți schimba din pagina planului.",
    /** Savings for the reserve. */
    savingsRate: 0.07,
    savingsNote: "Dobânda Tezaur din oct. 2026 (3 ani, 7%/an, neimpozabilă). Dobânzile viitoare pot fi diferite.",
  },
  /** Habits the user can change, with the wording used in suggestions. Ids must exist in QUIZ (health.ts);
   *  a habit missing from the quiz is simply ignored.
   *  weight = how much one quiz point of this habit counts (lifestyle habits only; "social" is its own domain). */
  habits: [
    { id: "smoking", title: "Renunțarea la fumat", action: "renunță la fumat", weight: 1 },
    { id: "exercise", title: "Mișcare regulată", action: "face mișcare de câteva ori pe săptămână", weight: 1 },
    { id: "alcohol", title: "Mai puțin alcool", action: "bea alcool cel mult ocazional", weight: 0.75 },
    { id: "social", title: "Mai multă viață socială", action: "iese mai des din casă și se vede cu alți oameni", weight: 1 },
  ],
  habitsNote: "Demo: ponderi orientative pentru fiecare obicei, de verificat cu un specialist.",
  maxYears: 25,
};

// ------------------------------------------------------------------ math helpers
/** Fisher: real rate from a nominal rate and inflation. */
export const realRate = (nominal: number, inflation = FORECAST_ASSUMPTIONS.economy.inflation) => (1 + nominal) / (1 + inflation) - 1;
const monthly = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

/** Value at the start of a monthly stream (month 1 = first value), at an annual rate. */
export function presentValue(stream: number[], annualRate: number): number {
  const r = monthly(annualRate);
  return stream.reduce((pv, x, i) => pv + x / Math.pow(1 + r, i + 1), 0);
}

/** Monthly saving that grows to `target` after `months` deposits at an annual rate. */
export function monthlySavingFor(target: number, months: number, annualRate: number): number | null {
  if (months <= 0) return null;
  if (target <= 0) return 0;
  const r = monthly(annualRate);
  if (Math.abs(r) < 1e-12) return target / months;
  return (target * r) / (Math.pow(1 + r, months) - 1);
}

// ------------------------------------------------------------------ risk points
/**
 * Risk points from the health check, age excluded (age is in the curve).
 * Habits (lifestyle) count one by one, so changing a single habit always changes the result.
 * Other domains count their worst answer. Signals from lab results or the story (AI) can only raise a domain.
 */
export function riskPoints(domains: Pick<DomainResult, "domain" | "level" | "reasons">[] | null | undefined, answers: QuizAnswers | null | undefined): number {
  const quiz: Record<Domain, number> = { mobility: 0, daily: 0, cognition: 0, chronic: 0, lifestyle: 0, social: 0 };
  for (const q of QUIZ) {
    const p = answers ? questionPoints(q, answers) : null;
    if (p === null) continue;
    const w = FORECAST_ASSUMPTIONS.habits.find((h) => h.id === q.id)?.weight ?? 1;
    quiz[q.domain] = q.domain === "lifestyle" ? quiz[q.domain] + p * w : Math.max(quiz[q.domain], p);
  }
  return DOMAINS.reduce((sum, d) => {
    const other = Math.max(0, ...(domains ?? []).filter((x) => x.domain === d).flatMap((x) => x.reasons.filter((r) => r.source !== "quiz").map((r) => r.level)));
    // Domains passed without reasons (e.g. older saved results) still count at their level.
    const fallback = answers ? 0 : Math.max(0, ...(domains ?? []).filter((x) => x.domain === d).map((x) => x.level));
    return sum + Math.max(quiz[d], other, fallback) * DOMAIN_WEIGHT[d];
  }, 0);
}

// ------------------------------------------------------------------ 1) when help may be needed
export interface OnsetYear { year: number; probability: number; cumulative: number }
export interface OnsetCurve {
  years: OnsetYear[];
  /** Most likely year (median) and the central interval, in years from now. */
  p50: number; low: number; high: number;
  withinHorizon: number;
}

export function onsetCurve(age: number, points: number, intensity: Intensity, horizonYears: number): OnsetCurve {
  const { a, b, perRiskPoint, band } = FORECAST_ASSUMPTIONS.onset;
  const age0 = Math.max(50, Math.min(105, Number.isFinite(age) && age > 0 ? age : 70));
  const A = (a / b) * Math.exp(b * (age0 - 65)) * FORECAST_ASSUMPTIONS.onset.intensity[intensity] * Math.exp(perRiskPoint * Math.max(0, points));
  const cumulativeAt = (t: number) => 1 - Math.exp(-A * (Math.exp(b * t) - 1));
  const quantile = (q: number) => Math.log(1 + -Math.log(1 - q) / A) / b;
  const H = Math.max(1, Math.min(FORECAST_ASSUMPTIONS.maxYears, Math.round(horizonYears)));
  const years: OnsetYear[] = Array.from({ length: H }, (_, i) => ({
    year: i + 1,
    probability: cumulativeAt(i + 1) - cumulativeAt(i),
    cumulative: cumulativeAt(i + 1),
  }));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { years, p50: r1(quantile(0.5)), low: r1(quantile(band[0])), high: r1(quantile(band[1])), withinHorizon: cumulativeAt(H) };
}

// ------------------------------------------------------------------ the forecast
export interface ForecastOptions {
  /** From the health check (assessment.domains). */
  domains?: Pick<DomainResult, "domain" | "level" | "reasons">[] | null;
  /** Quiz answers from the health check (needed for habit suggestions). */
  answers?: QuizAnswers | null;
  intensity?: Intensity;
  horizonYears?: number;
  now?: Date;
}
export interface HabitSuggestion {
  id: string;
  title: string;
  detail: string;
  /** How much later daily help may be needed, in years. */
  delayYears: number;
  /** Drop in the expected family cost over the horizon. */
  costSaved: number;
  costSavedPct: number;
  /** How much less to set aside each month. */
  savingLessPerMonth: number;
}
export interface Forecast {
  intensity: Intensity;
  riskPoints: number;
  horizonYears: number;
  onset: OnsetCurve;
  /** Probability-weighted family cost over the horizon (today's lei). */
  expectedFamilyCost: number;
  /** If help starts in the most likely year. */
  atMedian: { year: number; monthlyGapAtStart: number; familyCost: number };
  /** One savings figure: reserve needed and monthly amount to reach it by the most likely year. */
  saving: { reserveNeeded: number; perMonth: number | null; months: number };
  habits: HabitSuggestion[];
  assumptions: { label: string; value: string; note: string }[];
  /** Chance per year for the chart, long enough to include the whole interval. */
  chartYears: OnsetYear[];
  /** How long care lasts in the plan (months), for the explanations. */
  careDurationMonths: number;
  /** True when costs do not grow (amounts are in today's prices). */
  todaysPrices: boolean;
}

/** plan.ts with care starting in `year` years, with the plan's own growth assumptions. */
function planAt(s: PlanState, intensity: Intensity, year: number, now: Date) {
  return computePlan({ ...s, careStartDate: "", yearsUntil: year, scenario: intensity }, intensity, now);
}

/** Without cost growth the amounts are today's prices → use the real savings rate; otherwise the nominal one. */
const savingsRateFor = (s: PlanState) =>
  (s.costGrowth || 0) > 0 ? FORECAST_ASSUMPTIONS.economy.savingsRate : realRate(FORECAST_ASSUMPTIONS.economy.savingsRate);

/** Core numbers for a given risk level (used for the real case and for each habit change). */
function core(s: PlanState, intensity: Intensity, points: number, horizon: number, now: Date) {
  const onset = onsetCurve(s.parent.age, points, intensity, horizon);
  const cache = new Map<number, ReturnType<typeof planAt>>();
  const at = (y: number) => { let p = cache.get(y); if (!p) { p = planAt(s, intensity, y, now); cache.set(y, p); } return p; };
  const familyCostOf = (y: number) => at(y).projection.reduce((sum, m) => sum + m.gap, 0);
  const expectedFamilyCost = onset.years.reduce((sum, y) => sum + y.probability * familyCostOf(y.year), 0);
  const medianYear = Math.max(1, Math.round(onset.p50));
  const m = at(medianYear);
  const rate = savingsRateFor(s);
  const reserveNeeded = presentValue(m.projection.map((row) => row.remaining), rate);
  const months = medianYear * 12;
  const perMonth = monthlySavingFor(reserveNeeded, months, rate);
  return {
    onset, expectedFamilyCost,
    atMedian: { year: medianYear, monthlyGapAtStart: m.familyFundingGap, familyCost: Math.round(familyCostOf(medianYear)) },
    careDurationMonths: m.careDurationMonths,
    saving: { reserveNeeded: Math.round(reserveNeeded), perMonth: perMonth === null ? null : Math.ceil(perMonth), months },
  };
}

export function forecast(s: PlanState, opts: ForecastOptions = {}): Forecast {
  const now = opts.now ?? new Date();
  const intensity = opts.intensity ?? s.scenario;
  const horizon = Math.max(1, Math.min(FORECAST_ASSUMPTIONS.maxYears, opts.horizonYears ?? Math.max(s.horizon, 10)));
  const hasHealth = !!opts.domains || !!opts.answers;
  const points = hasHealth ? riskPoints(opts.domains, opts.answers) : FORECAST_ASSUMPTIONS.onset.fromIndependence[s.parent.independence];
  const base = core(s, intensity, points, horizon, now);

  // Habit suggestions: change one habit to its best answer, keep everything else.
  const who = s.parent.name.trim() || "persoana";
  const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;
  const yrs = (n: number) => `${n.toLocaleString("ro-RO")} ${n === 1 ? "an" : "ani"}`;
  const habits: HabitSuggestion[] = [];
  const improve = (ids: string[]) => {
    const next: QuizAnswers = { ...(opts.answers ?? {}) };
    for (const id of ids) {
      const q = QUIZ.find((x) => x.id === id);
      const best = q?.options.find((o) => o.points === 0);
      if (q && best) next[id] = [best.id];
    }
    return next;
  };
  const evaluate = (id: string, title: string, action: string, ids: string[]) => {
    const p = riskPoints(opts.domains, improve(ids));
    if (p >= points) return;
    const better = core(s, intensity, p, horizon, now);
    const delayYears = Math.round((better.onset.p50 - base.onset.p50) * 10) / 10;
    const costSaved = Math.max(0, Math.round(base.expectedFamilyCost - better.expectedFamilyCost));
    const costSavedPct = base.expectedFamilyCost > 0 ? Math.round((costSaved / base.expectedFamilyCost) * 100) : 0;
    const savingLessPerMonth = base.saving.perMonth !== null && better.saving.perMonth !== null ? Math.max(0, base.saving.perMonth - better.saving.perMonth) : 0;
    if (delayYears <= 0) return;
    habits.push({
      id, title, delayYears, costSaved, costSavedPct, savingLessPerMonth,
      detail: `În modelul nostru, dacă ${who} ${action} de acum, nevoia de ajutor zilnic s-ar amâna cu aproximativ ${yrs(delayYears)}. ` +
        `În următorii ${horizon} ani, costul estimat pentru familie ar scădea cu ${costSavedPct >= 1 ? `${costSavedPct}%` : "sub 1%"} (aprox. ${lei(costSaved)})` +
        (savingLessPerMonth > 0 ? `, iar suma de pus deoparte ar fi cu ${lei(savingLessPerMonth)}/lună mai mică.` : "."),
    });
  };
  if (opts.answers) {
    const bad = FORECAST_ASSUMPTIONS.habits.filter((h) => {
      const q = QUIZ.find((x) => x.id === h.id);
      return (opts.answers?.[h.id] ?? []).some((id) => (q?.options.find((o) => o.id === id)?.points ?? 0) > 0);
    });
    for (const h of bad) evaluate(h.id, h.title, h.action, [h.id]);
    if (bad.length >= 2) evaluate("all", "Toate schimbările de mai sus", "face toate aceste schimbări", bad.map((h) => h.id));
    habits.sort((x, y) => (x.id === "all" ? 1 : y.id === "all" ? -1 : y.delayYears - x.delayYears));
  }

  const e = FORECAST_ASSUMPTIONS.economy;
  const pct = (n: number) => `${(Math.round(n * 1000) / 10).toLocaleString("ro-RO")}%`;
  const assumptions = [
    { label: "Când poate fi nevoie de ajutor", value: "curbă de risc pe vârstă (Gompertz) × factori de risc", note: FORECAST_ASSUMPTIONS.onset.note },
    { label: "Intervalul afișat", value: "între percentilele 40 și 60", note: FORECAST_ASSUMPTIONS.onset.bandNote },
    { label: "Efectul obiceiurilor", value: FORECAST_ASSUMPTIONS.habits.map((h) => `${h.title.toLowerCase()} ×${h.weight.toLocaleString("ro-RO")}`).join(", "), note: FORECAST_ASSUMPTIONS.habitsNote },
    { label: "Creșterea costurilor de îngrijire", value: `${pct((s.costGrowth || 0) / 100)}/an`, note: e.growthNote },
    { label: "Creșterea pensiei", value: `${pct((s.incomeGrowth || 0) / 100)}/an`, note: e.growthNote },
    { label: "Durata îngrijirii", value: `${base.careDurationMonths} luni`, note: e.growthNote },
    { label: "Inflație pe termen lung", value: pct(e.inflation), note: e.inflationNote },
    { label: "Dobânda pentru rezervă", value: `${pct(e.savingsRate)} nominal · ${pct(realRate(e.savingsRate))} real`, note: `${e.savingsNote} ${(s.costGrowth || 0) > 0 ? "Folosim dobânda nominală, pentru că și costurile cresc." : "Folosim dobânda reală, pentru că sumele sunt în prețurile de azi."}` },
  ];
  const chartHorizon = Math.min(FORECAST_ASSUMPTIONS.maxYears, Math.max(horizon, Math.ceil(base.onset.high) + 1));

  return {
    intensity, riskPoints: points, horizonYears: horizon, onset: base.onset,
    expectedFamilyCost: Math.round(base.expectedFamilyCost), atMedian: base.atMedian, saving: base.saving,
    habits, assumptions,
    chartYears: onsetCurve(s.parent.age, points, intensity, chartHorizon).years,
    careDurationMonths: base.careDurationMonths,
    todaysPrices: !((s.costGrowth || 0) > 0),
  };
}

/** What to write into the plan when the user applies the result: same date the screen shows. */
export function forecastPatch(f: Forecast): Partial<PlanState> {
  return { scenario: f.intensity, yearsUntil: Math.max(1, Math.round(f.onset.p50)), careStartDate: "" };
}