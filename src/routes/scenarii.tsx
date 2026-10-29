import { useT } from "@/lib/i18n";
import { CareDateInput, PlanningAssumptions } from "@/components/app/PlanningAssumptions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Hourglass, Sprout } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app/AppShell";
import {
  AnimatedNumber,
  DemoBadge,
  ExplainButton,
  GapBar,
  PageHeader, gapLines } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { breakdownOf, computePlan, formatNumber, genitive, PLAN_ASSUMPTIONS, ron, SCENARIOS } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scenarii")({
  head: () => ({
    meta: [
      { title: "Ce se întâmplă dacă...? Simulator de scenarii — WeCare" },
      {
        name: "description",
        content:
          "Modifică momentul, intensitatea și costul îngrijirii și vezi instant cum se schimbă diferența pentru familie.",
      },
      { property: "og:title", content: "Simulator de scenarii de îngrijire — WeCare" },
      {
        property: "og:description",
        content:
          "Mai devreme înseamnă mai ușor: compară începerea economisirii azi vs. peste 5 ani.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Scenarios,
});

function Scenarios() {
  const t = useT();
  const s = usePlan();
  const c = computePlan(s);
  const p = s.parent;
  const income = c.parentMonthlyIncome;
  const early = c.earlySaving;
  const target = early.target;
  const later = early.later;
  const years = c.yearsUntilScenario;
  const updateCost = (value: number) => {
    const total = Math.max(0, Math.round(value));
    const custom = s.costBreakdown?.[s.scenario];
    if (!custom) { setPlan({ costs: { ...s.costs, [s.scenario]: total } }); return; }
    const slices = breakdownOf(s, s.scenario);
    const oldTotal = slices.reduce((sum, slice) => sum + slice.amount, 0);
    let allocated = 0;
    const next = slices.map((slice, index) => {
      const amount = index === slices.length - 1 ? total - allocated : Math.min(total - allocated, Math.round(oldTotal > 0 ? slice.amount * total / oldTotal : total / slices.length));
      allocated += amount;
      return { ...slice, amount };
    });
    setPlan({ costs: { ...s.costs, [s.scenario]: total }, costBreakdown: { ...s.costBreakdown, [s.scenario]: next } });
  };
  const chart = early.growth.map((row) => ({
    an: `${row.years} ani`,
    "Începi azi": row.now,
    "Începi peste 5 ani": row.later,
  }));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Simulator"
        title="Ce se întâmplă dacă...?"
        subtitle="Schimbă orice ipoteză. Totul se recalculează instant."
        right={<DemoBadge />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card-surface space-y-7 p-6">
          <CareDateInput />
          <p className="text-xs text-muted-foreground">
            {p.name} ar avea aproximativ {c.scenarioAge} ani · {c.monthsUntilScenario} luni până la
            începere.
          </p>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">{t("Intensitatea îngrijirii")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  aria-pressed={s.scenario === sc.id}
                  onClick={() => setPlan({ scenario: sc.id })}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left text-sm font-semibold transition-all",
                    s.scenario === sc.id ? "border-care bg-care-soft" : "hover:border-care/40",
                  )}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cost" className="font-semibold">
                Cost lunar de bază (înainte de creștere)
              </Label>
              <span className="tabular font-semibold">{ron(s.costs[s.scenario])}</span>
            </div>
            <Input
              className="mt-3"
              aria-label="Cost lunar de bază personalizat"
              type="number"
              min={0}
              value={s.costs[s.scenario]}
              onChange={(e) =>
                updateCost(Number(e.target.value) || 0)
              }
            />
            <Slider
              id="cost"
              className="mt-3"
              min={0}
              max={Math.max(10000, s.costs[s.scenario])}
              step={100}
              value={[s.costs[s.scenario]]}
              onValueChange={([v = 0]) => updateCost(v)}
              aria-label="Cost lunar estimat"
            />
            <button
              className="mt-2 text-xs font-semibold text-primary hover:underline"
              onClick={() =>
                (() => {
                  const costBreakdown = { ...s.costBreakdown };
                  delete costBreakdown[s.scenario];
                  setPlan({ costBreakdown, costs: { ...s.costs, [s.scenario]: PLAN_ASSUMPTIONS.costs[s.scenario] } });
                })()
              }
            >
              Revino la estimarea implicită ({ron(PLAN_ASSUMPTIONS.costs[s.scenario])})
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fi">Venitul părintelui atunci</Label>
              <Input
                id="fi"
                type="number"
                min={0}
                value={income}
                onChange={(e) =>
                  setPlan({ futureIncome: Math.max(0, Number(e.target.value) || 0) })
                }
                className="h-11 rounded-xl tabular"
              />
              <button
                className="text-xs text-primary underline"
                onClick={() => setPlan({ futureIncome: null })}
              >
                Folosește venitul actual și rata de creștere
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps">Economiile părintelui</Label>
              <Input
                id="ps"
                type="number"
                min={0}
                value={p.savings}
                onChange={(e) =>
                  setPlan({ parent: { ...p, savings: Math.max(0, Number(e.target.value) || 0) } })
                }
                className="h-11 rounded-xl tabular"
              />
            </div>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border p-4 text-sm">
            <span>
              <strong>Folosește economiile părintelui</strong>
              <br />
              <span className="text-muted-foreground">
                Împărțite pe {s.savingsSpreadMonths} de luni (≈ {ron(c.parentSavingsMonthlyBudget)}
                /lună)
              </span>
            </span>
            <Switch
              checked={s.useSavings}
              onCheckedChange={(v) => setPlan({ useSavings: v })}
              aria-label="Folosește economiile părintelui"
            />
          </label>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
          <div className="card-surface p-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Necesar total</p>
                <p className="font-display text-2xl font-semibold">
                  <AnimatedNumber value={c.totalMonthlyNeed} suffix="" />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Acoperă {p.name}</p>
                <p className="font-display text-2xl font-semibold text-primary">
                  <AnimatedNumber value={c.parentCovered} suffix="" />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferență</p>
                <p className="font-display text-2xl font-semibold text-care">
                  <AnimatedNumber value={c.familyFundingGap} suffix="" />
                </p>
              </div>
            </div>
            <div className="mt-5">
              <GapBar cost={c.totalMonthlyNeed} parent={c.parentCovered} />
            </div>
            {c.familyFundingGap === 0 && (
              <p className="mt-4 rounded-xl bg-success-soft p-3 text-sm">
                La începutul scenariului, resursele estimate ale părintelui acoperă costul. Vezi
                proiecția pentru lunile următoare.
              </p>
            )}
            <div className="mt-4">
              <ExplainButton
                title="Diferența în acest scenariu"
                lines={gapLines(s, c)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pe persoană (împărțit egal)
              </p>
              <p className="mt-1 font-display text-3xl font-semibold">
                <AnimatedNumber value={c.perPersonShare} />
              </p>
              <p className="text-xs text-muted-foreground">
                între {c.familyAllocations.length} persoane; împărțire ipotetică egală
              </p>
            </div>
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Economisești de azi
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-primary">
                {c.savingNeededToday === null ? (
                  "Necesar acum"
                ) : (
                  <AnimatedNumber value={c.savingNeededToday} />
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.savingNeededToday === null
                  ? `Fond necesar acum: ${ron(c.targetReserve)}`
                  : `pe lună, pentru primele ${c.targetMonths} luni din diferența proiectată`}
              </p>
              <div className="mt-1">
                <ExplainButton
                  title="Cât să economisești de azi"
                  lines={[
                    {
                      label: "Total diferențe lunare proiectate (maximum 24 luni)",
                      value: ron(c.targetReserve),
                    },
                    {
                      label: "Luni până la scenariu",
                      value: String(c.monthsUntilScenario),
                      op: "÷",
                    },
                    {
                      label: "Economisire lunară",
                      value:
                        c.savingNeededToday === null
                          ? "Nu există timp de acumulare"
                          : ron(c.savingNeededToday),
                      op: "=",
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlanningAssumptions editable showTiming={false} />

      {/* Start now vs wait */}
      <section className="mt-14">
        <h2 className="text-4xl font-semibold">Mai devreme înseamnă mai ușor</h2>
        <p className="mt-2 text-muted-foreground">
          {target > 0
            ? `Ca să strângeți din timp partea familiei, ${ron(target)} (diferențele lunare pe toată durata îngrijirii), până începe îngrijirea.`
            : `Pensia și economiile ${genitive(p.name)} acoperă costul în acest scenariu; familia nu are de strâns bani.`}
        </p>
        <div className="mt-6 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="card-surface border-primary/30 p-6 ring-2 ring-primary/20">
            <Sprout className="size-6 text-primary" />
            <h3 className="mt-3 text-2xl font-semibold">Începi astăzi</h3>
            <p className="mt-4 font-display text-5xl font-semibold text-primary">
              {early.now === null ? "—" : formatNumber(early.now)}
              <span className="text-lg font-normal text-muted-foreground"> RON/lună</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {early.now === null ? "Îngrijirea începe acum: nu mai e timp de strâns dinainte." : `${c.monthsUntilScenario} luni · strângi ${ron(target)}`}
            </p>
          </div>
          <div className="grid place-items-center font-display text-xl italic text-muted-foreground">
            vs.
          </div>
          <div className="card-surface p-6">
            <Hourglass className="size-6 text-care" />
            <h3 className="mt-3 text-2xl font-semibold">Începi peste 5 ani</h3>
            {later !== null ? (
              <>
                <p className="mt-4 font-display text-5xl font-semibold text-care">
                  {formatNumber(later)}
                  <span className="text-lg font-normal text-muted-foreground"> RON/lună</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {c.monthsUntilScenario - 60} luni · pentru aceiași {ron(target)}
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Scenariul începe în cel mult 5 ani — amânarea nu ar mai lăsa timp de economisire.
              </p>
            )}
          </div>
        </div>
        <p className="mt-6 rounded-2xl bg-primary-soft p-5 text-center font-display text-xl">
          Pregătirea din timp poate transforma o cheltuială dificilă într-un efort lunar
          gestionabil.
        </p>
        {years > 0 && (
          <div className="card-surface mt-6 h-72 p-4">
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ left: 0, right: 10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="an" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(v: number) => ron(v)} contentStyle={{ borderRadius: 12 }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Începi azi"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Începi peste 5 ani"
                  stroke="var(--care)"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-8 flex justify-end">
          <Button asChild size="lg">
            <Link to="/familie">
              Cum acoperim diferența? <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
