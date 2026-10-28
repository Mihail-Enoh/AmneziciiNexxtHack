// Prototype123 — health & habits → care-planning signals. Owner: P3.
// The AI only READS (lab values from images) and DESCRIBES (signals from the story).
// Everything that decides numbers — risk points, independence, when care may be needed —
// is the transparent rule set in this file, so it can be shown, explained and edited.
// Not medical advice: no diagnosis, no life expectancy, no treatment.
import { z } from "zod";
import { SCENARIOS, type Independence, type Intensity, type PlanState } from "./plan";

// ---------------------------------------------------------------- domains
export const DOMAINS = ["mobility", "daily", "cognition", "chronic", "lifestyle", "social"] as const;
export type Domain = (typeof DOMAINS)[number];
export type Level = 0 | 1 | 2;

export const DOMAIN_LABEL: Record<Domain, string> = {
  mobility: "Mobilitate",
  daily: "Activități zilnice",
  cognition: "Memorie și orientare",
  chronic: "Afecțiuni cronice",
  lifestyle: "Stil de viață",
  social: "Sprijin social",
};
export const LEVEL_LABEL: Record<Level, string> = { 0: "Fără semnale", 1: "Merită atenție", 2: "Semnal important" };

/** How much each domain moves the timeline. Mobility, daily activities and memory drive care needs most. */
export const DOMAIN_WEIGHT: Record<Domain, number> = { mobility: 2, daily: 2, cognition: 2, chronic: 1, lifestyle: 1, social: 1 };

// ---------------------------------------------------------------- quiz — short care-planning questionnaire
export interface QuizOption { id: string; label: string; points: Level }
export interface QuizQuestion {
  id: string; domain: Domain; text: string; options: QuizOption[]; multi?: boolean;
  /** Multi-choice options that cannot be combined with others (e.g. "Niciuna"). */
  exclusive?: string[];
  /** Multi-choice: the user may also type their own answers (each counts 1 point). */
  allowOther?: boolean;
}

const o = (id: string, label: string, points: Level): QuizOption => ({ id, label, points });

export const QUIZ: QuizQuestion[] = [
  {
    id: "smoking",
    domain: "lifestyle",
    text: "Fumează?",
    options: [
      o("no", "Nu", 0),
      o("sometimes", "Ocazional", 1),
      o("daily", "Zilnic", 2),
    ],
  },
  {
    id: "alcohol",
    domain: "lifestyle",
    text: "Cât de des bea alcool?",
    options: [
      o("rarely", "Deloc sau rar", 0),
      o("weekly", "De câteva ori pe săptămână", 1),
      o("daily", "Zilnic", 2),
    ],
  },
  {
    id: "exercise",
    domain: "lifestyle",
    text: "Cât de des face mișcare (plimbări, grădină, sport)?",
    options: [
      o("daily", "Zilnic", 0),
      o("weekly", "De câteva ori pe săptămână", 0),
      o("rarely", "Rar", 1),
      o("never", "Deloc", 2),
    ],
  },
  {
    id: "walking",
    domain: "mobility",
    text: "Cum se deplasează?",
    options: [
      o("alone", "Singur(ă), fără probleme", 0),
      o("difficulty", "Cu greutate sau cu baston", 1),
      o("helped", "Doar cu ajutor", 2),
    ],
  },
  {
    id: "selfcare",
    domain: "daily",
    text: "Se descurcă singur(ă) cu spălatul, îmbrăcatul și masa?",
    options: [
      o("yes", "Da", 0),
      o("some", "Cu puțin ajutor", 1),
      o("no", "Nu", 2),
    ],
  },
  {
    id: "medsAlone",
    domain: "daily",
    text: "Își ia singur(ă) medicamentele corect?",
    options: [
      o("yes", "Da", 0),
      o("forgets", "Uneori uită", 1),
      o("no", "Nu poate singur(ă)", 2),
    ],
  },
  {
    id: "memory",
    domain: "cognition",
    text: "Cum îi stă memoria?",
    options: [
      o("fine", "Fără probleme", 0),
      o("some", "Uită uneori lucruri recente", 1),
      o("often", "Uită des sau se dezorientează", 2),
    ],
  },
  {
    id: "medsCount",
    domain: "chronic",
    text: "Câte medicamente ia zilnic?",
    options: [
      o("few", "0–2", 0),
      o("some", "3–5", 1),
      o("many", "Peste 5", 2),
    ],
  },
  {
    id: "conditions",
    domain: "chronic",
    multi: true,
    exclusive: ["none"],
    allowOther: true,
    text: "Are vreuna dintre aceste afecțiuni diagnosticate? (poți alege mai multe)",
    options: [
      o("diabetes", "Diabet", 1),
      o("heart", "Boli de inimă", 1),
      o("bp", "Hipertensiune", 1),
      o("kidney", "Boli de rinichi", 1),
      o("lung", "Boli de plămâni", 1),
      o("joints", "Artroză sau osteoporoză", 1),
      o("none", "Niciuna", 0),
    ],
  },
  {
    id: "social",
    domain: "social",
    text: "Cât de des iese din casă sau se vede cu alți oameni?",
    options: [
      o("often", "Des", 0),
      o("rarely", "Rar", 1),
      o("almostNever", "Aproape deloc", 2),
    ],
  },
];

