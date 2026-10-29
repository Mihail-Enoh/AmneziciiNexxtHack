import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Area, AreaChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { forecast } from '@/lib/forecast';
import { readHealthSession } from '@/lib/health-files';
import type { DomainResult, QuizAnswers } from '@/lib/health';
import { fullName, type PlanState } from '@/lib/plan';

export interface ForecastHealth { domains?: DomainResult[] | null | undefined; answers?: QuizAnswers | null | undefined }

const yrs = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(n);
const years = (n: number) => `${yrs(n)} ${n === 1 ? 'an' : 'ani'}`;
const lei = (n: number) => `${new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)))} lei`;
const pct = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(n);

/** Hook: computes the forecast in the browser; reads the health session after hydration unless given. */
export function useForecast(plan: PlanState, health?: ForecastHealth) {
  const [stored, setStored] = useState<ForecastHealth | null>(null);
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    if (health) return;
    const s = readHealthSession(fullName(plan.parent, ''));
    setStored(s ? { domains: s.assessment?.domains ?? null, answers: s.answers } : null);
    setHasSession(!!s && (!!s.assessment || Object.keys(s.answers ?? {}).length > 0));
  }, [health, plan]);
  const src = health ?? stored;
  const f = useMemo(() => forecast(plan, { domains: src?.domains ?? null, answers: src?.answers ?? null }), [plan, src]);
  return { f, hasSession: health ? true : hasSession };
}

