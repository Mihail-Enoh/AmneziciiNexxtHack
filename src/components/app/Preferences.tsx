import { useEffect, useState } from "react";
import { Languages, Settings, Sun, Type, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { setLanguage, useLanguage } from "@/lib/i18n";

export function LanguageSwitch() {
  const language = useLanguage();
  return <div className="inline-flex shrink-0 items-center rounded-lg border bg-card p-1" aria-label={language === "ro" ? "Limba aplicației" : "Application language"}>
    {(["ro", "en"] as const).map(locale => <Button key={locale} variant={language === locale ? "default" : "ghost"} size="sm" className="h-7 rounded-md px-2.5" aria-pressed={language === locale} aria-label={locale === "ro" ? "Română" : "English"} onClick={() => setLanguage(locale)}>{locale.toUpperCase()}</Button>)}
  </div>;
}

export function PreferenceEffects() {
  useEffect(() => {
    for (const key of ["contrast", "large-text", "reduce-motion"]) {
      try { document.documentElement.classList.toggle(key, localStorage.getItem(`prototype123-${key}`) === "true"); } catch { /* unavailable */ }
    }
  }, []);
  return null;
}

export function SettingsMenu({ expanded = false }: { expanded?: boolean }) {
  const language = useLanguage();
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const ro = language === "ro";
  const change = (key: string, value: boolean) => {
    setValues(prev => ({ ...prev, [key]: value }));
    document.documentElement.classList.toggle(key, value);
    try { localStorage.setItem(`prototype123-${key}`, String(value)); } catch { /* unavailable */ }
  };
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) setValues(Object.fromEntries(["contrast", "large-text", "reduce-motion"].map(k => [k, document.documentElement.classList.contains(k)]))); }}>
    <DialogTrigger asChild><Button variant="ghost" size={expanded ? "default" : "icon"} className={expanded ? "w-full justify-start rounded-lg px-3" : "rounded-lg"} aria-label={ro ? "Setări" : "Settings"} title={ro ? "Setări" : "Settings"}><Settings />{expanded && (ro ? "Setări" : "Settings")}</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{ro ? "Pe gustul tău" : "Make it yours"}</DialogTitle><DialogDescription>{ro ? "Setări" : "Settings"} · Prototype123</DialogDescription></DialogHeader>
      <div className="flex items-center justify-between gap-4 border-b py-4"><div className="flex items-center gap-3"><Languages className="size-5 text-primary" /><span className="font-medium">{ro ? "Limba" : "Language"}</span></div><LanguageSwitch /></div>
      {[{ key: "contrast", icon: Sun, label: ro ? "Contrast mai puternic" : "Higher contrast" }, { key: "large-text", icon: Type, label: ro ? "Text mai mare" : "Larger text" }, { key: "reduce-motion", icon: Waves, label: ro ? "Mai puține animații" : "Reduced motion" }].map(item => <label key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b py-4 last:border-0"><span className="flex min-w-0 items-center gap-3 font-medium"><item.icon className="size-5 shrink-0 text-primary" />{item.label}</span><Switch checked={values[item.key] ?? false} onCheckedChange={v => change(item.key, v)} aria-label={item.label} /></label>)}
    </DialogContent>
  </Dialog>;
}