/** Answers: question id → selected option ids (one for single-choice). */
export type QuizAnswers = Record<string, string[]>;

export interface Reason { domain: Domain; level: Level; text: string; source: "quiz" | "analize" | "poveste" }

// ---------------------------------------------------------------- answers: exclusive options + own answers
/** Own answers typed by the user for a question are stored under this key. */
export const otherKey = (questionId: string) => `${questionId}__other`;
export const MAX_OTHER = 5;
export const MAX_OTHER_LENGTH = 40;

/** Own answers for a question, cleaned. */
export function customAnswers(q: QuizQuestion, answers: QuizAnswers): string[] {
  if (!q.allowOther) return [];
  return (answers[otherKey(q.id)] ?? []).map((t) => t.trim().slice(0, MAX_OTHER_LENGTH)).filter(Boolean).slice(0, MAX_OTHER);
}

/** Select / unselect an option, respecting exclusive options ("Niciuna" clears the others and vice versa). */
export function toggleAnswer(q: QuizQuestion, answers: QuizAnswers, optionId: string, on: boolean): QuizAnswers {
  const current = answers[q.id] ?? [];
  if (!q.multi) return { ...answers, [q.id]: on ? [optionId] : [] };
  if (!on) return { ...answers, [q.id]: current.filter((id) => id !== optionId) };
  const exclusive = q.exclusive ?? [];
  if (exclusive.includes(optionId)) {
    // "Niciuna": only this option, and no own answers.
    const next: QuizAnswers = { ...answers, [q.id]: [optionId] };
    delete next[otherKey(q.id)];
    return next;
  }
  return { ...answers, [q.id]: [...current.filter((id) => !exclusive.includes(id) && id !== optionId), optionId] };
}

/** Add an own answer (e.g. a condition not in the list). Removes exclusive options like "Niciuna". */
export function addCustomAnswer(q: QuizQuestion, answers: QuizAnswers, text: string): QuizAnswers {
  const t = text.trim().slice(0, MAX_OTHER_LENGTH);
  const existing = customAnswers(q, answers);
  if (!q.allowOther || !t || existing.length >= MAX_OTHER || existing.some((x) => x.toLowerCase() === t.toLowerCase())) return answers;
  const exclusive = q.exclusive ?? [];
  return { ...answers, [q.id]: (answers[q.id] ?? []).filter((id) => !exclusive.includes(id)), [otherKey(q.id)]: [...existing, t] };
}
export function removeCustomAnswer(q: QuizQuestion, answers: QuizAnswers, text: string): QuizAnswers {
  return { ...answers, [otherKey(q.id)]: customAnswers(q, answers).filter((x) => x !== text) };
}

/** Points for one question (null = not answered). Multi: sum of points (own answers count 1 each), capped at 2. */
export function questionPoints(q: QuizQuestion, answers: QuizAnswers): number | null {
  const picked = (answers[q.id] ?? []).map((id) => q.options.find((x) => x.id === id)).filter((x): x is QuizOption => !!x);
  const custom = customAnswers(q, answers);
  if (!picked.length && !custom.length) return null;
  if (!q.multi) return Math.max(...picked.map((x) => x.points));
  return Math.min(2, picked.reduce((a, x) => a + x.points, 0) + custom.length);
}

function answerLabels(q: QuizQuestion, answers: QuizAnswers): string[] {
  const labels = (answers[q.id] ?? []).map((id) => q.options.find((x) => x.id === id)?.label).filter((x): x is string => !!x);
  return [...labels, ...customAnswers(q, answers)];
}

