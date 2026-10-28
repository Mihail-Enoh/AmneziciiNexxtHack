import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { forecast } from '@/lib/forecast';
import { readHealthSession } from '@/lib/health-files';
import type { QuizAnswers } from '@/lib/health';
import type { PlanState } from '@/lib/plan';

type Domains = Parameters<typeof forecast>[1] extends infer O ? O extends { domains?: infer D } ? D : never : never;
export interface ForecastHealth { domains?: Domains; answers?: QuizAnswers | null }

const yrs = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(n);
const lei = (n: number) => `${new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)))} lei`;
const pct = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 }).format(n);

/** Hook: computes the forecast in the browser; reads the health session after hydration unless given. */
export function useForecast(plan: PlanState, health?: ForecastHealth) {
  const [stored, setStored] = useState<ForecastHealth | null>(null);
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    if (health) return;
    const s = readHealthSession();
    setStored(s ? { domains: s.assessment?.domains, answers: s.answers } : null);
    setHasSession(!!s && (!!s.assessment || Object.keys(s.answers ?? {}).length > 0));
  }, [health, plan]);
  const src = health ?? stored;
  const f = useMemo(() => forecast(plan, { domains: src?.domains, answers: src?.answers }), [plan, src]);
  return { f, hasSession: health ? true : hasSession };
}

export function ForecastSection({ plan, health }: { plan: PlanState; health?: ForecastHealth }) {
  const { f, hasSession } = useForecast(plan, health);
  const { p50, low, high } = f.onset;
  const data = f.onset.years.map(y => ({ year: y.year, pct: Math.round(y.probability * 1000) / 10, hi: y.year >= Math.floor(low) && y.year <= Math.ceil(high) }));
  return <section className="mt-8 card-surface p-5 sm:p-6" aria-labelledby="forecast-title">
    <h2 id="forecast-title" className="text-2xl font-semibold">Ce ar putea însemna financiar</h2>
    <p className="mt-1 text-xs text-muted-foreground">Sumele sunt în lei de azi.</p>

    <h3 className="mt-6 text-lg font-semibold">Când ar putea fi nevoie de ajutor zilnic</h3>
    <p className="mt-1 text-sm">Cel mai probabil peste {yrs(p50)} ani (între {yrs(low)} și {yrs(high)} ani).</p>
    <div className="mt-4 h-48 w-full" role="img" aria-label={`Probabilitate pe ani; cel mai probabil peste ${yrs(p50)} ani`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip formatter={(v: number) => [`${pct(v)}%`, 'Probabilitate']} labelFormatter={l => `Anul ${l}`} />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
            {data.map(d => <Cell key={d.year} fill={d.hi ? 'var(--primary)' : 'var(--muted-foreground)'} fillOpacity={d.hi ? 1 : 0.3} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {[[f.atMedian.monthlyGapAtStart, 'diferența lunară la început'], [f.atMedian.familyCost, 'cost total pentru familie, dacă începe în anul cel mai probabil'], [f.expectedFamilyCost, `cost estimat în următorii ${f.horizonYears} ani`]].map(([v, l]) =>
        <div key={l as string} className="rounded-lg border bg-background p-4"><p className="font-display text-2xl font-semibold tabular">{lei(v as number)}</p><p className="mt-1 text-sm text-muted-foreground">{l}</p></div>)}
    </div>

    <p className="mt-5 rounded-lg bg-primary-soft p-4 text-sm font-medium">{f.saving.perMonth === null
      ? 'Începeți acum: nu mai este timp să strângeți întreaga rezervă.'
      : `Ca să ai rezerva de ${lei(f.saving.reserveNeeded)} până atunci, pune deoparte aproximativ ${lei(f.saving.perMonth)}/lună.`}</p>

    <h3 className="mt-7 text-lg font-semibold">Obiceiuri care pot amâna nevoia de îngrijire</h3>
    {f.habits.length ? <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{f.habits.map(h => <article key={h.id} className="rounded-lg border bg-card p-4">
        <h4 className="font-semibold">{h.title}</h4>
        <p className="mt-2 font-display text-3xl font-semibold text-primary">+{yrs(h.delayYears)} ani</p>
        <p className="text-sm font-semibold text-success">{h.costSavedPct < 1 ? 'sub 1%' : `-${pct(h.costSavedPct)}%`} cost</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.detail}</p>
      </article>)}</div>
      <p className="mt-3 text-sm text-muted-foreground">Discutați cu medicul de familie ce schimbări sunt potrivite.</p>
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
