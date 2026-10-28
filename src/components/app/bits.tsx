import { t, useLanguage, displayName } from "@/lib/i18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Calculator, Info, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber, STATUS_META } from "@/lib/plan";
import { cn } from "@/lib/utils";

/** Smoothly tweens between numeric values. */
export function AnimatedNumber({ value, suffix = " RON", className }: { value: number; suffix?: string; className?: string }) {
  useLanguage();
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = Math.max(0, value);
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 450);
      const e = 1 - Math.pow(1 - k, 3);
      const v = a + (b - a) * e;
      setDisplay(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={cn("tabular", className)}>{formatNumber(display)}{suffix}</span>;
}

export interface CalcLine { label: string; value: string; op?: "−" | "+" | "=" | "×" | "÷" }

export function ExplainButton({ title, lines, note }: { title: string; lines: CalcLine[]; note?: string }) {
  useLanguage();
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline">
        <Calculator className="size-3.5" aria-hidden />{t(" Cum am calculat? ")}</DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription>{t("Fiecare număr provine din valorile introduse de tine și din ipotezele demonstrative.")}</DialogDescription>
        </DialogHeader>
        <dl className="mt-2 divide-y rounded-2xl border bg-muted/40">
          {lines.map((l, i) => (
            <div key={i} className={cn("flex items-center justify-between gap-4 px-4 py-3", l.op === "=" && "bg-primary-soft font-bold")}>
              <dt className="text-sm">{t(l.label)}</dt>
              <dd className="tabular text-sm font-semibold">{l.op && l.op !== "=" ? `${l.op} ` : l.op === "=" ? "= " : ""}{l.value}</dd>
            </div>
          ))}
        </dl>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </DialogContent>
    </Dialog>
  );
}

export function InfoTip({ children, label = "Informații" }: { children: ReactNode; label?: string }) {
  useLanguage();
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger aria-label={t(label)} className="inline-flex text-muted-foreground hover:text-foreground">
          <Info className="size-4" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DemoBadge() {
  useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-xs font-semibold text-foreground">{t(" Estimare demonstrativă ")}<InfoTip>{t("Costurile reale variază în funcție de oraș, tipul serviciilor, disponibilitate și situația familiei.")}</InfoTip>
    </span>
  );
}

export function PrivacyNote({ className }: { className?: string }) {
  useLanguage();
  return (
    <p className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <Lock className="size-3.5" aria-hidden />{t(" Datele tale financiare rămân private. Acest prototip salvează informațiile doar local în browser. ")}</p>
  );
}

export function StatusPill({ status }: { status: keyof typeof STATUS_META }) {
  useLanguage();
  const m = STATUS_META[status];
  const tone = { success: "bg-success-soft text-success border-success/30", warning: "bg-warning-soft text-warning border-warning/30", danger: "bg-danger-soft text-danger border-danger/30" }[m.tone];
  const dot = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[m.tone];
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold", tone)}>
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      {t(m.label)}
    </span>
  );
}

/** Stacked horizontal bar: parent contribution | family contributions | remaining gap */
export function GapBar({ cost, parent, family = 0, compact }: { cost: number; parent: number; family?: number; compact?: boolean }) {
  useLanguage();
  const p = cost > 0 ? Math.min(100, (parent / cost) * 100) : 100;
  const f = cost > 0 ? Math.min(100 - p, (family / cost) * 100) : 0;
  const g = Math.max(0, 100 - p - f);
  return (
    <div>
      <div className={cn("flex w-full overflow-hidden rounded-full bg-muted", compact ? "h-3" : "h-8")} role="img"
        aria-label={t(`Părintele acoperă ${Math.round(p)}%, familia ${Math.round(f)}%, rămâne ${Math.round(g)}%`)}>
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${p}%` }} />
        {f > 0 && <div className="h-full bg-care transition-all duration-500" style={{ width: `${f}%` }} />}
        {g > 0 && <div className="h-full transition-all duration-500 [background:repeating-linear-gradient(135deg,var(--care-soft),var(--care-soft)_6px,color-mix(in_oklab,var(--care)_30%,var(--care-soft))_6px,color-mix(in_oklab,var(--care)_30%,var(--care-soft))_12px)]" style={{ width: `${g}%` }} />}
      </div>
      {!compact && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />{t("Părinte")}</li>
          {family > 0 && <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-care" />{t("Familie")}</li>}
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-care/50 bg-care-soft" />{t("Diferență de acoperit")}</li>
        </ul>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }) {
  useLanguage();
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="animate-rise">
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-care">{eyebrow}</p>}
        <h1 className="text-4xl font-semibold md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Metric({ label, children, hint, icon }: { label: string; children: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  useLanguage();
  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold">{children}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