export function scoreQuiz(answers: QuizAnswers): Reason[] {
  const out: Reason[] = [];
  for (const q of QUIZ) {
    const points = questionPoints(q, answers);
    if (points === null) continue;
    out.push({ domain: q.domain, level: points as Level, text: `${q.text} ${answerLabels(q, answers).join(", ")}`, source: "quiz" });
  }
  return out;
}

/** Quiz answers as readable lines for the AI prompt. */
export function quizAsText(answers: QuizAnswers): string {
  return QUIZ.flatMap((q) => {
    const labels = answerLabels(q, answers);
    return labels.length ? [`- ${q.text} ${labels.join(", ")}`] : [];
  }).join("\n");
}

// ---------------------------------------------------------------- lab results (read by the vision model)
export type Flag = "low" | "high" | "normal" | "unknown";
export interface LabResult {
  name: string; value: number; unit: string; refLow: number | null; refHigh: number | null; refText: string; flag: Flag;
  /** Date printed on the document (DD.MM.YYYY), when known — used to keep the newest value of a repeated test. */
  date?: string;
}

/** The flag is computed here from the numbers — never trusted from the model. */
export function flagOf(value: number, refLow: number | null, refHigh: number | null): Flag {
  if (refLow === null && refHigh === null) return "unknown";
  if (refLow !== null && value < refLow) return "low";
  if (refHigh !== null && value > refHigh) return "high";
  return "normal";
}

const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const RawLab = z.object({ name: z.unknown(), value: z.unknown(), unit: z.unknown(), refLow: z.unknown(), refHigh: z.unknown(), refText: z.unknown() }).partial().catch({});
const RawRead = z.object({ documentType: z.unknown(), date: z.unknown(), tests: z.array(z.unknown()).catch([]) }).partial().catch({});

export interface DocumentRead { documentType: string; date: string | null; labs: LabResult[] }

/** Clean the vision model's answer: keep only well-formed tests, max 60, short strings. */
export function sanitizeRead(raw: unknown): DocumentRead {
  const r = RawRead.parse(raw);
  const labs: LabResult[] = [];
  for (const t of (r.tests ?? []).slice(0, 60)) {
    const x = RawLab.parse(t);
    const name = typeof x.name === "string" ? x.name.trim().slice(0, 80) : "";
    const value = toNum(x.value);
    if (!name || value === null || Math.abs(value) > 1e7) continue;
    const refLow = toNum(x.refLow);
    const refHigh = toNum(x.refHigh);
    labs.push({
      name, value,
      unit: typeof x.unit === "string" ? x.unit.trim().slice(0, 30) : "",
      refLow, refHigh,
      refText: typeof x.refText === "string" ? x.refText.trim().slice(0, 40) : "",
      flag: flagOf(value, refLow, refHigh),
    });
  }
  const docTypes = ["lab_report", "prescription", "discharge_letter", "other"];
  const documentType = typeof r.documentType === "string" && docTypes.includes(r.documentType) ? r.documentType : "other";
  const date = typeof r.date === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(r.date.trim()) ? r.date.trim() : null;
  return { documentType, date, labs: date ? labs.map((l) => ({ ...l, date })) : labs };
}

/** Re-flag after the user corrected values in the review table. */
export const reflag = (labs: LabResult[]): LabResult[] => labs.map((l) => ({ ...l, flag: flagOf(l.value, l.refLow, l.refHigh) }));

/** Same test, however it is written: "Glicemie" = "glicemie " = "GLICEMIE:" (accents, case, punctuation ignored). */
export const labKey = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const dateValue = (d: string | undefined) => {
  const m = d ? /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d) : null;
  return m ? Number(`${m[3]}${m[2]}${m[1]}`) : null;
};

export interface LabMerge {
  labs: LabResult[];
  /** Tests that appeared again with another value: which value was kept. */
  replaced: { name: string; kept: number; dropped: number }[];
  /** Identical rows that were skipped. */
  duplicates: number;
}

/**
 * Add newly read results to the existing ones without double-counting a test.
 * Same test + same value → skipped. Same test + other value → the one from the newer document wins
 * (when dates are unknown, the newly added one wins). Max 60 rows.
 */
