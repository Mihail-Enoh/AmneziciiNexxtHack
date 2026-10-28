import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, HeartHandshake } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/app/AppShell";
import { AnimatedNumber, PrivacyNote } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { genitive, type FamilyMember } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";
import { cn } from "@/lib/utils";

const search = z.object({ id: z.string().optional(), de: z.string().optional(), pentru: z.string().optional(), nume: z.string().optional() });

export const Route = createFileRoute("/invitatie")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Invitație în planul familiei — Prototype123" },
      { name: "description", content: "Ai fost invitat(ă) să spui cum ai putea ajuta dacă în viitor ar fi nevoie." },
      { property: "og:title", content: "Ai fost invitat(ă) în planul familiei — Prototype123" },
      { property: "og:description", content: "Spune ce contribuție ar fi realistă pentru tine, fără să îți dezvălui veniturile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Invite,
});

const HELPS = ["Transport", "Cumpărături", "Vizite", "Programări", "Administrarea facturilor", "Alte activități"];
const MODES: { id: FamilyMember["financial"]; label: string }[] = [
  { id: "da", label: "Pot contribui financiar" },
  { id: "alte-moduri", label: "Pot ajuta în alte moduri" },
  { id: "nu-spun", label: "Prefer să nu spun" },
];

function Invite() {
  const q = Route.useSearch();
  const s = usePlan();
  const from = q.de || "Maria";
  const parent = q.pentru || "Elena";
  const [amount, setAmount] = useState(400);
  const [mode, setMode] = useState<FamilyMember["financial"]>("da");
  const [helps, setHelps] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const submit = () => {
    const id = q.id ?? "invitat";
    const patch = { contribution: mode === "da" ? amount : 0, financial: mode, helps, status: "a răspuns" as const };
    const exists = s.members.some((m) => m.id === id);
    setPlan({ members: exists ? s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) : [...s.members, { id, name: q.nume || "Invitat", role: "Alt membru al familiei", ...patch }] });
    setDone(true);
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-2xl items-center px-4"><Logo /></header>
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <div className="card-surface animate-rise p-6 md:p-10">
          {done ? (
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success"><Check className="size-7" /></span>
              <h1 className="mt-4 text-3xl font-semibold">Mulțumim!</h1>
              <p className="mt-2 text-muted-foreground">{from} va vedea răspunsul tău în planul familiei. Îl poți schimba oricând.</p>
              <Button asChild className="mt-6"><Link to="/familie">Vezi planul familiei</Link></Button>
            </div>
          ) : (
            <>
              <HeartHandshake className="size-8 text-care" />
              <h1 className="mt-3 text-3xl font-semibold md:text-4xl">{from} construiește un plan pentru viitorul {genitive(parent)}</h1>
              <p className="mt-3 text-muted-foreground">Dacă în viitor ar fi nevoie, ce contribuție lunară ar fi realistă pentru tine? Nu este o promisiune.</p>
              <fieldset className="mt-6">
                <legend className="sr-only">Cum ai putea ajuta</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {MODES.map((m) => (
                    <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)} className={cn("rounded-xl border-2 p-3 text-sm font-semibold", mode === m.id ? "border-primary bg-primary-soft" : "hover:border-primary/40")}>{m.label}</button>
                  ))}
                </div>
              </fieldset>
              {mode === "da" && (
                <div className="mt-6 rounded-2xl bg-primary-soft p-5">
                  <p className="font-display text-4xl font-semibold text-primary"><AnimatedNumber value={amount} /><span className="text-base font-normal text-muted-foreground">/lună</span></p>
                  <Slider className="mt-4" min={0} max={2000} step={50} value={[amount]} onValueChange={([v]) => setAmount(v)} aria-label="Contribuție lunară" />
                </div>
              )}
              <fieldset className="mt-6">
                <legend className="mb-3 font-semibold">Pot ajuta cu timp</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {HELPS.map((h) => (
                    <label key={h} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm">
                      <Checkbox checked={helps.includes(h)} onCheckedChange={(c) => setHelps(c ? [...helps, h] : helps.filter((x) => x !== h))} />{h}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button size="lg" className="mt-8 w-full" onClick={submit}>Trimite răspunsul</Button>
              <PrivacyNote className="mt-4 justify-center" />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
