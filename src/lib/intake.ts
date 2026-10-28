// Prototype123 — AI intake: turns the model's JSON into a SAFE patch for PlanState.
// Owner: P3. The model only extracts what the user said; this file validates, clamps,
// snaps values to the lists the UI knows, and decides where the app navigates.
// Nothing here is trusted from the model: unknown fields are dropped, bad values are
// ignored (not fatal), and the destination page comes from an allowlist.
import { z } from "zod";
import { demoState, ron, scenarioById, splitName, type FamilyMember, type Independence, type Intensity, type PlanState } from "./plan";

// Same lists as the onboarding form in routes/start.tsx. Keep them in sync (or import from here there).
export const CITIES = ["București", "Cluj-Napoca", "Iași", "Timișoara", "Brașov", "Constanța", "Alt oraș", "Zonă rurală"] as const;
export const LIVING = ["Locuiește singur(ă)", "Locuiește cu partenerul", "Locuiește cu mine", "Locuiește cu alt membru al familiei"] as const;
export const HOUSING = ["Proprietar", "Chiriaș", "Altă situație"] as const;
export const ASSETS = ["Locuință proprie", "Altă proprietate", "Pensie privată (Pilon III)", "Alte economii"] as const;
export const ROLES = ["Frate", "Soră", "Partener", "Alt membru al familiei"] as const;
export const FINANCIAL = ["da", "nu-spun", "alte-moduri"] as const;
export const INDEPENDENCE = ["independent", "occasional", "regular"] as const;
export const SCENARIO_IDS = ["occasional", "frequent", "daily", "residential"] as const;

/** Pages the AI may open. The model never provides a URL, only one of these keys. */
export const PAGE_PATH = { start: "/start", plan: "/plan", scenarii: "/scenarii" } as const;
export type OpenPage = keyof typeof PAGE_PATH;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Match a free-text value to one of the allowed options (accent/case-insensitive, prefix allowed). */
export function snap<T extends string>(v: unknown, list: readonly T[]): T | undefined {
  if (typeof v !== "string") return undefined;
  const n = norm(v);
  if (n.length < 2) return undefined;
  return list.find((x) => norm(x) === n) ?? (n.length >= 3 ? list.find((x) => norm(x).startsWith(n)) : undefined);
}

const num = (min: number, max: number) =>
  z
    .preprocess((v) => (typeof v === "string" && v.trim() !== "" ? Number(v.replace(/\s/g, "").replace(",", ".")) : v), z.number().finite().min(min).max(max))
    .optional()
    .catch(undefined);
const text = (max = 40) => z.string().trim().min(1).max(max).optional().catch(undefined);
const loose = z.string().optional().catch(undefined); // snapped later

const ParentIn = z
  .object({
    name: text(), age: num(40, 110), city: loose, living: loose, housing: loose, independence: loose,
    pension: num(0, 50_000), otherIncome: num(0, 50_000), savings: num(0, 5_000_000), expenses: num(0, 50_000),
    assets: z.array(z.string()).max(10).optional().catch(undefined),
  })
  .catch({});
const UserIn = z.object({ name: text(), age: num(18, 100), income: num(0, 200_000), savings: num(0, 100_000) }).catch({});
const MemberIn = z.object({ name: text(), role: loose, contribution: num(0, 10_000), financial: loose });

export const IntakeSchema = z.object({
  message: z.string().optional().catch(undefined),
  open: loose,
  missing: z.array(z.string()).optional().catch(undefined),
  parent: ParentIn,
  user: UserIn,
  userContribution: num(0, 10_000),
  members: z.preprocess((v) => (Array.isArray(v) ? v.slice(0, 5) : v), z.array(MemberIn.catch({}))).optional().catch(undefined),
  horizon: num(1, 30),
  scenario: loose,
  yearsUntil: num(1, 25),
  monthlySaving: num(0, 20_000),
});
export type RawIntake = z.infer<typeof IntakeSchema>;

/** Pull the first JSON object out of model text (handles ```json fences, <think> blocks, chatter). */
export function parseIntake(modelText: string): RawIntake | null {
  const cleaned = modelText.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return IntakeSchema.parse(JSON.parse(cleaned.slice(a, b + 1)));
  } catch {
    return null;
  }
}