export function mergeLabs(existing: LabResult[], incoming: LabResult[]): LabMerge {
  const labs = [...existing];
  const replaced: LabMerge["replaced"] = [];
  let duplicates = 0;
  for (const lab of incoming) {
    const key = labKey(lab.name);
    const i = key ? labs.findIndex((l) => labKey(l.name) === key) : -1;
    if (i < 0) { if (labs.length < 60) labs.push(lab); continue; }
    const old = labs[i]!;
    if (old.value === lab.value) { duplicates++; continue; }
    const oldDate = dateValue(old.date), newDate = dateValue(lab.date);
    const incomingWins = oldDate === null || newDate === null || newDate >= oldDate;
    if (incomingWins) labs[i] = lab;
    replaced.push({ name: old.name, kept: incomingWins ? lab.value : old.value, dropped: incomingWins ? old.value : lab.value });
  }
  return { labs: reflag(labs), replaced, duplicates };
}

/** One row per test (keeps the last one) — so a test typed twice is never counted twice. */
/** Names that appear more than once (same test written differently counts too), e.g. ["Vitamina B12"]. */
export function duplicateLabNames(labs: LabResult[]): string[] {
  const seen = new Map<string, number>();
  for (const l of labs) { const k = labKey(l.name); if (k) seen.set(k, (seen.get(k) ?? 0) + 1); }
  const out: string[] = [];
  for (const l of labs) { const k = labKey(l.name); if (k && (seen.get(k) ?? 0) > 1 && !out.some((n) => labKey(n) === k)) out.push(l.name.trim()); }
  return out;
}
/** Rows without a name are unfinished: they are left out when the labs are used. */
export const namedLabs = (labs: LabResult[]): LabResult[] => labs.filter((l) => l.name.trim() !== "");

export const uniqueLabs = (labs: LabResult[]): LabResult[] => {
  const byKey = new Map<string, LabResult>();
  labs.forEach((l, i) => byKey.set(labKey(l.name) || `#${i}`, l));
  return [...byKey.values()];
};

export function labsAsText(labs: LabResult[]): string {
  const f: Record<Flag, string> = { low: "SUB interval", high: "PESTE interval", normal: "în interval", unknown: "fără interval" };
  return uniqueLabs(labs).map((l) => `- ${l.name}: ${l.value} ${l.unit} (referință ${l.refText || "-"}) → ${f[l.flag]}`).join("\n");
}

/** Out-of-range lab results raise the "chronic" domain: 1–2 → attention, 3+ → important. */
export function labReason(all: LabResult[]): Reason | null {
  const labs = uniqueLabs(all);
  const out = labs.filter((l) => l.flag === "low" || l.flag === "high");
  if (!out.length) return null;
  return { domain: "chronic", level: out.length >= 3 ? 2 : 1, text: `${out.length} din ${labs.length} analize în afara intervalului de referință (${out.slice(0, 4).map((l) => l.name).join(", ")}${out.length > 4 ? "…" : ""})`, source: "analize" };
}

// ---------------------------------------------------------------- AI interpretation (text model)
export interface AiInterpretation { summary: string; reasons: Reason[]; questionsForDoctor: string[] }

const AiRaw = z.object({ summary: z.unknown(), signals: z.array(z.unknown()).catch([]), questionsForDoctor: z.array(z.unknown()).catch([]) }).partial().catch({});
const AiSignal = z.object({ domain: z.unknown(), level: z.unknown(), evidence: z.unknown() }).partial().catch({});

/** Pull the first JSON object out of model text (handles ```json fences, <think> blocks, chatter). */
export function extractJson(text: string): unknown {
  const t = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

export function sanitizeInterpretation(raw: unknown): AiInterpretation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = AiRaw.parse(raw);
  const reasons: Reason[] = [];
  for (const s of (r.signals ?? []).slice(0, 12)) {
    const x = AiSignal.parse(s);
    const domain = DOMAINS.find((d) => d === x.domain);
    const lv = toNum(x.level);
    const evidence = typeof x.evidence === "string" ? x.evidence.trim().slice(0, 200) : "";
    if (!domain || lv === null || !evidence) continue;
    reasons.push({ domain, level: Math.max(0, Math.min(2, Math.round(lv))) as Level, text: evidence, source: "poveste" });
  }
  const summary = typeof r.summary === "string" ? r.summary.trim().slice(0, 900) : "";
  const questionsForDoctor = (r.questionsForDoctor ?? []).filter((q): q is string => typeof q === "string" && q.trim() !== "").map((q) => q.trim().slice(0, 200)).slice(0, 5);
  if (!summary && !reasons.length) return null;
  return { summary, reasons, questionsForDoctor };
}

