import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

/**
 * Monthly amount: a slider for quick changes plus a field for the exact sum.
 * The slider goes up to `max` (or further if the amount typed is larger); the field accepts any amount.
 */
export function AmountSlider({ id, value, onChange, max, step = 50, label, className }: {
  id: string; value: number; onChange: (v: number) => void; max: number; step?: number; label: string; className?: string;
}) {
  const top = Math.max(max, value, step);
  return (
    <div className={className}>
      <Slider id={id} min={0} max={top} step={step} value={[Math.min(value, top)]} onValueChange={([v = 0]) => onChange(v)} aria-label={label} />
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor={`${id}-exact`} className="text-sm text-muted-foreground">Sau scrie suma:</label>
        <Input
          id={`${id}-exact`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={value}
          onChange={(e) => { const n = Number(e.target.value); onChange(Number.isFinite(n) ? Math.max(0, Math.min(10_000_000, Math.round(n))) : 0); }}
          className="h-9 w-32 rounded-lg"
        />
        <span className="text-sm text-muted-foreground">RON/lună</span>
      </div>
    </div>
  );
}