export interface Chip { label: string; value: string }
export interface IntakeResult {
  patch: Partial<PlanState>;
  open: OpenPage;
  path: string;
  message: string;
  filled: Chip[];   // what the user told us
  assumed: Chip[];  // what we filled in ourselves — the UI must show these as "estimate, change it"
  missing: string[];
}

/** Empty plan: unlike demoState() nothing from the "Elena" demo leaks into a real user's plan. */
export function blankState(): PlanState {
  const d = demoState();
  return {
    ...d, onboarded: false,
    parent: { name: "", lastName: "", age: 0, city: "Alt oraș", living: "Locuiește singur(ă)", housing: "Altă situație", independence: "independent", pension: 0, otherIncome: 0, savings: 0, expenses: 0, assets: [] },
    user: { name: "", age: 0, income: 0, savings: 0 },
    userContribution: 0, members: [], monthlySaving: 0, horizon: 10, scenario: "daily", yearsUntil: 10,
    futureIncome: null, useSavings: false, checklist: {},
  };
}

const ASSUMED_EXPENSE_SHARE = 0.8;
const r = (n: number) => Math.round(n);
const nearestHorizon = (y: number): 5 | 10 | 15 => (y <= 7 ? 5 : y <= 12 ? 10 : 15);

/** Blank plan with the name the user typed (used when the AI could not read the story). */
export function blankWithName(full: string): PlanState {
  const b = blankState();
  return { ...b, parent: { ...b.parent, ...splitName(full) } };
}

