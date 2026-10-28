import { CareTimingInput } from "@/components/app/CareTimingInput";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { Logo, PublicHeader } from "@/components/app/AppShell";
import { AnimatedNumber, InfoTip, PrivacyNote } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountSlider } from "@/components/app/AmountSlider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ASSET_RULES, computePlan, parentMonthlyIncomeOf, ron, type FamilyMember, type Independence, type PlanState } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { IntakeBanner } from "@/components/app/IntakeBanner";
import { clearIntakeNote } from "@/lib/intake-session";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Construiește planul familiei — Prototype123" },
      {
        name: "description",
        content:
          "Câteva întrebări simple despre părintele tău și familia ta, pentru un prim plan financiar.",
      },
      { property: "og:title", content: "Construiește planul familiei — Prototype123" },
      {
        property: "og:description",
        content:
          "Patru pași scurți pentru a înțelege nevoile financiare viitoare ale părintelui tău.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const CITIES = [
  "București",
  "Cluj-Napoca",
  "Iași",
  "Timișoara",
  "Brașov",
  "Constanța",
  "Alt oraș",
  "Zonă rurală",
];
const LIVING = [
  "Locuiește singur(ă)",
  "Locuiește cu partenerul",
  "Locuiește cu mine",
  "Locuiește cu alt membru al familiei",
];
const HOUSING = ["Proprietar", "Chiriaș", "Altă situație"];
const INDEP: { id: Independence; title: string; text: string }[] = [
  {
    id: "independent",
    title: "Independent",
    text: "Se descurcă singur(ă) cu activitățile zilnice.",
  },
  {
    id: "occasional",
    title: "Are nevoie ocazional de ajutor",
    text: "Transport, cumpărături, curățenie sau alte activități.",
  },
  {
    id: "regular",
    title: "Are nevoie regulat de ajutor",
    text: "Familia sau altcineva oferă deja sprijin frecvent.",
  },
];
const ASSETS = [
  "Locuință proprie",
  "Altă proprietate",
  "Pensie privată (Pilon III)",
  "Alte economii",
];
const ROLES = ["Frate", "Soră", "Partener", "Alt membru al familiei"];

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix = "RON",
  tip,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  tip?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {label}
        {tip && <InfoTip>{tip}</InfoTip>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="h-12 rounded-xl pr-14 text-base tabular"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 rounded-xl text-base" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const LOADING = [
  "Construim scenariile…",
  "Estimăm resursele disponibile…",
  "Calculăm diferențele de acoperit…",
];

