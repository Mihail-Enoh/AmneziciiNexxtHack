import { useEffect, useState } from "react";
import { Settings, Sun, Type, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function PreferenceEffects() {
  useEffect(() => {
    for (const key of ["contrast", "large-text", "reduce-motion"]) {
      try { document.documentElement.classList.toggle(key, localStorage.getItem(`prototype123-${key}`) === "true"); } catch { /* unavailable */ }
    }
  }, []);
  return null;
}

export function SettingsMenu({ expanded = false }: { expanded?: boolean }) {
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const change = (key: string, value: boolean) => {
    setValues(prev => ({ ...prev, [key]: value }));
    document.documentElement.classList.toggle(key, value);
    try { localStorage.setItem(`prototype123-${key}`, String(value)); } catch { /* unavailable */ }
  };
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) setValues(Object.fromEntries(["contrast", "large-text", "reduce-motion"].map(k => [k, document.documentElement.classList.contains(k)]))); }}>
    <DialogTrigger asChild><Button variant="ghost" size={expanded ? "default" : "icon"} className={expanded ? "w-full justify-start rounded-lg px-3" : "rounded-lg"} aria-label={"Setări"} title={"Setări"}><Settings />{expanded && "Setări"}</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{"Pe gustul tău"}</DialogTitle><DialogDescription>{"Setări"} · Prototype123</DialogDescription></DialogHeader>
      {[{ key: "contrast", icon: Sun, label: "Contrast mai puternic" }, { key: "large-text", icon: Type, label: "Text mai mare" }, { key: "reduce-motion", icon: Waves, label: "Mai puține animații" }].map(item => <label key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b py-4 last:border-0"><span className="flex min-w-0 items-center gap-3 font-medium"><item.icon className="size-5 shrink-0 text-primary" />{item.label}</span><Switch checked={values[item.key] ?? false} onCheckedChange={v => change(item.key, v)} aria-label={item.label} /></label>)}
    </DialogContent>
  </Dialog>;
}