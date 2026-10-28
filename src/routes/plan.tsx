import { CareDateInput, PlanningAssumptions } from "@/components/app/PlanningAssumptions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, HandCoins, Home, PiggyBank, UserRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app/AppShell";
import {
  AnimatedNumber,
  DemoBadge,
  ExplainButton,
  GapBar,
  InfoTip,
  Metric,
  PageHeader,
  PrivacyNote,
} from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { computePlan, formatNumber, genitive, ron, SCENARIOS, type Intensity } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Planul familiei tale — Prototype123" },
      {
        name: "description",
        content:
          "Cronologia posibilelor nevoi de îngrijire, costurile estimate și diferența de acoperit de familie.",
      },
      { property: "og:title", content: "Planul familiei tale — Prototype123" },
      {
        property: "og:description",
        content: "Vezi cât ar putea costa îngrijirea și cât rămâne de acoperit de familie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const INDEP_LABEL = {
  independent: "Independent(ă)",
  occasional: "Ajutor ocazional",
  regular: "Ajutor regulat",
};

function Dashboard() {
  const t = useT();
  const locale = useLanguage();
  const s = usePlan();
  const c = computePlan(s);
  const p = s.parent;
  const visible = SCENARIOS;
  const chartData = visible.map((sc) => {
    const x = computePlan(s, sc.id);
    return {
      name: `${sc.short} · ${c.scenarioAge} ani`,
      Părinte: x.parentCovered,
      Familie: x.familyFundingGap,
    };
  });
  const select = (id: Intensity) => setPlan({ scenario: id });
  const sel = SCENARIOS.find((x) => x.id === s.scenario)!;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Planul familiei tale"
        title={`Planul ${genitive(p.name)}`}
        subtitle={`Începere: ${c.fundingStartLabel}. Durată analizată: ${c.careDurationMonths} luni. Aceasta este o estimare, nu o predicție.`}
        right={<DemoBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Părinte" icon={<UserRound className="size-3.5" />}>
          {p.name}, {p.age}
        </Metric>
        <Metric label="Începere îngrijire" icon={<CalendarDays className="size-3.5" />}>
          {c.fundingStartLabel}
        </Metric>
        <Metric
          label="Posibilă diferență lunară"
          icon={<HandCoins className="size-3.5" />}
          hint={
            <ExplainButton
              title="Diferența lunară"
              lines={[
                { label: "Necesar total inițial", value: ron(c.totalMonthlyNeed) },
                { label: `Contribuția ${genitive(p.name)}`, value: ron(c.parentCovered), op: "−" },
                { label: "Diferență de acoperit", value: ron(c.familyFundingGap), op: "=" },
              ]}
            />
          }
        >
          <span className="text-care">
            <AnimatedNumber value={c.familyFundingGap} />
          </span>
        </Metric>
        <Metric
          label="Fond planificat"
          icon={<PiggyBank className="size-3.5" />}
          hint={
            <ExplainButton
              title="Fondul pentru îngrijire"
              lines={[
                { label: "Economisești lunar", value: ron(s.monthlySaving) },
                { label: "Luni până la scenariu", value: String(c.monthsUntilScenario), op: "×" },
                { label: "Fond estimat", value: ron(c.futureCareReserve), op: "=" },
              ]}
              note="Nu presupunem randamente din investiții."
            />
          }
        >
          <AnimatedNumber value={c.futureCareReserve} />
        </Metric>
      </div>

      {/* Today */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Astăzi</h2>
            <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
              {INDEP_LABEL[p.independence]}
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Vârstă</dt>
              <dd className="font-display text-2xl font-semibold">{p.age}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pensie + venituri</dt>
              <dd className="font-display text-2xl font-semibold tabular">
                {formatNumber(c.currentMonthlyIncome)}
                <span className="text-sm font-normal text-muted-foreground"> RON/lună</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Disponibil după cheltuieli</dt>
              <dd className="font-display text-2xl font-semibold tabular">
                {formatNumber(c.parentAvailableIncome)}
                <span className="text-sm font-normal text-muted-foreground"> RON/lună</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Deficit cheltuieli curente</dt>
              <dd className="font-display text-2xl font-semibold">
                {formatNumber(c.currentFamilyNeed)}{" "}
                <span className="text-sm font-normal text-muted-foreground">RON/lună</span>
              </dd>
            </div>
          </dl>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Grad de pregătire</h2>
            <InfoTip>
              Proporția costurilor acoperită de veniturile părintelui, economiile finite,
              contribuțiile familiei și fondul acumulat, pe întreaga durată analizată. Nu este un
              scor financiar oficial.
            </InfoTip>
          </div>
          <p className="mt-2 font-display text-5xl font-semibold text-primary">
            <AnimatedNumber value={c.readiness} suffix="%" />
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${c.readiness}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Indicator Prototype123 · scenariul „{sel.label}”
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="mt-10">
        <h2 className="text-3xl font-semibold">Ce tip de sprijin vrei să analizezi?</h2>
        <p className="mt-2 text-muted-foreground">
          Compară alternativele la aceeași dată aleasă de tine.
        </p>
        <div className="mt-4 max-w-2xl">
          <CareDateInput />
        </div>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <li className="card-surface relative p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-success">
              Acum · {p.age} ani
            </p>
            <p className="mt-2 font-display text-xl font-semibold">{INDEP_LABEL[p.independence]}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Cheltuieli esențiale: {ron(p.expenses)}/lună
            </p>
            <p className="text-sm text-muted-foreground">
              Deficit curent: {ron(c.currentFamilyNeed)}/lună
            </p>
            <Home className="absolute right-5 top-5 size-5 text-success" aria-hidden />
          </li>
          {SCENARIOS.map((sc, i) => {
            const x = computePlan(s, sc.id);
            const active = s.scenario === sc.id;
            return (
              <li key={sc.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => select(sc.id)}
                  className={cn(
                    "card-surface h-full w-full p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift",
                    active && "ring-2 ring-care",
                  )}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-care">
                    Scenariul {i + 1} · {c.scenarioAge} ani
                  </p>
                  <p className="mt-2 font-display text-xl font-semibold">„{sc.label}”</p>
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {sc.supports.slice(0, 3).map((t) => (
                      <li key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                        {t}
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Necesar total</dt>
                      <dd className="tabular font-semibold">{ron(x.totalMonthlyNeed)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">De la {p.name}</dt>
                      <dd className="tabular font-semibold">{ron(x.parentCovered)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <GapBar compact cost={x.totalMonthlyNeed} parent={x.parentCovered} />
                  </div>
                  <p className="mt-3 text-sm">
                    Diferență:{" "}
                    <strong className="tabular text-care">{ron(x.familyFundingGap)}/lună</strong>
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Key gap visualization */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card-surface p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl font-semibold">De unde vin banii?</h2>
            <span className="text-sm text-muted-foreground">
              {sel.label} · ~{c.scenarioAge} ani
            </span>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-2 text-center md:gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Necesar total</p>
              <p className="font-display text-2xl font-semibold md:text-3xl">
                <AnimatedNumber value={c.totalMonthlyNeed} suffix="" />
              </p>
            </div>
            <span className="pb-1 text-2xl text-muted-foreground">−</span>
            <div>
              <p className="text-xs text-muted-foreground">Venit disponibil {p.name}</p>
              <p className="font-display text-2xl font-semibold text-primary md:text-3xl">
                <AnimatedNumber value={c.parentCovered} suffix="" />
              </p>
            </div>
            <span className="pb-1 text-2xl text-muted-foreground">=</span>
            <div>
              <p className="text-xs text-muted-foreground">Diferență</p>
              <p className="font-display text-2xl font-semibold text-care md:text-3xl">
                <AnimatedNumber value={c.familyFundingGap} suffix="" />
              </p>
            </div>
          </div>
          <div className="mt-6">
            <GapBar cost={c.totalMonthlyNeed} parent={c.parentCovered} />
          </div>
          {c.familyFundingGap > 0 ? (
            <div className="mt-6 rounded-2xl bg-care-soft p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-care">
                Diferența de acoperit de familie
              </p>
              <p className="font-display text-5xl font-semibold">
                <AnimatedNumber value={c.familyFundingGap} />
                <span className="text-lg font-normal text-muted-foreground">/lună</span>
              </p>
              <p className="mt-2 text-sm">
                La data estimată de începere, familia ar avea de acoperit aproximativ{" "}
                {ron(c.familyFundingGap)} în prima lună. Vezi proiecția pentru evoluția ulterioară.
              </p>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-success-soft p-5 text-sm font-medium">
              La începutul scenariului, resursele estimate ale părintelui acoperă costul. Vezi
              proiecția pentru lunile următoare.
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <ExplainButton
              title="Diferența de acoperit"
              lines={[
                { label: "Necesar total inițial", value: ron(c.totalMonthlyNeed) },
                {
                  label: `Contribuția disponibilă a ${genitive(p.name)}`,
                  value: ron(c.parentCovered),
                  op: "−",
                },
                {
                  label: "Diferența estimată pentru familie",
                  value: ron(c.familyFundingGap),
                  op: "=",
                },
              ]}
              note={`Necesarul total include costul îngrijirii și orice deficit pentru cheltuielile esențiale rămase. Venit proiectat (${ron(c.parentMonthlyIncome)}) − cheltuieli rămase după înlocuire și creștere (${ron(c.projectedEssentialExpenses)}), plus economii opționale până la epuizare; contribuția este limitată la costul îngrijirii.`}
            />
            <Button asChild variant="care">
              <Link to="/familie">
                Construiește un plan pentru această diferență <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <div className="card-surface p-6">
          <h3 className="text-xl font-semibold">Cost vs. resurse, pe scenarii</h3>
          <p className="text-sm text-muted-foreground">
            Partea părintelui și diferența de acoperit, RON/lună.
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(v: number) => ron(v)} contentStyle={{ borderRadius: 12 }} />
                <Bar name={t("Părinte")} dataKey="Părinte" stackId="a" fill="var(--primary)" />
                <Bar name={t("Familie")} dataKey="Familie" stackId="a" fill="var(--care)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link to="/scenarii">Ce se întâmplă dacă...?</Link>
          </Button>
        </div>
      </section>
      <PlanningAssumptions />
      <PrivacyNote className="mt-10" />
    </AppShell>
  );
}
