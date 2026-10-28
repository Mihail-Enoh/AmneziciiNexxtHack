import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Hourglass, Sprout } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { AnimatedNumber, DemoBadge, ExplainButton, GapBar, PageHeader } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { computePlan, formatNumber, genitive, PLAN_ASSUMPTIONS, requiredMonthlySaving, ron, SCENARIOS } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scenarii")({
  head: () => ({
    meta: [
      { title: "Ce se întâmplă dacă...? Simulator de scenarii — Prototype123" },
      { name: "description", content: "Modifică momentul, intensitatea și costul îngrijirii și vezi instant cum se schimbă diferența pentru familie." },
      { property: "og:title", content: "Simulator de scenarii de îngrijire — Prototype123" },
      { property: "og:description", content: "Mai devreme înseamnă mai ușor: compară începerea economisirii azi vs. peste 5 ani." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Scenarios,
});

function Scenarios() {
  const s = usePlan();
  const c = computePlan(s);
  const p = s.parent;
  const income = s.futureIncome ?? p.pension + p.otherIncome;
  const target = c.futureCareReserve;
  const later = requiredMonthlySaving(target, c.monthsUntilScenario, 60);
  const years = Math.round(s.yearsUntil);
  const chart = Array.from({ length: years + 1 }, (_, y) => ({
    an: `Anul ${y}`,
    "Începi azi": s.monthlySaving * 12 * y,
    "Începi peste 5 ani": later ? Math.max(0, later * 12 * (y - 5)) : 0,
  }));

  return (
    <AppShell>
      <PageHeader eyebrow="Simulator" title="Ce se întâmplă dacă...?" subtitle="Schimbă orice ipoteză. Totul se recalculează instant." right={<DemoBadge />} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card-surface space-y-7 p-6">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Îngrijirea începe peste</legend>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 10, 15].map((y) => (
                <button key={y} type="button" aria-pressed={s.yearsUntil === y} onClick={() => setPlan({ yearsUntil: y })}
                  className={cn("rounded-xl border-2 py-3 text-sm font-semibold transition-all", s.yearsUntil === y ? "border-primary bg-primary-soft text-primary" : "hover:border-primary/40")}>
                  {y} ani
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{p.name} ar avea aproximativ {p.age + s.yearsUntil} ani.</p>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Intensitatea îngrijirii</legend>
            <div className="grid grid-cols-2 gap-2">
              {SCENARIOS.map((sc) => (
                <button key={sc.id} type="button" aria-pressed={s.scenario === sc.id} onClick={() => setPlan({ scenario: sc.id })}
                  className={cn("rounded-xl border-2 p-3 text-left text-sm font-semibold transition-all", s.scenario === sc.id ? "border-care bg-care-soft" : "hover:border-care/40")}>
                  {sc.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="flex items-center justify-between"><Label htmlFor="cost" className="font-semibold">Cost lunar estimat</Label><span className="tabular font-semibold">{ron(c.careMonthlyCost)}</span></div>
            <Slider id="cost" className="mt-3" min={0} max={10000} step={100} value={[c.careMonthlyCost]} onValueChange={([v = 0]) => setPlan({ costs: { ...s.costs, [s.scenario]: v } })} aria-label="Cost lunar estimat" />
            <button className="mt-2 text-xs font-semibold text-primary hover:underline" onClick={() => setPlan({ costs: { ...s.costs, [s.scenario]: PLAN_ASSUMPTIONS.costs[s.scenario] } })}>Revino la estimarea implicită ({ron(PLAN_ASSUMPTIONS.costs[s.scenario])})</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fi">Venitul părintelui atunci</Label>
              <Input id="fi" type="number" min={0} value={income} onChange={(e) => setPlan({ futureIncome: Math.max(0, Number(e.target.value) || 0) })} className="h-11 rounded-xl tabular" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps">Economiile părintelui</Label>
              <Input id="ps" type="number" min={0} value={p.savings} onChange={(e) => setPlan({ parent: { ...p, savings: Math.max(0, Number(e.target.value) || 0) } })} className="h-11 rounded-xl tabular" />
            </div>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border p-4 text-sm">
            <span><strong>Folosește economiile părintelui</strong><br /><span className="text-muted-foreground">Împărțite pe {PLAN_ASSUMPTIONS.savingsSpreadMonths} de luni (≈ {ron(p.savings / PLAN_ASSUMPTIONS.savingsSpreadMonths)}/lună)</span></span>
            <Switch checked={s.useSavings} onCheckedChange={(v) => setPlan({ useSavings: v })} aria-label="Folosește economiile părintelui" />
          </label>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
          <div className="card-surface p-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-muted-foreground">Cost estimat</p><p className="font-display text-2xl font-semibold"><AnimatedNumber value={c.careMonthlyCost} suffix="" /></p></div>
              <div><p className="text-xs text-muted-foreground">Acoperă {p.name}</p><p className="font-display text-2xl font-semibold text-primary"><AnimatedNumber value={c.parentCovered} suffix="" /></p></div>
              <div><p className="text-xs text-muted-foreground">Diferență</p><p className="font-display text-2xl font-semibold text-care"><AnimatedNumber value={c.familyFundingGap} suffix="" /></p></div>
            </div>
            <div className="mt-5"><GapBar cost={c.careMonthlyCost} parent={c.parentCovered} /></div>
            {c.familyFundingGap === 0 && <p className="mt-4 rounded-xl bg-success-soft p-3 text-sm">În acest scenariu, resursele estimate ale părintelui acoperă costul.</p>}
            <div className="mt-4"><ExplainButton title="Diferența în acest scenariu" lines={[{ label: "Cost estimat", value: ron(c.careMonthlyCost) }, { label: `Resursele ${genitive(p.name)}`, value: ron(c.parentCovered), op: "−" }, { label: "Diferență", value: ron(c.familyFundingGap), op: "=" }]} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pe persoană (împărțit egal)</p>
              <p className="mt-1 font-display text-3xl font-semibold"><AnimatedNumber value={c.perPersonShare} /></p>
              <p className="text-xs text-muted-foreground">între tine și {s.members.filter((m) => m.financial === "da").length} {s.members.length === 1 ? "membru" : "membri"} ai familiei</p>
            </div>
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Economisești de azi</p>
              <p className="mt-1 font-display text-3xl font-semibold text-primary"><AnimatedNumber value={c.savingNeededToday} /></p>
              <p className="text-xs text-muted-foreground">pe lună, pentru {PLAN_ASSUMPTIONS.invitationTargetMonths} luni din diferența rămasă</p>
              <div className="mt-1"><ExplainButton title="Cât să economisești de azi" lines={[{ label: "Diferență rămasă după contribuții", value: ron(c.remainingGap) }, { label: "Luni de acoperit", value: String(PLAN_ASSUMPTIONS.invitationTargetMonths), op: "×" }, { label: "Fond țintă", value: ron(c.targetReserve), op: "=" }, { label: "Luni până la scenariu", value: String(c.monthsUntilScenario), op: "÷" }, { label: "Economisire lunară", value: ron(c.savingNeededToday), op: "=" }]} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Start now vs wait */}
      <section className="mt-14">
        <h2 className="text-4xl font-semibold">Mai devreme înseamnă mai ușor</h2>
        <p className="mt-2 text-muted-foreground">Pentru același fond de {ron(target)} până la momentul scenariului.</p>
        <div className="mt-6 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="card-surface border-primary/30 p-6 ring-2 ring-primary/20">
            <Sprout className="size-6 text-primary" />
            <h3 className="mt-3 text-2xl font-semibold">Începi astăzi</h3>
            <p className="mt-4 font-display text-5xl font-semibold text-primary">{formatNumber(s.monthlySaving)}<span className="text-lg font-normal text-muted-foreground"> RON/lună</span></p>
            <p className="mt-2 text-sm text-muted-foreground">{years} ani · fond {ron(target)} · acoperă ~{c.monthsOfGapCovered} luni din diferență</p>
          </div>
          <div className="grid place-items-center font-display text-xl italic text-muted-foreground">vs.</div>
          <div className="card-surface p-6">
            <Hourglass className="size-6 text-care" />
            <h3 className="mt-3 text-2xl font-semibold">Începi peste 5 ani</h3>
            {later ? (
              <>
                <p className="mt-4 font-display text-5xl font-semibold text-care">{formatNumber(later)}<span className="text-lg font-normal text-muted-foreground"> RON/lună</span></p>
                <p className="mt-2 text-sm text-muted-foreground">{Math.max(0, years - 5)} ani · pentru același fond de {ron(target)}</p>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Scenariul începe în mai puțin de 5 ani — amânarea nu ar mai lăsa timp de economisire.</p>
            )}
          </div>
        </div>
        <p className="mt-6 rounded-2xl bg-primary-soft p-5 text-center font-display text-xl">Pregătirea din timp poate transforma o cheltuială dificilă într-un efort lunar gestionabil.</p>
        {years > 0 && (
          <div className="card-surface mt-6 h-72 p-4">
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ left: 0, right: 10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="an" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(v: number) => ron(v)} contentStyle={{ borderRadius: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="Începi azi" stroke="var(--primary)" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="Începi peste 5 ani" stroke="var(--care)" strokeWidth={3} strokeDasharray="6 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-8 flex justify-end"><Button asChild size="lg"><Link to="/familie">Cum acoperim diferența? <ArrowRight /></Link></Button></div>
      </section>
    </AppShell>
  );
}
