import { useRef, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { breakdownOf, DEFAULT_BREAKDOWN, formatNumber, PLAN_ASSUMPTIONS, scenarioById, type CostSlice } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--danger)", "var(--warning)", "var(--foreground)"];
const dots = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-danger", "bg-warning", "bg-foreground"];
const percent = (amount: number, total: number) => new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 }).format(total > 0 ? amount / total * 100 : 0);
// Genitive of the parent's first name: "ale Elenei" / "lui Andrei".
const possessive = (n: string) => {
  const nm = n.trim();
  if (!nm) return "ale persoanei";
  const lower = nm.toLowerCase();
  if (lower.endsWith("a") || lower.endsWith("ă")) return `ale ${nm.slice(0, -1)}ei`;
  return `lui ${nm}`;
};

export function CostBreakdown() {
  const s = usePlan();
  const slices = breakdownOf(s, s.scenario);
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const [labelDraft, setLabelDraft] = useState<{ id: string; value: string } | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const flagged = slices.filter((slice) => slice.replacesOwnExpense);
  const replaced = flagged.reduce((sum, slice) => sum + slice.amount, 0);
  const name = s.parent.name.trim().split(/\s+/)[0] || "persoana";
  const defaults = DEFAULT_BREAKDOWN[s.scenario];
  const isDefault = total === PLAN_ASSUMPTIONS.costs[s.scenario] && slices.length === defaults.length && slices.every((slice, index) => {
    const preset = defaults[index];
    return preset && slice.label === preset.label && slice.amount === preset.amount && slice.replacesOwnExpense === preset.replacesOwnExpense;
  });
  const update = (next: CostSlice[]) => {
    const sanitized = breakdownOf({ ...s, costBreakdown: { ...s.costBreakdown, [s.scenario]: next } }, s.scenario);
    setPlan({ costBreakdown: { ...s.costBreakdown, [s.scenario]: sanitized }, costs: { ...s.costs, [s.scenario]: sanitized.reduce((sum, slice) => sum + slice.amount, 0) } });
  };
  const edit = (index: number, patch: Partial<CostSlice>) => update(slices.map((slice, i) => i === index ? { ...slice, ...patch } : slice));
  const reset = () => {
    const costBreakdown = { ...s.costBreakdown };
    delete costBreakdown[s.scenario];
    setPlan({ costBreakdown, costs: { ...s.costs, [s.scenario]: PLAN_ASSUMPTIONS.costs[s.scenario] } });
  };

  return (
    <section className="min-w-0 space-y-5 border-y py-6" aria-labelledby="cost-breakdown-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="cost-breakdown-title" className="max-w-xl text-xl font-semibold">Din ce e format costul lunar · {scenarioById(s.scenario).label}</h3>
        <p className="tabular text-2xl font-semibold text-primary" aria-live="polite">{formatNumber(total)} <span className="text-sm font-normal">lei/lună</span></p>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative mx-auto h-60 w-full max-w-72" role="img" aria-label={`Cost lunar: ${formatNumber(total)} lei. ${slices.map((slice) => `${slice.label}: ${formatNumber(slice.amount)} lei (${percent(slice.amount, total)}%)`).join("; ")}`}>
          {total > 0 ? <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slices} dataKey="amount" nameKey="label" innerRadius={62} outerRadius={96} paddingAngle={2} stroke="var(--background)" isAnimationActive={false} onClick={(_slice, index) => inputs.current.get(index)?.focus()}>
                {slices.map((slice, index) => <Cell key={`${index}-${slice.id}`} fill={colors[index]} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                const slice = payload?.[0]?.payload as CostSlice | undefined;
                return active && slice ? <div className="max-w-64 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md">{slice.label}: {formatNumber(slice.amount)} lei ({percent(slice.amount, total)}%)</div> : null;
              }} />
            </PieChart>
          </ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-muted-foreground">Cost total: 0 lei</div>}
        </div>
        <div className="min-w-0 divide-y">
          {slices.map((slice, index) => {
            const id = `cost-slice-${s.scenario}-${index}`;
            return <div key={id} className="min-w-0 space-y-3 py-4 first:pt-0">
              <div className="grid grid-cols-[minmax(0,1fr)_96px_32px] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_120px_48px_32px]">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor={`${id}-label`} className="flex items-center gap-2 text-xs"><span className={`size-2.5 shrink-0 rounded-full ${dots[index]}`} aria-hidden />Categorie {index + 1}</Label>
                  <Input id={`${id}-label`} ref={(input) => { if (input) inputs.current.set(index, input); else inputs.current.delete(index); }} maxLength={40} value={labelDraft?.id === id ? labelDraft.value : slice.label} onChange={(e) => { setLabelDraft({ id, value: e.target.value }); edit(index, { label: e.target.value }); }} onBlur={() => setLabelDraft(null)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-amount`} className="text-xs">Sumă (lei)</Label>
                  <Input id={`${id}-amount`} className="tabular" type="number" min={0} max={100000} step={1} value={String(slice.amount)} onChange={(e) => { const raw = e.target.value.trim(); const next = raw === "" ? 0 : Number(raw); const amount = Number.isFinite(next) ? next : 0; const shown = String(amount); if (e.target.value !== shown) e.target.value = shown; edit(index, { amount }); }} />
                </div>
                <span className="hidden pb-2 text-right text-xs text-muted-foreground sm:block">{percent(slice.amount, total)}%</span>
                <Button type="button" size="icon" variant="ghost" className="size-8 self-end" disabled={slices.length <= 1} aria-label={`Șterge categoria ${slice.label}`} title={`Șterge categoria ${slice.label}`} onClick={() => update(slices.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <Checkbox id={`${id}-replaced`} checked={slice.replacesOwnExpense} onCheckedChange={(checked) => edit(index, { replacesOwnExpense: checked === true })} />
                  <Label htmlFor={`${id}-replaced`} className="text-xs leading-relaxed">Deja inclusă în cheltuielile lunare actuale</Label>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground sm:hidden">{percent(slice.amount, total)}%</span>
              </div>
            </div>;
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-auto whitespace-normal text-left" disabled={slices.length >= 8} onClick={() => update([...slices, { id: `category-${Date.now()}`, label: "Altele", amount: 0, replacesOwnExpense: false }])}><Plus className="size-4 shrink-0" />Adaugă o categorie</Button>
        <Button type="button" variant="ghost" className="h-auto whitespace-normal text-left" onClick={reset}><RotateCcw className="size-4 shrink-0" />Revino la valorile inițiale</Button>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">Din acești bani, {formatNumber(replaced)} lei acoperă lucruri incluse deja în cheltuielile lunare {possessive(name)}{flagged.length > 0 ? ` (de ex. ${flagged.map((slice) => slice.label).join(", ")})` : ""}. De aceea nu le mai adunăm o dată.</p>
    </section>
  );
}