export function applyIntake(raw: RawIntake | null, opts: { name?: string } = {}): IntakeResult {
  const base = blankState();
  const filled: Chip[] = [];
  const assumed: Chip[] = [];
  const missing: string[] = [];
  const x = raw ?? IntakeSchema.parse({});
  const pin = x.parent;

  // --- parent
  const parent = { ...base.parent };
  const typed = splitName(opts.name ?? "");
  if (typed.name) { parent.name = typed.name; parent.lastName = typed.lastName; filled.push({ label: "Numele persoanei", value: [typed.name, typed.lastName].filter(Boolean).join(" ") }); }
  else if (pin.name) { parent.name = pin.name; filled.push({ label: "Prenumele persoanei", value: pin.name }); }
  if (pin.age !== undefined) { parent.age = r(pin.age); filled.push({ label: "Vârsta părintelui", value: `${parent.age} ani` }); }
  const city = snap(pin.city, CITIES); if (city) { parent.city = city; filled.push({ label: "Localitate", value: city }); }
  const living = snap(pin.living, LIVING); if (living) parent.living = living;
  const housing = snap(pin.housing, HOUSING); if (housing) parent.housing = housing;
  if (pin.pension !== undefined) { parent.pension = r(pin.pension); filled.push({ label: "Pensie lunară", value: ron(parent.pension) }); }
  if (pin.otherIncome !== undefined) { parent.otherIncome = r(pin.otherIncome); filled.push({ label: "Alte venituri lunare", value: ron(parent.otherIncome) }); }
  if (pin.savings !== undefined) { parent.savings = r(pin.savings); filled.push({ label: "Economii", value: ron(parent.savings) }); }
  const assets = (pin.assets ?? []).map((a) => snap(a, ASSETS)).filter((a): a is (typeof ASSETS)[number] => !!a);
  parent.assets = [...new Set(assets)];

  const income = parent.pension + parent.otherIncome;
  const haveEssentials = parent.age > 0 && income > 0;
  if (parent.age === 0) missing.push("vârsta părintelui");
  if (income === 0) missing.push("venitul lunar al părintelui (pensie)");

  const indep = snap(pin.independence, INDEPENDENCE) as Independence | undefined;
  if (indep) { parent.independence = indep; filled.push({ label: "Independență", value: indep === "independent" ? "Independent(ă)" : indep === "occasional" ? "Ajutor ocazional" : "Ajutor regulat" }); }
  else if (haveEssentials) assumed.push({ label: "Independență", value: "Independent(ă) — presupunere" });

  if (pin.expenses !== undefined) { parent.expenses = r(pin.expenses); filled.push({ label: "Cheltuieli esențiale", value: ron(parent.expenses) }); }
  else if (income > 0) {
    parent.expenses = r(income * ASSUMED_EXPENSE_SHARE);
    assumed.push({ label: "Cheltuieli esențiale", value: `${ron(parent.expenses)} — estimare, 80% din venit` });
  }

  // --- user
  const user = { ...base.user };
  if (x.user.name) { user.name = x.user.name; filled.push({ label: "Prenumele tău", value: user.name }); }
  if (x.user.age !== undefined) user.age = r(x.user.age);
  if (x.user.income !== undefined) { user.income = r(x.user.income); filled.push({ label: "Venitul tău net", value: ron(user.income) }); }
  if (x.user.savings !== undefined) user.savings = r(x.user.savings);

  // --- family
  const members: FamilyMember[] = (x.members ?? []).filter((m) => m.name || m.contribution !== undefined).map((m, i) => {
    const contribution = r(m.contribution ?? 0);
    const financial = snap(m.financial, FINANCIAL) ?? "da";
    filled.push({ label: m.name ? `Familie: ${m.name}` : "Membru al familiei", value: financial === "da" ? ron(contribution) + "/lună" : "contribuie în alt mod" });
    return { id: `ai${i}`, name: m.name ?? "", role: snap(m.role, ROLES) ?? "Alt membru al familiei", contribution: financial === "da" ? contribution : 0, status: "estimat", financial, helps: [] };
  });

  const userContribution = x.userContribution !== undefined ? r(x.userContribution) : 0;
  if (x.userContribution !== undefined) filled.push({ label: "Contribuția ta", value: ron(userContribution) + "/lună" });
  const monthlySaving = x.monthlySaving !== undefined ? r(x.monthlySaving) : 0;
  if (x.monthlySaving !== undefined) filled.push({ label: "Economisești pentru fond", value: ron(monthlySaving) + "/lună" });

  // --- horizon & scenario (same defaults as the form: daily care, yearsUntil = horizon)
  const scenario = snap(x.scenario, SCENARIO_IDS) as Intensity | undefined;
  const yearsUntil = r(x.yearsUntil ?? (scenario ? scenarioById(scenario).yearsFromNow : x.horizon ?? base.horizon));
  const horizon = x.horizon !== undefined ? nearestHorizon(x.horizon) : nearestHorizon(yearsUntil);
  if (scenario) filled.push({ label: "Scenariu", value: `${scenarioById(scenario).label}, peste ${yearsUntil} ani` });

  // --- destination: model suggestion only counts if the essentials exist
  const asked = snap(x.open, Object.keys(PAGE_PATH) as OpenPage[]);
  const open: OpenPage = !haveEssentials ? "start" : asked === "scenarii" && scenario ? "scenarii" : "plan";

  // The model sometimes lists as missing what it just filled ("vârsta", "pensia"): drop those.
  const modelMissing = (x.missing ?? []).map((m) => m.trim().slice(0, 80)).filter(Boolean)
    .filter((m) => !alreadyFilled(m, [...filled, ...assumed].map((f) => f.label))).slice(0, 3);
  for (const m of modelMissing) if (!missing.includes(m)) missing.push(m);

  const message = (x.message ?? "").trim().slice(0, 500) ||
    (haveEssentials ? "Am pornit de la ce mi-ai spus. Verifică datele de mai jos și schimbă-le dacă nu sunt corecte." : "Mai am nevoie de câteva detalii ca să construiesc planul.");

  const patch: Partial<PlanState> = {
    onboarded: haveEssentials, parent, user, members, userContribution, monthlySaving,
    horizon, scenario: scenario ?? "daily", yearsUntil,
  };
  return { patch, open, path: PAGE_PATH[open], message, filled, assumed, missing };
}

const STOP = ["parint", "persoa", "lunar", "lunare", "tatal", "mama", "mamei", "tatalu"];
const stems = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .split(/[^a-z]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 5)).filter((w) => !STOP.some((x) => x.startsWith(w) || w.startsWith(x.slice(0, 5))));
/** True when every meaningful word of a "missing" item already appears in a filled label (e.g. "pensia" ↔ "Pensie lunară"). */
export function alreadyFilled(item: string, labels: string[]): boolean {
  const words = stems(item);
  const have = new Set(labels.flatMap(stems));
  return words.length > 0 && words.every((w) => have.has(w));
}

/** One call for the endpoint: model text in, result out. Never throws. */
export function intakeFromModelText(modelText: string, opts: { name?: string } = {}): IntakeResult | null {
  const raw = parseIntake(modelText);
  return raw ? applyIntake(raw, opts) : null;
}