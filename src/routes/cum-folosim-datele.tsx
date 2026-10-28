import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/app/AppShell";

export const Route = createFileRoute("/cum-folosim-datele")({
  head: () => ({
    meta: [
      { title: "Cum folosim datele — Prototype123" },
      { name: "description", content: "Ce date colectăm, unde rămân rezultatele și cum sunt procesate textele și imaginile în Prototype123." },
      { property: "og:title", content: "Cum folosim datele — Prototype123" },
      { property: "og:description", content: "Fișierele nu sunt salvate, iar rezultatele rămân doar în fila ta de browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataPage,
});

const SECTIONS = [
  { title: "Ce colectăm", text: "Doar ce alegi tu să ne spui: datele planului (vârstă, venituri, cheltuieli, economii, membrii familiei), povestea scrisă despre sănătatea și obiceiurile părintelui, răspunsurile la chestionar și, opțional, imagini ale analizelor medicale. Pentru cont păstrăm doar adresa de email și numele afișat." },
  { title: "Fișierele nu sunt salvate", text: "Documentele încărcate sunt citite în memorie și nu sunt salvate nicăieri — nici pe serverele noastre, nici în browser. Când închizi pagina, ele dispar." },
  { title: "Rezultatele rămân în această filă", text: "Povestea, răspunsurile și scenariile de îngrijire sunt păstrate doar în această filă de browser, pe durata sesiunii. Planul financiar și setările rămân în acest browser. Le poți șterge oricând din Setări → „Șterge toate datele”." },
  { title: "Procesare prin furnizorul nostru de AI", text: "Pentru a înțelege textul și a citi valorile din imagini, textul și imaginile sunt trimise pentru procesare furnizorului nostru de inteligență artificială, Featherless. Îți recomandăm să acoperi numele, CNP-ul și adresa înainte de a fotografia un document." },
  { title: "Nu este o evaluare medicală", text: "Prototype123 construiește scenarii de îngrijire pentru planificarea financiară a familiei. Nu oferă evaluări medicale și nu înlocuiește medicul. Discută orice întrebare despre sănătate cu un specialist." },
];

function DataPage() {
  return <>
    <PublicHeader />
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-5" />Confidențialitate</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Cum folosim datele</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">Pe scurt: păstrăm cât mai puțin, cât mai aproape de tine.</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map(s => <section key={s.title} className="border-t pt-6"><h2 className="text-xl font-semibold">{s.title}</h2><p className="mt-2 leading-relaxed text-muted-foreground">{s.text}</p></section>)}
      </div>
      <Link to="/sanatate" className="mt-10 inline-block font-semibold text-primary underline underline-offset-4">Înapoi la Sănătate și obiceiuri</Link>
    </main>
  </>;
}
