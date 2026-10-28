import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, LineChart, ShieldCheck, Sparkles, Users } from "lucide-react";
import heroImg from "@/assets/hero-family.jpg";
import { Logo } from "@/components/app/AppShell";
import { PrivacyNote } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { loadDemo } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prototype123 — Știi cât te-ar costa dacă părinții tăi ar avea nevoie de tine?" },
      { name: "description", content: "Înțelege impactul financiar al îngrijirii unui părinte și construiește un plan împreună cu familia, înainte să devină o urgență." },
      { property: "og:title", content: "Prototype123 — Plan today. Be there tomorrow." },
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
  const navigate = useNavigate();
  const tryDemo = () => {
    loadDemo();
    navigate({ to: "/plan" });
  };
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/cum-functioneaza" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Cum funcționează</Link>
          <span className="rounded-full border px-2 py-1 text-xs font-semibold">RO</span>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div className="animate-rise">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-care-soft px-3 py-1.5 text-xs font-bold text-care">
            <Sparkles className="size-3.5" /> Ai grijă de viitor, înainte să devină o urgență.
          </p>
          <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">
            Știi cât te-ar costa dacă <em className="text-care not-italic">părinții tăi</em> ar avea nevoie de tine?
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Prototype123 te ajută să înțelegi impactul financiar al îngrijirii unui părinte și să construiești un plan împreună cu familia, înainte ca situația să devină o urgență.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link to="/start">Construiește planul familiei <ArrowRight /></Link></Button>
            <Button size="lg" variant="care" onClick={tryDemo}>Încearcă exemplul Elenei</Button>
          </div>
          <a href="#cum" className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">Vezi cum funcționează ↓</a>
        </div>
        <div className="relative animate-rise [animation-delay:150ms]">
          <img src={heroImg} alt="O fiică și mama ei discută la masa din bucătărie" width={1280} height={1024} className="aspect-[5/4] w-full rounded-[2rem] object-cover shadow-lift" />
          <div className="card-surface absolute -bottom-6 -left-4 w-64 p-4 shadow-lift md:-left-10">
            <p className="text-xs font-semibold text-muted-foreground">Diferență de acoperit · Ajutor zilnic</p>
            <p className="mt-1 font-display text-3xl font-semibold text-care">1.700 RON<span className="text-sm font-normal text-muted-foreground"> /lună</span></p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full"><div className="w-[43%] bg-primary" /><div className="flex-1 bg-care" /></div>
            <p className="mt-2 text-xs text-muted-foreground">Estimare, nu predicție.</p>
          </div>
        </div>
      </section>

      <section id="cum" className="border-y bg-card/60 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-xl text-3xl font-semibold">De la incertitudine la un plan pe care îl înțelegeți toți.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.title} className="card-surface p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary"><s.icon className="size-5" /></span>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 rounded-2xl bg-primary-soft p-5 md:flex-row md:items-center md:justify-between">
            <p className="flex items-start gap-3 text-sm font-medium"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />Nu oferim diagnostic medical și nu prezicem viitorul. Construim scenarii financiare pe care le poți modifica.</p>
            <Button variant="outline" onClick={tryDemo}>Încearcă un exemplu</Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-xs text-muted-foreground md:flex-row md:justify-between">
        <PrivacyNote />
        <p>Plan today. Be there tomorrow. · Nu reprezintă consultanță financiară, medicală sau juridică.</p>
      </footer>
    </div>
  );
}
