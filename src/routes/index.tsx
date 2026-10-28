import { t, useT, displayName } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Loader2, Compass, LineChart, ShieldCheck, Sparkles, Users } from "lucide-react";
import heroImg from "@/assets/hero-family.jpg";
import { Logo, PublicHeader } from "@/components/app/AppShell";
import { PrivacyNote } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { loadDemo, setPlan } from "@/lib/store";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runIntake } from "@/lib/intake.functions";
import { saveIntakeNote } from "@/lib/intake-session";

const EXAMPLE_STORY = "Mama are 72 de ani, stă singură la Iași, are pensie 1.800 lei și 15.000 de economii. Încă se descurcă, dar îi fac eu cumpărăturile. Eu câștig 7.000 net și fratele meu Radu ar putea da 300 lei pe lună. Eu aș putea da 500.";
const LOADING = ["Construim scenariile…", "Estimăm resursele disponibile…", "Calculăm diferențele de acoperit…"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prototype123 — Știi cât te-ar costa dacă părinții tăi ar avea nevoie de tine?" },
      { name: "description", content: "Înțelege impactul financiar al îngrijirii unui părinte și construiește un plan împreună cu familia, înainte să devină o urgență." },
      { property: "og:title", content: "Prototype123 — Planifică azi. Fii alături mâine." },
      { property: "og:description", content: "Scenarii financiare pentru familiile din România care au părinți în vârstă." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: Compass, title: "1. Înțelege", text: "Estimăm cum s-ar putea schimba nevoile financiare ale părintelui tău." },
  { icon: LineChart, title: "2. Simulează", text: "Compari diferite scenarii de îngrijire și vezi impactul asupra familiei." },
  { icon: Users, title: "3. Pregătește-te", text: "Construiești un plan financiar împreună cu membrii familiei." },
];

function Landing() {
  const t = useT();
  const navigate = useNavigate();
  const tryDemo = () => {
    loadDemo();
    navigate({ to: "/plan" });
  };
  const intake = useServerFn(runIntake);
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, LOADING.length - 1)), 900);
    return () => clearInterval(id);
  }, [busy]);
  const submit = async () => {
    const text = story.trim().slice(0, 600);
    if (!text || busy) return;
    setStep(0); setBusy(true);
    let res: Awaited<ReturnType<typeof intake>> | { ok: false } = { ok: false };
    try { res = await intake({ data: { story: text } }); } catch { /* fall through */ }
    if (res.ok) {
      const r = res.result;
      setPlan(r.patch);
      saveIntakeNote({ message: r.message, filled: r.filled, assumed: r.assumed, missing: r.missing });
      navigate({ to: r.path as "/plan" });
    } else {
      saveIntakeNote({ message: "Nu am putut citi povestea. Completează manual.", filled: [], assumed: [], missing: [] });
      navigate({ to: "/start" });
    }
  };
  if (busy) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto size-10 animate-spin text-primary" />
          <ul className="mt-8 space-y-3 text-left">
            {LOADING.map((l, i) => (
              <li key={l} className={"flex items-center gap-3 text-lg transition-opacity " + (i > step ? "opacity-30" : "")}>
                {i < step ? <Check className="size-5 text-success" /> : <span className="size-5" />}{t(l)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div className="animate-rise">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-care-soft px-3 py-1.5 text-xs font-bold text-care">
            <Sparkles className="size-3.5" />{t(" Ai grijă de viitor, înainte să devină o urgență. ")}</p>
          <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">{t(" Știi cât te-ar costa dacă ")}<em className="text-care not-italic">{t("părinții tăi")}</em>{t(" ar avea nevoie de tine? ")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t(" Prototype123 te ajută să înțelegi impactul financiar al îngrijirii unui părinte și să construiești un plan împreună cu familia, înainte ca situația să devină o urgență. ")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link to="/start">{t("Construiește planul familiei ")}<ArrowRight /></Link></Button>
            <Button size="lg" variant="care" onClick={tryDemo}>{t("Încearcă exemplul Elenei")}</Button>
          </div>
          <div className="card-surface mt-6 max-w-xl p-4">
            <label htmlFor="story" className="text-sm font-semibold">Povestește-ne situația ta</label>
            <textarea id="story" value={story} maxLength={600} rows={4} onChange={(e) => setStory(e.target.value)}
              placeholder="Ex.: Tata are 70 de ani, stă la Cluj, are pensie 2.500 lei. Eu și sora mea am putea ajuta…"
              className="mt-2 w-full resize-y rounded-xl border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setStory(EXAMPLE_STORY)} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">Folosește o poveste exemplu</button>
              <Button onClick={submit} disabled={!story.trim()}>Construiește planul <ArrowRight /></Button>
            </div>
          </div>
          <a href="#cum" className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("Vezi cum funcționează ↓")}</a>
        </div>
        <div className="relative animate-rise [animation-delay:150ms]">
          <img src={heroImg} alt={t("O fiică și mama ei discută la masa din bucătărie")} width={1280} height={1024} className="aspect-[5/4] w-full rounded-[2rem] object-cover shadow-lift" />
          <div className="card-surface absolute -bottom-6 -left-4 w-64 p-4 shadow-lift md:-left-10">
            <p className="text-xs font-semibold text-muted-foreground">{t("Diferență de acoperit · Ajutor zilnic")}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-care">1.700 RON<span className="text-sm font-normal text-muted-foreground">{t(" /lună")}</span></p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full"><div className="w-[43%] bg-primary" /><div className="flex-1 bg-care" /></div>
            <p className="mt-2 text-xs text-muted-foreground">{t("Unul dintre scenariile de îngrijire posibile.")}</p>
          </div>
        </div>
      </section>

      <section id="cum" className="border-y bg-card/60 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-xl text-3xl font-semibold">{t("De la incertitudine la un plan pe care îl înțelegeți toți.")}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={t(s.title)} className="card-surface p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary"><s.icon className="size-5" /></span>
                <h3 className="mt-5 text-xl font-semibold">{t(s.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(s.text)}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 rounded-2xl bg-primary-soft p-5 md:flex-row md:items-center md:justify-between">
            <p className="flex items-start gap-3 text-sm font-medium"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />{t("Nu oferim evaluări medicale și nu prezicem viitorul. Construim scenarii de îngrijire pe care le poți modifica.")}</p>
            <Button variant="outline" onClick={tryDemo}>{t("Încearcă un exemplu")}</Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-xs text-muted-foreground md:flex-row md:justify-between">
        <PrivacyNote />
        <Link to="/cum-folosim-datele" className="font-semibold underline underline-offset-4">Cum folosim datele</Link>
        <p>{t("Planifică azi. Fii alături mâine. · Nu reprezintă consultanță financiară, medicală sau juridică.")}</p>
      </footer>
    </div>
  );
}