// ---------------------------------------------------------------- the rules (deterministic "prediction")
export const HEALTH_RULES = {
  /** Every risk point brings the care scenarios this much closer (4% per point)… */
  speedPerPoint: 0.04,
  /** …but never more than 70% closer than for someone with no risk signals. */
  minFactor: 0.3,
  /** Extra risk points by age. */
  agePoints: (age: number) => (age >= 85 ? 3 : age >= 80 ? 2 : age >= 75 ? 1 : 0),
};

export interface DomainResult { domain: Domain; label: string; level: Level; reasons: Reason[] }
export interface TimelineItem { id: Intensity; label: string; years: number; baseYears: number }
export interface HealthAssessment {
  domains: DomainResult[];
  riskPoints: number;
  maxPoints: number;
  sooner: number; // % sooner than the no-risk baseline
  independence: Independence;
  timeline: TimelineItem[];
  focus: { scenario: Intensity; years: number };
  summary: string;
  questionsForDoctor: string[];
  labs: LabResult[];
  aiUsed: boolean;
}

export function assessHealth(input: { age: number; answers: QuizAnswers; labs: LabResult[]; ai: AiInterpretation | null }): HealthAssessment {
  const reasons = [...scoreQuiz(input.answers)];
  const lab = labReason(input.labs);
  if (lab) reasons.push(lab);
  if (input.ai) reasons.push(...input.ai.reasons);

  const domains: DomainResult[] = DOMAINS.map((d) => {
    const rs = reasons.filter((r) => r.domain === d);
    const level = (rs.length ? Math.max(...rs.map((r) => r.level)) : 0) as Level;
    return { domain: d, label: DOMAIN_LABEL[d], level, reasons: rs };
  });
  const levelOf = (d: Domain) => domains.find((x) => x.domain === d)?.level ?? 0;

  const agePts = HEALTH_RULES.agePoints(input.age);
  const riskPoints = domains.reduce((a, d) => a + d.level * DOMAIN_WEIGHT[d.domain], 0) + agePts;
  const maxPoints = DOMAINS.reduce((a, d) => a + 2 * DOMAIN_WEIGHT[d], 0) + HEALTH_RULES.agePoints(200);
  const factor = Math.max(HEALTH_RULES.minFactor, 1 - riskPoints * HEALTH_RULES.speedPerPoint);

  const core = Math.max(levelOf("mobility"), levelOf("daily"), levelOf("cognition"));
  const independence: Independence = core === 2 ? "regular" : core === 1 ? "occasional" : "independent";
  // Help that is already needed today starts now (0 years).
  const alreadyNow: Intensity[] = independence === "regular" ? ["occasional", "frequent"] : independence === "occasional" ? ["occasional"] : [];

  const timeline: TimelineItem[] = SCENARIOS.map((s) => ({
    id: s.id, label: s.label, baseYears: s.yearsFromNow,
    years: alreadyNow.includes(s.id) ? 0 : Math.max(1, Math.round(s.yearsFromNow * factor)),
  }));
  const daily = timeline.find((t) => t.id === "daily");

  const summary = input.ai?.summary ||
    `Pe baza răspunsurilor${input.labs.length ? " și a analizelor" : ""}, am găsit ${domains.filter((d) => d.level > 0).length} domenii care merită atenție. Estimăm că ajutorul zilnic ar putea deveni necesar în aproximativ ${daily?.years ?? 10} ani. Sunt estimări pentru planificare, nu o evaluare medicală.`;

  return {
    domains, riskPoints, maxPoints, sooner: Math.round((1 - factor) * 100), independence, timeline,
    focus: { scenario: "daily", years: Math.max(1, daily?.years ?? 10) },
    summary, questionsForDoctor: input.ai?.questionsForDoctor ?? [], labs: input.labs, aiUsed: !!input.ai,
  };
}

/** What to write into the plan store: setPlan(healthPatch(currentPlan, assessment)). */
export function healthPatch(current: PlanState, a: HealthAssessment): Partial<PlanState> {
  return {
    parent: { ...current.parent, independence: a.independence },
    scenario: a.focus.scenario,
    yearsUntil: a.focus.years,
    careStartDate: "", // so yearsUntil is used instead of an old manual date
  };
}