export function ForecastSection({ plan, health }: { plan: PlanState; health?: ForecastHealth }) {
  const { f, hasSession } = useForecast(plan, health);
  const { p50, low, high } = f.onset;
  const who = plan.parent.name.trim() || 'persoana';
  const chance = Math.round(f.onset.withinHorizon * 100);
  const data = f.chartYears.map(y => ({ year: y.year, pct: Math.round(y.cumulative * 1000) / 10 }));
  const lastYear = data.length ? data[data.length - 1]!.year : 10;
  const cards = [
    { value: f.atMedian.monthlyGapAtStart, label: 'diferența lunară când începe îngrijirea', note: `Cât costă îngrijirea pe lună, minus cât acoperă ${who} din pensie, venituri și economii, în prima lună de îngrijire.` },
    { value: f.atMedian.familyCost, label: `cost total pentru familie, dacă începe peste ${years(f.atMedian.year)}`, note: `Suma diferențelor lunare pe toată durata îngrijirii (${f.careDurationMonths} luni), dacă ajutorul zilnic începe în anul cel mai probabil.` },
    { value: f.expectedFamilyCost, label: 'cost mediu așteptat', note: `Ține cont că îngrijirea poate începe mai devreme, mai târziu sau deloc în următorii ${f.horizonYears} ani. De aceea e mai mic decât costul de alături.` },
  ];
  return <section className="mt-8 card-surface p-5 sm:p-6" aria-labelledby="forecast-title">
    <h2 id="forecast-title" className="text-2xl font-semibold">Ce ar putea însemna financiar</h2>
    <p className="mt-1 text-xs text-muted-foreground">{f.todaysPrices ? 'Sumele sunt în prețurile de azi.' : `Sumele includ creșterea costurilor de ${pct(plan.costGrowth)}%/an.`}</p>

    <h3 className="mt-6 text-lg font-semibold">Când ar putea fi nevoie de ajutor zilnic</h3>
    <p className="mt-1 text-sm">Cel mai probabil peste <strong>{years(p50)}</strong> (între {yrs(low)} și {yrs(high)} ani). Șansa să fie nevoie în următorii {f.horizonYears} ani: <strong>{chance}%</strong>.</p>
    <div className="mt-4 h-52 w-full" role="img" aria-label={`Șansa să fie nevoie de ajutor zilnic, an cu an; cel mai probabil peste ${yrs(p50)} ani`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
          <XAxis dataKey="year" type="number" domain={[1, lastYear]} ticks={data.map(d => d.year)} tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
          <ReferenceArea x1={Math.max(1, low)} x2={Math.min(lastYear, high)} fill="var(--primary)" fillOpacity={0.12} />
          <ReferenceLine x={p50} stroke="var(--primary)" strokeDasharray="4 3" label={{ value: 'cel mai probabil', position: 'top', fontSize: 11, fill: 'var(--primary)' }} />
          <Tooltip formatter={(v: number) => [`${pct(v)}%`, 'Șansa să fie nevoie până atunci']} labelFormatter={l => `Peste ${l} ani`} />
          <Area type="monotone" dataKey="pct" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">Linia arată șansa ca ajutorul zilnic să fie necesar până în anul respectiv. Zona colorată este intervalul cel mai probabil.</p>

    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {cards.map(c => <div key={c.label} className="rounded-lg border bg-background p-4"><p className="font-display text-2xl font-semibold tabular">{lei(c.value)}</p><p className="mt-1 text-sm font-medium">{c.label}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.note}</p></div>)}
    </div>

    <details className="group mt-3 rounded-lg border bg-background">
      <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-semibold">Ce înseamnă aceste cifre?<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
      <div className="space-y-3 border-t p-4 text-sm leading-relaxed text-muted-foreground">
        <p><strong className="text-foreground">{lei(f.atMedian.monthlyGapAtStart)} pe lună</strong> este diferența din prima lună de îngrijire: costul îngrijirii minus partea pe care o poate acoperi {who}. Restul rămâne de acoperit de familie.</p>
        <p><strong className="text-foreground">{lei(f.atMedian.familyCost)}</strong> este totalul acestor diferențe pe {f.careDurationMonths} luni de îngrijire, dacă ajutorul zilnic începe exact peste {years(f.atMedian.year)}, anul cel mai probabil. Este scenariul de referință, dar nu ține cont că s-ar putea să nu fie nevoie deloc.</p>
        <p><strong className="text-foreground">{lei(f.expectedFamilyCost)}</strong> este costul mediu așteptat. Pentru fiecare an în care ar putea începe îngrijirea, luăm costul din acel caz și îl înmulțim cu șansa să înceapă atunci. Există aproximativ {100 - chance}% șanse să nu fie nevoie de ajutor zilnic în următorii {f.horizonYears} ani; acele situații contează cu 0 lei. Este o medie utilă pentru planificare, nu suma pe care o vei plăti.</p>
      </div>
    </details>

    <p className="mt-5 rounded-lg bg-primary-soft p-4 text-sm font-medium">{f.saving.perMonth === null
      ? 'Începeți acum: nu mai este timp să strângeți toată partea familiei înainte.'
      : f.saving.reserveNeeded <= 0
        ? `Pensia, veniturile și economiile lui ${who} acoperă costul estimat. Familia nu are nevoie de bani puși deoparte pentru acest scenariu.`
        : `Ca să aveți din timp partea familiei (aprox. ${lei(f.saving.reserveNeeded)}), puneți deoparte aproximativ ${lei(f.saving.perMonth)}/lună în următorii ${years(Math.round(f.saving.months / 1.2) / 10)}.`}</p>

    <h3 className="mt-7 text-lg font-semibold">Obiceiuri care pot amâna nevoia de îngrijire</h3>
    {f.habits.length ? <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{f.habits.map(h => <article key={h.id} className="rounded-lg border bg-card p-4">
        <h4 className="font-semibold">{h.title}</h4>
        {h.deferredCost > 0 && <><p className="mt-2 font-display text-3xl font-semibold text-primary tabular">{lei(h.deferredCost)}</p><p className="text-xs text-muted-foreground">plăți amânate: {h.delayLabel} × {lei(h.costPerUnit)}/{h.unit === 'week' ? 'săptămână' : 'lună'}</p></>}
        <p className="mt-2 inline-block rounded-md bg-success-soft px-2 py-1 text-sm font-semibold text-success">+{h.delayLabel}{h.unit === 'month' && h.delay >= 12 ? ` (${years(h.delayYears)})` : ''} până la nevoia de ajutor</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.detail}</p>
      </article>)}</div>
      {f.habits.length > 2 && <p className="mt-3 text-sm text-muted-foreground">Fiecare card arată partea acelui obicei din amânarea totală; adunate, dau exact ultimul card.</p>}
      <p className="mt-1 text-sm text-muted-foreground">Discutați cu medicul de familie ce schimbări sunt potrivite.</p>
    </> : hasSession
      ? <p className="mt-2 text-sm text-muted-foreground">Obiceiurile actuale nu adaugă risc în calculul nostru.</p>
      : <p className="mt-2 text-sm text-muted-foreground">Completează chestionarul de sănătate ca să vezi ce obiceiuri pot amâna nevoia de îngrijire. <Link to="/sanatate" className="font-semibold text-primary underline underline-offset-4">Mergi la chestionar</Link></p>}

    <details className="group mt-6 rounded-lg border">
      <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold">Cum calculăm<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
      <dl className="divide-y border-t">{f.assumptions.map(a => <div key={a.label} className="grid gap-1 p-4 sm:grid-cols-[1fr_auto]"><dt className="text-sm font-medium">{a.label}</dt><dd className="text-sm font-semibold tabular">{a.value}</dd>{a.note && <p className="text-xs text-muted-foreground sm:col-span-2">{a.note}</p>}</div>)}</dl>
    </details>
    <p className="mt-4 text-xs text-muted-foreground">Estimări pentru planificare, nu sfat financiar sau medical.</p>
  </section>;
}
