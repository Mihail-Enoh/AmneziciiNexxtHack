import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

/**
 * Monthly amount: a slider for quick changes plus a field for the exact sum.
 * - `limit` (e.g. the person's income): a hard maximum for both the slider and the field.
 * - without a limit, the slider goes up to `max` (default 2000) and the field accepts any amount.
 */
export function AmountSlider({ id, value, onChange, max = 2000, limit, limitLabel = "venitul tău", step = 50, label, className }: {
  id: string; value: number; onChange: (v: number) => void; max?: number; limit?: number | undefined; limitLabel?: string;
  step?: number; label: string; className?: string;
}) {
  const cap = limit !== undefined && limit > 0 ? Math.round(limit) : null;
  const top = cap ?? Math.max(max, value, step);
  const clamp = (n: number) => Math.max(0, Math.min(cap ?? 10_000_000, Math.round(n)));
  return (
    <div className={className}>
      <Slider id={id} min={0} max={top} step={Math.min(step, top)} value={[Math.min(value, top)]} onValueChange={([v = 0]) => onChange(clamp(v))} aria-label={label} />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>0</span><span>{top.toLocaleString("ro-RO")}{cap !== null ? ` (${limitLabel})` : ""}</span></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-exact`} className="text-sm text-muted-foreground">Sau scrie suma:</label>
        <Input
          id={`${id}-exact`}
          type="number"
          inputMode="numeric"
          min={0}
          max={cap ?? undefined}
          step={1}
          value={value}
          onChange={(e) => { const n = Number(e.target.value); onChange(Number.isFinite(n) ? clamp(n) : 0); }}
          className="h-9 w-32 rounded-lg"
        />
        <span className="text-sm text-muted-foreground">RON/lună</span>
      </div>
    </div>
  );
}
