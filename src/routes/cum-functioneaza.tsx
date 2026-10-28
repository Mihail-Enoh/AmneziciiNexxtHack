import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, PrivacyNote } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { PLAN_ASSUMPTIONS, ron, SCENARIOS } from "@/lib/plan";

export const Route = createFileRoute("/cum-functioneaza")({
  head: () => ({
    meta: [
      { title: "Cum facem estimările? — Prototype123" },
      { name: "description", content: "Ipotezele demonstrative și formulele folosite de Prototype123 pentru scenariile de îngrijire." },
      { property: "og:title", content: "Cum facem estimările? — Prototype123" },
      { property: "og:description", content: "Transparență totală: de unde vine fiecare număr din planul familiei." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HowItWorks,
});

const FORMULAS = [
  ["Venit disponibil", "pensie + alte venituri − cheltuieli esențiale"],
  ["Contribuția părintelui", "venit disponibil + cheltuieli preluate de serviciul de îngrijire (+ economii / 60 luni, opțional)"],
  ["Diferență de acoperit", "max(0, cost îngrijire − contribuția părintelui)"],
  ["Rămâne neacoperit", "max(0, diferență − contribuția ta − contribuțiile fraților)"],
  ["Fond pentru îngrijire", "economisire lunară × luni până la scenariu (fără randamente)"],
  ["Luni acoperite", "fond ÷ diferența lunară"],
  ["Grad de pregătire", "(resurse părinte + contribuții familie) ÷ cost estimat"],
];

function HowItWorks() {
  return (
    <AppShell>
      <PageHeader eyebrow="Transparență" title="Cum facem estimările?" />
      <div className="card-surface p-6 md:p-8">
        <p className="text-lg leading-relaxed">Prototype123 folosește scenarii orientative pentru a ajuta familiile să înțeleagă ordinul de mărime al unei posibile nevoi financiare. Costurile reale pot varia semnificativ în funcție de locație, tipul serviciilor, evoluția prețurilor și situația personală.</p>
        <p className="mt-4 font-semibold">Nu reprezintă consultanță financiară, medicală sau juridică.</p>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-2xl font-semibold">Ipoteze demonstrative</h2>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-2 font-medium">Scenariu</th><th className="py-2 text-right font-medium">Cost lunar</th></tr></thead>
            <tbody className="divide-y">{SCENARIOS.map((s) => <tr key={s.id}><td className="py-3">{s.label}</td><td className="py-3 text-right tabular font-semibold">{ron(PLAN_ASSUMPTIONS.costs[s.id])}</td></tr>)}</tbody>
          </table>
          <p className="mt-4 text-xs text-muted-foreground">Valori pentru hackathon. În viitor: seturi de date verificate pentru România, costuri ajustate cu inflația, proiecții de pensie și beneficii publice.</p>
        </div>
        <div className="card-surface p-6">
          <h2 className="text-2xl font-semibold">Formule</h2>
          <dl className="mt-4 space-y-3 text-sm">{FORMULAS.map(([k, v]) => <div key={k}><dt className="font-semibold">{k}</dt><dd className="text-muted-foreground">{v}</dd></div>)}</dl>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><PrivacyNote /><Button asChild><Link to="/plan">Înapoi la plan</Link></Button></div>
    </AppShell>
  );
}
