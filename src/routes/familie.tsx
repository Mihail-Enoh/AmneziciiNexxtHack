import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Copy, HeartHandshake, Mail, PiggyBank, UserPlus } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { AnimatedNumber, ExplainButton, GapBar, PageHeader, PrivacyNote } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computePlan, formatNumber, genitive, ron, type FamilyMember } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";

export const Route = createFileRoute("/familie")({
  head: () => ({
    meta: [
      { title: "Cum acoperim diferența? Planul familiei — Prototype123" },
      { name: "description", content: "Împarte diferența între frați, construiește un fond pentru îngrijire și invită familia în plan." },
      { property: "og:title", content: "Nu trebuie să planifici singur — Prototype123" },
      { property: "og:description", content: "Contribuții, fond pentru îngrijire și coordonarea familiei, într-un singur plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Family,
});

function ContributionSlider({ name, sub, value, onChange, color = "primary" }: { name: string; sub: string; value: number; onChange: (v: number) => void; color?: "primary" | "care" }) {
  const id = `c-${name}`;
  return (
    <div className="card-surface p-5">
      <div className="flex items-center gap-3">
        <span className={color === "care" ? "grid size-10 place-items-center rounded-full bg-care-soft font-bold text-care" : "grid size-10 place-items-center rounded-full bg-primary-soft font-bold text-primary"}>{name.charAt(0) || "?"}</span>
        <div><Label htmlFor={id} className="text-base font-semibold">{name || "Membru"}</Label><p className="text-xs text-muted-foreground">{sub}</p></div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold"><AnimatedNumber value={value} /><span className="text-sm font-normal text-muted-foreground">/lună</span></p>
      <Slider id={id} className="mt-3" min={0} max={2000} step={50} value={[value]} onValueChange={([v = 0]) => onChange(v)} aria-label={`Contribuția lunară ${name}`} />
    </div>
  );
}

function Family() {
  const s = usePlan();
  const c = computePlan(s);
  const p = s.parent;
  const [open, setOpen] = useState(false);
  const [inv, setInv] = useState({ name: "", role: "Frate", contact: "" });
  const [link, setLink] = useState("");
  const setMember = (id: string, patch: Partial<FamilyMember>) => setPlan({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  const years = Math.round(s.yearsUntil);
  const growth = Array.from({ length: years + 1 }, (_, y) => ({ an: `${y}`, Fond: s.monthlySaving * 12 * y }));

  const generate = () => {
    const existing = s.members.find((m) => m.name.toLowerCase() === inv.name.trim().toLowerCase());
    const id = existing?.id ?? Math.random().toString(36).slice(2, 8);
    if (existing) setMember(id, { status: "invitat" });
    else setPlan({ members: [...s.members, { id, name: inv.name.trim() || "Invitat", role: inv.role, contribution: 0, status: "invitat", financial: "da", helps: [] }] });
    const params = new URLSearchParams({ id, de: s.user.name, pentru: p.name, nume: inv.name.trim() });
    setLink(`${window.location.origin}/invitatie?${params.toString()}`);
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Planul familiei" title="Cum acoperim diferența?" subtitle={`Scenariul selectat: diferență estimată de ${ron(c.familyFundingGap)}/lună, în aproximativ ${years} ani.`} />

      <div className="card-surface p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Diferența viitoare</p><p className="font-display text-3xl font-semibold"><AnimatedNumber value={c.familyFundingGap} /></p></div>
          <div><p className="text-xs text-muted-foreground">Contribuții planificate</p><p className="font-display text-3xl font-semibold text-care"><AnimatedNumber value={Math.min(c.familyContributions, c.familyFundingGap)} /></p></div>
          <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Rămâne neacoperit</p><p className="font-display text-4xl font-semibold"><AnimatedNumber value={c.remainingGap} /><span className="text-base font-normal text-muted-foreground">/lună</span></p>
            <ExplainButton title="Diferența rămasă" lines={[{ label: "Diferența familiei", value: ron(c.familyFundingGap) }, { label: `Contribuția ta (${s.user.name})`, value: ron(s.userContribution), op: "−" }, ...s.members.filter((m) => m.financial === "da").map((m) => ({ label: `Contribuția ${genitive(m.name)}`, value: ron(m.contribution), op: "−" as const })), { label: "Rămâne neacoperit", value: ron(c.remainingGap), op: "=" }]} />
          </div>
        </div>
        <div className="mt-5"><GapBar cost={c.careMonthlyCost} parent={c.parentCovered} family={Math.min(c.familyContributions, c.familyFundingGap)} /></div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card-surface bg-primary-soft/60 p-5">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{p.name.charAt(0)}</span><div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">Pensie și resurse</p></div></div>
          <p className="mt-4 font-display text-3xl font-semibold">{ron(c.parentCovered)}</p>
          <p className="text-xs text-muted-foreground">deja luați în calcul</p>
        </div>
        <ContributionSlider name={s.user.name} sub="Tu · Contribuția ta" value={s.userContribution} color="care" onChange={(v) => setPlan({ userContribution: v })} />
        {s.members.map((m) => (
          <ContributionSlider key={m.id} name={m.name} sub={`${m.role} · ${m.status === "a răspuns" ? "a răspuns" : m.status === "invitat" ? "invitat" : "estimare"}`} value={m.contribution} onChange={(v) => setMember(m.id, { contribution: v, financial: "da" })} />
        ))}
      </div>
      {s.members.length === 0 && <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">Poți construi planul singur sau poți adăuga ulterior alți membri ai familiei.</p>}

      {/* Prepare early */}
      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6 md:p-8">
          <PiggyBank className="size-7 text-primary" />
          <h2 className="mt-3 text-3xl font-semibold">Pregătește-te din timp</h2>
          <Label htmlFor="saving" className="mt-4 block text-base">Cât ai putea economisi lunar de astăzi?</Label>
          <p className="mt-2 font-display text-4xl font-semibold text-primary"><AnimatedNumber value={s.monthlySaving} /><span className="text-base font-normal text-muted-foreground">/lună</span></p>
          <Slider id="saving" className="mt-4" min={0} max={1500} step={25} value={[s.monthlySaving]} onValueChange={([v = 0]) => setPlan({ monthlySaving: v })} aria-label="Economisire lunară" />
          <div className="mt-8 rounded-2xl bg-primary-soft p-5">
            <p className="text-sm font-semibold">Fond estimat peste {years} ani</p>
            <p className="font-display text-5xl font-semibold"><AnimatedNumber value={c.futureCareReserve} /></p>
            <ExplainButton title="Fondul pentru îngrijire" lines={[{ label: "Economisire lunară", value: ron(s.monthlySaving) }, { label: "Luni până la scenariu", value: String(c.monthsUntilScenario), op: "×" }, { label: "Fond estimat", value: ron(c.futureCareReserve), op: "=" }, { label: "Diferența lunară", value: ron(c.familyFundingGap), op: "÷" }, { label: "Luni acoperite", value: `${c.monthsOfGapCovered} luni`, op: "=" }]} note="Model simplificat, fără randamente din investiții și fără inflație." />
          </div>
        </div>
        <div className="card-surface flex flex-col p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-care">Ce cumpără acest fond pentru familia ta?</p>
          {c.familyFundingGap > 0 ? (
            <>
              <p className="mt-3 font-display text-6xl font-semibold"><AnimatedNumber value={c.monthsOfGapCovered} suffix=" luni" /></p>
              <p className="mt-2 text-lg">Acest fond ar putea acoperi aproximativ {c.monthsOfGapCovered} luni din diferența estimată.</p>
              {c.remainingGap > 0 && <p className="mt-2 text-sm text-muted-foreground">Sau ~{c.monthsOfRemainingCovered} luni din cei {ron(c.remainingGap)}/lună rămași după contribuțiile familiei.</p>}
            </>
          ) : <p className="mt-3 text-lg">În acest scenariu nu există diferență de acoperit — fondul rămâne o rezervă pentru neprevăzut.</p>}
          <div className="mt-6 h-48 flex-1">
            <ResponsiveContainer>
              <AreaChart data={growth} margin={{ left: 0, right: 10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="an" tick={{ fontSize: 11 }} label={{ value: "ani", position: "insideBottomRight", offset: -2, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(v: number) => ron(v)} contentStyle={{ borderRadius: 12 }} />
                <Area type="monotone" dataKey="Fond" stroke="var(--primary)" fill="var(--primary-soft)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Coordination */}
      <section className="mt-14 card-surface p-6 md:p-10">
        <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div>
            <HeartHandshake className="size-8 text-care" />
            <h2 className="mt-3 text-4xl font-semibold">Nu trebuie să planifici singur</h2>
            <p className="mt-3 text-muted-foreground">Poți invita membrii familiei să spună cât ar putea contribui, fără să își dezvăluie toate veniturile sau economiile.</p>
            <Button className="mt-6" variant="care" onClick={() => { setLink(""); setInv({ name: "", role: "Frate", contact: "" }); setOpen(true); }}><UserPlus /> Invită un membru al familiei</Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="rounded-2xl border bg-primary-soft/50 p-4"><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">Părinte</p></li>
            <li className="rounded-2xl border bg-care-soft/50 p-4"><p className="font-semibold">{s.user.name}</p><p className="text-xs text-muted-foreground">Tu · {ron(s.userContribution)}/lună</p></li>
            {s.members.map((m) => (
              <li key={m.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between"><p className="font-semibold">{m.name}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{m.status}</span></div>
                <p className="text-xs text-muted-foreground">{m.role} · {m.financial === "da" ? `${ron(m.contribution)}/lună` : m.financial === "nu-spun" ? "Preferă să nu spună" : "Ajută în alte moduri"}</p>
                {m.helps.length > 0 && <p className="mt-1 text-xs">Timp: {m.helps.join(", ")}</p>}
              </li>
            ))}
          </ul>
        </div>
        <PrivacyNote className="mt-8" />
      </section>

      <div className="mt-8 flex justify-end"><Button asChild size="lg"><Link to="/rezumat">Vezi planul final <ArrowRight /></Link></Button></div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Invită un membru al familiei</DialogTitle>
            <DialogDescription>Vor vedea doar scenariul, nu veniturile tale.</DialogDescription>
          </DialogHeader>
          {!link ? (
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="iname">Nume</Label><Input id="iname" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} placeholder="ex. Andrei" /></div>
              <div className="space-y-2"><Label>Relație</Label>
                <Select value={inv.role} onValueChange={(v) => setInv({ ...inv, role: v })}><SelectTrigger aria-label="Relație"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Frate", "Soră", "Partener", "Alt membru al familiei"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label htmlFor="icontact">Email sau telefon (opțional)</Label><Input id="icontact" value={inv.contact} onChange={(e) => setInv({ ...inv, contact: e.target.value })} /></div>
              <Button className="w-full" onClick={generate} disabled={!inv.name.trim()}><Mail /> Generează invitație</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">Trimite acest link lui {inv.name}. În prototip nu se trimite niciun mesaj automat.</p>
              <div className="flex gap-2"><Input readOnly value={link} aria-label="Link invitație" /><Button size="icon" variant="outline" aria-label="Copiază" onClick={() => { navigator.clipboard?.writeText(link); toast.success("Link copiat"); }}><Copy /></Button></div>
              <Button asChild variant="care" className="w-full"><a href={link}>Vezi ce primește {inv.name}</a></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