function Onboarding() {
  const t = useT();
  const saved = usePlan();
  const navigate = useNavigate();
  const [d, setD] = useState<PlanState>(saved);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(-1);
  useEffect(() => setD(saved), [saved]);
  const p = d.parent;
  const setP = (patch: Partial<PlanState["parent"]>) => setD({ ...d, parent: { ...p, ...patch } });
  const surplus = computePlan(d).parentAvailableIncome;

  const setMember = (id: string, patch: Partial<FamilyMember>) =>
    setD({ ...d, members: d.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const addMember = () =>
    setD({
      ...d,
      members: [
        ...d.members,
        {
          id: Math.random().toString(36).slice(2, 8),
          name: "",
          role: "Soră",
          contribution: 0,
          status: "estimat",
          financial: "da",
          helps: [],
        },
      ],
    });

  const finish = () => {
    setPlan({ ...d, onboarded: true });
    clearIntakeNote(); // the AI note was about filling this form; it is done
    setLoading(0);
  };
  useEffect(() => {
    if (loading < 0) return;
    const t = setTimeout(
      () => (loading < LOADING.length - 1 ? setLoading(loading + 1) : navigate({ to: "/plan" })),
      600,
    );
    return () => clearTimeout(t);
  }, [loading, navigate]);

  if (loading >= 0) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto size-10 animate-spin text-primary" />
          <ul className="mt-8 space-y-3 text-left">
            {LOADING.map((l, i) => (
              <li
                key={l}
                className={cn(
                  "flex items-center gap-3 text-lg transition-opacity",
                  i > loading && "opacity-30",
                )}
              >
                {i < loading ? (
                  <Check className="size-5 text-success" />
                ) : (
                  <span className="size-5" />
                )}
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        <IntakeBanner />
        <div className="mb-8">
          <p className="text-sm font-semibold text-muted-foreground">{t("Pasul ")}{step}{t(" din 4")}</p>
          <div className="mt-2 grid grid-cols-4 gap-2" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <div key={step} className="card-surface animate-rise p-6 md:p-10">
          {step === 1 && (
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold md:text-4xl">
                Spune-ne puțin despre persoana de care ai grijă
              </h1>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pname">Prenume <span className="text-care">*</span></Label>
                  <Input
                    id="pname"
                    value={p.name}
                    required
                    aria-required
                    aria-invalid={!p.name.trim() ? true : undefined}
                    aria-describedby="pname-help"
                    onChange={(e) => setP({ name: e.target.value })}
                    className="h-12 rounded-xl text-base"
                  />
                  {!p.name.trim() && <p id="pname-help" className="text-xs text-muted-foreground">Prenumele este obligatoriu; îl folosim în tot planul.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plast">Nume de familie (opțional)</Label>
                  <Input
                    id="plast"
                    value={p.lastName ?? ""}
                    onChange={(e) => setP({ lastName: e.target.value })}
                    className="h-12 rounded-xl text-base"
                  />
                </div>
                <NumberField
                  id="page"
                  label="Vârstă"
                  value={p.age}
                  suffix="ani"
                  onChange={(n) => setP({ age: n })}
                />
                <SelectField
                  label="Localitate"
                  value={p.city}
                  options={CITIES}
                  onChange={(v) => setP({ city: v })}
                />
                <SelectField
                  label="Situația locuirii"
                  value={p.living}
                  options={LIVING}
                  onChange={(v) => setP({ living: v })}
                />
                <SelectField
                  label="Locuința"
                  value={p.housing}
                  options={HOUSING}
                  onChange={(v) => setP({ housing: v })}
                />
              </div>
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  Cât de independent(ă) este astăzi?
                </legend>
                <div className="grid gap-3 md:grid-cols-3">
                  {INDEP.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={p.independence === o.id}
                      onClick={() => setP({ independence: o.id })}
                      className={cn(
                        "rounded-2xl border-2 p-4 text-left transition-all",
                        p.independence === o.id
                          ? "border-primary bg-primary-soft"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <span className="flex items-center justify-between font-semibold">
                        {o.title}
                        {p.independence === o.id && <Check className="size-4 text-primary" />}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">{o.text}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-muted-foreground">
                Nu îți cerem informații medicale.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold md:text-4xl">
                Ce resurse financiare are {p.name || "persoana"} astăzi?
              </h1>
              <p className="rounded-xl bg-primary-soft p-3 text-sm">
                Nu trebuie să introduci valori exacte. O estimare este suficientă pentru primul
                plan.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <NumberField
                  id="pension"
                  label="Pensie lunară"
                  value={p.pension}
                  onChange={(n) => setP({ pension: n })}
                />
                <NumberField
                  id="other"
                  label="Alte venituri lunare"
                  value={p.otherIncome}
                  onChange={(n) => setP({ otherIncome: n })}
                />
                <NumberField
                  id="savings"
                  label="Economii accesibile"
                  value={p.savings}
                  onChange={(n) => setP({ savings: n })}
                  tip="Bani pe care i-ar putea folosi relativ ușor: depozite, cont curent."
                />
                <NumberField
                  id="expenses"
                  label="Cheltuieli esențiale lunare"
                  value={p.expenses}
                  onChange={(n) => setP({ expenses: n })}
                  tip="Utilități, mâncare, medicamente uzuale, transport."
                />
              </div>
              <fieldset>
                <legend className="mb-3 text-sm font-medium">{t("Alte resurse (opțional)")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ASSETS.map((a) => (
                    <label
                      key={a}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm"
                    >
                      <Checkbox
                        checked={p.assets.includes(a)}
                        onCheckedChange={(c) =>
                          setP({ assets: c ? [...p.assets, a] : p.assets.filter((x) => x !== a) })
                        }
                      />
                      {a}
                    </label>
                  ))}
                </div>
                {p.assets.some((a) => ASSET_RULES[a]) && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {p.assets.filter((a) => ASSET_RULES[a]).map((a) => (
                      <NumberField
                        key={a}
                        id={`asset-${a.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`}
                        label={ASSET_RULES[a]!.question}
                        suffix={ASSET_RULES[a]!.suffix}
                        value={p.assetAmounts?.[a] ?? 0}
                        onChange={(n) => setP({ assetAmounts: { ...(p.assetAmounts ?? {}), [a]: n } })}
                      />
                    ))}
                  </div>
                )}
                {p.assets.includes("Locuință proprie") && (
                  <p className="mt-3 text-xs text-muted-foreground">Locuința proprie înseamnă fără chirie; nu o transformăm automat în bani în plan.</p>
                )}
              </fieldset>
              <div
                className="rounded-2xl border border-success/30 bg-success-soft p-5"
                aria-live="polite"
              >
                {parentMonthlyIncomeOf(p) === 0 ? (
                  <p className="text-sm">{t("Adaugă venitul părintelui pentru a calcula scenariul.")}</p>
                ) : (
                  <p className="text-sm">
                    <strong className="font-display text-2xl">
                      <AnimatedNumber value={surplus} />
                      /lună
                    </strong>
                    <br />
                    {p.name || "Persoana"} are aproximativ {ron(surplus)}/lună disponibili
                    peste cheltuielile curente.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold md:text-4xl">
                Cine ar putea contribui dacă {p.name} ar avea nevoie de ajutor?
              </h1>
              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="uname">Numele tău complet</Label>
                  <Input
                    id="uname"
                    value={d.user.name}
                    onChange={(e) => setD({ ...d, user: { ...d.user, name: e.target.value } })}
                    className="h-12 rounded-xl text-base"
                  />
                </div>
                <NumberField
                  id="uinc"
                  label="Venitul tău net lunar"
                  value={d.user.income}
                  onChange={(n) => setD({ ...d, user: { ...d.user, income: n }, userContribution: n > 0 ? Math.min(d.userContribution, n) : d.userContribution })}
                />
                <NumberField
                  id="usav"
                  label="Economisești lunar"
                  value={d.user.savings}
                  onChange={(n) => setD({ ...d, user: { ...d.user, savings: n } })}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 rounded-2xl border bg-care-soft/50 p-4">
                  <span className="grid size-10 place-items-center rounded-full bg-care text-care-foreground">
                    <UserRound className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Tu{d.user.name && ` · ${d.user.name}`}</p>
                    <p className="text-sm text-muted-foreground">
                      Venit: {ron(d.user.income)}/lună
                    </p>
                  </div>
                </div>
                {d.members.map((m) => (
                  <div
                    key={m.id}
                    className="grid items-end gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`n-${m.id}`}>Nume complet</Label>
                      <Input
                        id={`n-${m.id}`}
                        value={m.name}
                        placeholder="ex. Andrei Popescu"
                        onChange={(e) => setMember(m.id, { name: e.target.value })}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <SelectField
                      label="Rol"
                      value={m.role}
                      options={ROLES}
                      onChange={(v) => setMember(m.id, { role: v })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Elimină ${m.name || "membrul"}`}
                      onClick={() =>
                        setD({ ...d, members: d.members.filter((x) => x.id !== m.id) })
                      }
                    >
                      <Trash2 />
                    </Button>
                    <p className="text-xs text-muted-foreground sm:col-span-3">
                      Contribuție estimată: {ron(m.contribution)}/lună. O poți modifica sau confirma
                      ulterior în planul familiei.
                    </p>
                  </div>
                ))}
                {d.members.length === 0 && (
                  <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    Poți construi planul singur sau poți adăuga ulterior alți membri ai familiei.
                  </p>
                )}
                <Button variant="outline" onClick={addMember}>
                  <Plus /> Adaugă un membru al familiei
                </Button>
              </div>
              <div className="rounded-2xl bg-primary-soft p-5">
                <Label htmlFor="ucontrib" className="text-base font-semibold">
                  Cât ai putea contribui confortabil dacă ar fi nevoie?
                </Label>
                <p className="mt-2 font-display text-3xl font-semibold text-primary">
                  <AnimatedNumber value={d.userContribution} />
                  /lună
                </p>
                <AmountSlider
                  id="ucontrib"
                  className="mt-4"
                  limit={d.user.income}
                  value={d.userContribution}
                  onChange={(v) => setD({ ...d, userContribution: v })}
                  label="Contribuția ta lunară"
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  Aceasta nu este o promisiune. Ne ajută doar să simulăm capacitatea familiei.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold md:text-4xl">
                Hai să privim câțiva ani înainte
              </h1>
              <p className="text-muted-foreground">Ce orizont de timp vrei să explorăm?</p>
              <CareTimingInput
                careStartDate={d.careStartDate}
                yearsUntil={d.yearsUntil}
                presets={[5, 10, 15]}
                onChange={(timing) => setD({ ...d, ...timing })}
              />
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => (step === 1 ? navigate({ to: "/" }) : setStep(step - 1))}
            >
              <ArrowLeft /> Înapoi
            </Button>
            {step < 4 ? (
              <Button size="lg" disabled={step === 1 && !p.name.trim()} onClick={() => setStep(step + 1)}>
                Continuă <ArrowRight />
              </Button>
            ) : (
              <Button size="lg" onClick={finish}>
                Vezi viitorul financiar al familiei <ArrowRight />
              </Button>
            )}
          </div>
        </div>
        <PrivacyNote className="mt-6 justify-center" />
      </main>
    </div>
  );
}
