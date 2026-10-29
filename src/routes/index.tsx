import { t, useT } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Loader2, Compass, HeartPulse, LineChart, ListChecks, Lock, ShieldCheck, Sparkles, UserCheck, Users } from "lucide-react";
import heroImg from "@/assets/hero-family.jpg";
import { PublicHeader } from "@/components/app/AppShell";
import { PrivacyNote } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { addProfile } from "@/lib/store";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runIntake } from "@/lib/intake.functions";
import { saveIntakeNote } from "@/lib/intake-session";
import { seedHealthAnswers } from "@/lib/health-files";
import { fullName } from "@/lib/plan";
import { blankState, blankWithName } from "@/lib/intake";

const EXAMPLE_STORY = "Mama are 72 de ani, stă singură la Iași, are pensie 1.800 lei și 15.000 de economii. Încă se descurcă, dar îi fac eu cumpărăturile. Eu câștig 7.000 net și fratele meu Radu ar putea da 300 lei pe lună. Eu aș putea da 500.";
/** Why the AI could not read the story, in plain words (the code helps debugging). */
function intakeFailText(reason: string): string {
  if (reason === "no_key") return "lipsește cheia FEATHERLESS_API_KEY pe server";
  if (reason === "http_401" || reason === "http_403") return "cheia API nu este acceptată";
  if (reason === "http_429") return "serviciul AI este ocupat; încearcă peste un minut";
  if (reason === "timeout") return "serviciul AI a răspuns prea greu";
  if (reason === "parse") return "răspunsul AI nu a putut fi folosit";
  if (reason.startsWith("http_")) return `serviciul AI a răspuns cu eroarea ${reason.slice(5)}`;
  return "nu am putut contacta serviciul AI";
}

const LOADING = ["Construim scenariile…", "Estimăm resursele disponibile…", "Calculăm diferențele de acoperit…"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WeCare — Știi cât te-ar costa dacă părinții tăi ar avea nevoie de tine?" },
      { name: "description", content: "Înțelege impactul financiar al îngrijirii unui părinte și construiește un plan împreună cu familia, înainte să devină o urgență." },
      { property: "og:title", content: "WeCare — Planifică azi. Fii alături mâine." },
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

const QUIZ_STEPS = ["Persoana", "Venituri și cheltuieli", "Familia", "Când începe"];

const TRUST = [
  { icon: Lock, text: "Datele rămân în browserul tău" },
  { icon: UserCheck, text: "Nu e nevoie de cont" },
  { icon: ShieldCheck, text: "Scenarii pentru planificare, nu diagnostic" },
];

function Landing() {
  const t = useT();
  const navigate = useNavigate();
  const intake = useServerFn(runIntake);
  const [story, setStory] = useState("");
  const [person, setPerson] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, LOADING.length - 1)), 900);
    return () => clearInterval(id);
  }, [busy]);
  const submit = async () => {
    const text = story.trim().slice(0, 600);
    const name = person.trim().slice(0, 80);
    if (!text || !name || busy) return;
    setStep(0); setBusy(true);
    let res: Awaited<ReturnType<typeof intake>> | { ok: false; reason: string } = { ok: false, reason: "network" };
    try { res = await intake({ data: { story: text, name } }); } catch { /* fall through */ }
    if (res.ok) {
      const r = res.result;
      addProfile({ ...blankState(), ...r.patch });
      if (r.patch.parent && r.quiz) seedHealthAnswers(fullName(r.patch.parent, ""), r.quiz);
      saveIntakeNote({ message: r.message, filled: r.filled, assumed: r.assumed, missing: r.missing });
      navigate({ to: r.path as "/plan" });
    } else {
      // Start from a blank plan with the typed name — never from the "Elena" example.
      addProfile(blankWithName(name));
      saveIntakeNote({ message: `Nu am putut citi povestea (${intakeFailText(res.reason)}). Completează manual.`, filled: [], assumed: [], missing: [] });
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

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 lg:pt-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="animate-rise lg:col-span-7">
            <h1 className="text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-5xl xl:text-6xl">
              <span className="lg:whitespace-nowrap">{t("Ei au avut grijă de tine.")}</span>
              <br />
              <em className="text-care not-italic lg:whitespace-nowrap">{t("Acum e rândul tău.")}</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("Află din timp cât ar putea costa îngrijirea unui părinte și construiește un plan împreună cu familia.")}
            </p>

            <div className="card-surface mt-8 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-care-soft text-care"><Sparkles className="size-5" /></span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-tight">{t("Spune-ne povestea")}</h2>
                  <p className="text-sm text-muted-foreground">{t("Scrii câteva rânduri, noi completăm planul.")}</p>
                </div>
              </div>
              <label htmlFor="person" className="mt-5 block text-sm font-semibold">Numele persoanei de care vrei să ai grijă</label>
              <input id="person" value={person} maxLength={80} required autoComplete="off" onChange={(e) => setPerson(e.target.value)}
                placeholder="Ex.: Maria Ionescu"
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <label htmlFor="story" className="mt-4 block text-sm font-semibold">Povestește-ne situația ta</label>
              <textarea id="story" value={story} maxLength={600} rows={4} onChange={(e) => setStory(e.target.value)}
                placeholder="Ex.: Tata are 70 de ani, stă la Cluj, are pensie 2.500 lei. Eu și sora mea am putea ajuta…"
                className="mt-2 w-full resize-y rounded-xl border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => { setStory(EXAMPLE_STORY); if (!person.trim()) setPerson("Maria Ionescu"); }} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">Folosește o poveste exemplu</button>
                <Button className="w-full sm:w-auto" onClick={submit} disabled={!story.trim() || !person.trim()} title={!person.trim() ? "Scrie numele persoanei" : undefined}>Construiește planul <ArrowRight /></Button>
              </div>
            </div>
          </div>

          <div className="flex animate-rise flex-col gap-4 [animation-delay:150ms] lg:col-span-5">
            <img src={heroImg} alt={t("O fiică și mama ei discută la masa din bucătărie")} width={1280} height={1024} className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift max-lg:order-last max-lg:mx-auto max-lg:max-w-md" />

            <div className="card-surface p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><ListChecks className="size-5" /></span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-tight">{t("Pas cu pas")}</h2>
                  <p className="text-sm text-muted-foreground">{t("Completezi singur, în 4 pași scurți.")}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {QUIZ_STEPS.map((label, i) => (
                  <span key={label} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-semibold">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                    {t(label)}
                  </span>
                ))}
              </div>
              <Button className="mt-4 w-full" size="lg" onClick={() => { addProfile(); navigate({ to: "/start" }); }}>{t("Construiește planul familiei ")}<ArrowRight /></Button>
            </div>

            <Link to="/sanatate" className="card-surface flex items-center gap-3 p-4 transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-care-soft text-care"><HeartPulse className="size-5" /></span>
              <span className="min-w-0 flex-1 text-sm font-semibold">{t("Ai deja un plan? Completează Sănătate și obiceiuri")}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground sm:flex-row sm:gap-8">
          {TRUST.map((item) => (
            <span key={item.text} className="flex items-center gap-2">
              <item.icon className="size-4 shrink-0 text-primary" />{t(item.text)}
            </span>
          ))}
        </div>
        <p className="mt-6 text-center">
          <a href="#cum" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("Vezi cum funcționează ↓")}</a>
        </p>
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
            <p className="flex items-start gap-3 text-sm font-medium"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />{t("Nu oferim evaluări medicale și nu prezicem viitorul. Construim scenarii de îngrijire.")}</p>
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
