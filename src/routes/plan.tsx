import { t, useLanguage, displayName } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, HandCoins, Home, PiggyBank, UserRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { AnimatedNumber, DemoBadge, ExplainButton, GapBar, InfoTip, Metric, PageHeader, PrivacyNote } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { computePlan, formatNumber, genitive, ron, SCENARIOS, type Intensity } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Planul familiei tale — Prototype123" },
      { name: "description", content: "Cronologia posibilelor nevoi de îngrijire, costurile estimate și diferența de acoperit de familie." },
      { property: "og:title", content: "Planul familiei tale — Prototype123" },
      { property: "og:description", content: "Vezi cât ar putea costa îngrijirea și cât rămâne de acoperit de familie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const INDEP_LABEL = { independent: "Independent(ă)", occasional: "Ajutor ocazional", regular: "Ajutor regulat" };

function Dashboard() {
  useLanguage();
  const s = usePlan();
  const c = computePlan(s);
  const p = s.parent;
  const visible = SCENARIOS.filter((sc) => sc.yearsFromNow <= Math.max(s.horizon, 10) || sc.id === "residential");
  const chartData = visible.map((sc) => {
    const x = computePlan(s, sc.id);
    return { name: `${sc.short} · ${p.age + sc.yearsFromNow} ani`, Părinte: x.parentCovered, Familie: x.familyFundingGap };
  });
  const select = (id: Intensity, years: number) => setPlan({ scenario: id, yearsUntil: years });
  const sel = SCENARIOS.find((x) => x.id === s.scenario)!;

  return (
    <AppShell>
      <PageHeader eyebrow={t("Planul familiei tale")} title={t(`Planul ${displayName(p.name)}`)}
        subtitle={t(`O privire asupra posibilelor nevoi financiare în următorii ${s.horizon} ani. Aceasta este o estimare, nu o predicție.`)} right={<DemoBadge />} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={t("Părinte")} icon={<UserRound className="size-3.5" />}>{p.name}, {p.age}</Metric>
        <Metric label={t("Orizont analizat")} icon={<CalendarDays className="size-3.5" />}>{s.horizon}{t(" ani")}</Metric>
        <Metric label={t("Posibilă diferență lunară")} icon={<HandCoins className="size-3.5" />} hint={<ExplainButton title={t("Diferența lunară")} lines={[{ label: t("Cost estimat îngrijire"), value: ron(c.careMonthlyCost) }, { label: t(`Contribuția ${displayName(p.name)}`), value: ron(c.parentCovered), op: "−" }, { label: t("Diferență de acoperit"), value: ron(c.familyFundingGap), op: "=" }]} />}>
          <span className="text-care"><AnimatedNumber value={c.familyFundingGap} /></span>
        </Metric>
        <Metric label={t("Fond planificat")} icon={<PiggyBank className="size-3.5" />} hint={<ExplainButton title={t("Fondul pentru îngrijire")} lines={[{ label: t("Economisești lunar"), value: ron(s.monthlySaving) }, { label: t("Luni până la scenariu"), value: String(c.monthsUntilScenario), op: "×" }, { label: t("Fond estimat"), value: ron(c.futureCareReserve), op: "=" }]} note={t("Nu presupunem randamente din investiții.")} />}>
          <AnimatedNumber value={c.futureCareReserve} />
        </Metric>
      </div>

      {/* Today */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card-surface p-6">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">{t("Astăzi")}</h2><span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">{t(INDEP_LABEL[p.independence])}</span></div>
          <dl className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">{t("Vârstă")}</dt><dd className="font-display text-2xl font-semibold">{p.age}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t("Pensie + venituri")}</dt><dd className="font-display text-2xl font-semibold tabular">{formatNumber(p.pension + p.otherIncome)}<span className="text-sm font-normal text-muted-foreground">{t(" RON/lună")}</span></dd></div>
            <div><dt className="text-xs text-muted-foreground">{t("Disponibil după cheltuieli")}</dt><dd className="font-display text-2xl font-semibold tabular">{formatNumber(c.parentAvailableIncome)}<span className="text-sm font-normal text-muted-foreground">{t(" RON/lună")}</span></dd></div>
            <div><dt className="text-xs text-muted-foreground">{t("Contribuția familiei necesară")}</dt><dd className="font-display text-2xl font-semibold">0 <span className="text-sm font-normal text-muted-foreground">{t("RON/lună")}</span></dd></div>
          </dl>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{t("Grad de pregătire")}</h2><InfoTip>{t("Un indicator intern care arată cât din scenariul selectat este acoperit de planul actual (resursele părintelui + contribuțiile lunare ale familiei), raportat la costul estimat. Nu este un scor financiar oficial.")}</InfoTip></div>
          <p className="mt-2 font-display text-5xl font-semibold text-primary"><AnimatedNumber value={c.readiness} suffix="%" /></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${c.readiness}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">{t("Indicator Prototype123 · scenariul „")}{t(sel.label)}”</p>
        </div>
      </section>

      {/* Timeline */}
      <section className="mt-10">
        <h2 className="text-3xl font-semibold">{t("Cum ar putea evolua situația?")}</h2>
        <p className="mt-2 text-muted-foreground">{t("Alege un scenariu pentru a vedea de unde ar veni banii.")}</p>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          <li className="card-surface relative p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-success">{t("Acum · ")}{p.age}{t(" ani")}</p>
            <p className="mt-2 font-display text-xl font-semibold">{t(INDEP_LABEL[p.independence])}</p>
            <p className="mt-3 text-sm text-muted-foreground">{t("Cost suplimentar: 0 RON")}</p>
            <p className="text-sm text-muted-foreground">{t("Diferență: 0 RON")}</p>
            <Home className="absolute right-5 top-5 size-5 text-success" aria-hidden />
          </li>
          {SCENARIOS.filter((x) => x.id !== "frequent").map((sc, i) => {
            const x = computePlan({ ...s, yearsUntil: sc.yearsFromNow }, sc.id);
            const active = s.scenario === sc.id;
            return (
              <li key={sc.id}>
                <button type="button" aria-pressed={active} onClick={() => select(sc.id, sc.yearsFromNow)}
                  className={cn("card-surface h-full w-full p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift", active && "ring-2 ring-care")}>
                  <p className="text-xs font-bold uppercase tracking-wider text-care">{t("Scenariul ")}{i + 1} · {p.age + sc.yearsFromNow}{t(" ani")}</p>
                  <p className="mt-2 font-display text-xl font-semibold">„{t(sc.label)}”</p>
                  <ul className="mt-2 flex flex-wrap gap-1">{sc.supports.slice(0, 3).map((t) => <li key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{t(t)}</li>)}</ul>
                  <dl className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-muted-foreground">{t("Cost estimat")}</dt><dd className="tabular font-semibold">{ron(x.careMonthlyCost)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">{t("De la ")}{p.name}</dt><dd className="tabular font-semibold">{ron(x.parentCovered)}</dd></div>
                  </dl>
                  <div className="mt-3"><GapBar compact cost={x.careMonthlyCost} parent={x.parentCovered} /></div>
                  <p className="mt-3 text-sm">{t("Diferență: ")}<strong className="tabular text-care">{ron(x.familyFundingGap)}{t("/lună")}</strong></p>
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
            <h2 className="text-3xl font-semibold">{t("De unde vin banii?")}</h2>
            <span className="text-sm text-muted-foreground">{t(sel.label)} · ~{c.scenarioAge}{t(" ani")}</span>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-2 text-center md:gap-4">
            <div><p className="text-xs text-muted-foreground">{t("Cost estimat")}</p><p className="font-display text-2xl font-semibold md:text-3xl"><AnimatedNumber value={c.careMonthlyCost} suffix="" /></p></div>
            <span className="pb-1 text-2xl text-muted-foreground">−</span>
            <div><p className="text-xs text-muted-foreground">{t("Venit disponibil ")}{p.name}</p><p className="font-display text-2xl font-semibold text-primary md:text-3xl"><AnimatedNumber value={c.parentCovered} suffix="" /></p></div>
            <span className="pb-1 text-2xl text-muted-foreground">=</span>
            <div><p className="text-xs text-muted-foreground">{t("Diferență")}</p><p className="font-display text-2xl font-semibold text-care md:text-3xl"><AnimatedNumber value={c.familyFundingGap} suffix="" /></p></div>
          </div>
          <div className="mt-6"><GapBar cost={c.careMonthlyCost} parent={c.parentCovered} /></div>
          {c.familyFundingGap > 0 ? (
            <div className="mt-6 rounded-2xl bg-care-soft p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-care">{t("Diferența de acoperit de familie")}</p>
              <p className="font-display text-5xl font-semibold"><AnimatedNumber value={c.familyFundingGap} /><span className="text-lg font-normal text-muted-foreground">{t("/lună")}</span></p>
              <p className="mt-2 text-sm">{t("Dacă ")}{p.name}{t(" ar avea nevoie de acest nivel de ajutor astăzi, familia ar trebui să acopere aproximativ ")}{ron(c.familyFundingGap)}{t(" în fiecare lună.")}</p>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-success-soft p-5 text-sm font-medium">{t("În acest scenariu, resursele estimate ale părintelui acoperă costul.")}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <ExplainButton title={t("Diferența de acoperit")} lines={[{ label: t("Cost estimat îngrijire"), value: ron(c.careMonthlyCost) }, { label: t(`Contribuția disponibilă a ${displayName(p.name)}`), value: ron(c.parentCovered), op: "−" }, { label: t("Diferența estimată pentru familie"), value: ron(c.familyFundingGap), op: "=" }]}
              note={t(`Contribuția părintelui = venit (${ron(c.parentMonthlyIncome)}) − cheltuieli esențiale (${ron(p.expenses)}) + cheltuieli preluate de serviciul de îngrijire (${ron(sel.expensesReplaced)}).`)} />
            <Button asChild variant="care"><Link to="/familie">{t("Construiește un plan pentru această diferență ")}<ArrowRight /></Link></Button>
          </div>
        </div>
        <div className="card-surface p-6">
          <h3 className="text-xl font-semibold">{t("Cost vs. resurse, pe scenarii")}</h3>
          <p className="text-sm text-muted-foreground">{t("Partea părintelui și diferența de acoperit, RON/lună.")}</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(v: number) => ron(v)} contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="Părinte" stackId="a" fill="var(--primary)" />
                <Bar dataKey="Familie" stackId="a" fill="var(--care)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Button asChild variant="outline" className="mt-2 w-full"><Link to="/scenarii">{t("Ce se întâmplă dacă...?")}</Link></Button>
        </div>
      </section>
      <PrivacyNote className="mt-10" />
    </AppShell>
  );
}
