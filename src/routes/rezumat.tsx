import { PlanningAssumptions } from "@/components/app/PlanningAssumptions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquareText, RotateCcw } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell } from "@/components/app/AppShell";
import {
  AnimatedNumber,
  DemoBadge,
  ExplainButton,
  PageHeader,
  PrivacyNote,
  StatusPill,
} from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { computePlan, genitive, ron, scenarioById, type PlanState } from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";

export const Route = createFileRoute("/rezumat")({
  head: () => ({
    meta: [
      { title: "Planul familiei — rezumat și pași următori — Prototype123" },
      {
        name: "description",
        content:
          "Rezumatul planului: costul estimat, resursele părintelui, contribuțiile familiei și pașii următori.",
      },
      { property: "og:title", content: "Planul familiei — Prototype123" },
      {
        property: "og:description",
        content: "Un plan clar, construit împreună, înainte să devină o urgență.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Summary,
});

function explainPlan(s: PlanState, c: ReturnType<typeof computePlan>) {
  const p = s.parent;
  const payers = s.members.filter((m) => m.financial === "da");
  const names = [s.user.name, ...payers.map((m) => m.name)].join(" și ");
  let t = `În scenariul selectat („${scenarioById(s.scenario).label.toLowerCase()}”, în aproximativ ${c.monthsUntilScenario} luni), ${p.name} ar avea nevoie de aproximativ ${ron(c.totalMonthlyNeed)} pe lună pentru îngrijire și deficitul cheltuielilor esențiale rămase. Din venituri și economiile disponibile ar putea acoperi aproximativ ${ron(c.parentCovered)}. `;
  if (c.familyFundingGap === 0) t += "Resursele estimate acoperă costul în prima lună. ";
  t += `${names} intenționează să contribuie împreună cu ${ron(c.familyContributions)}, `;
  t +=
    c.remainingGap > 0
      ? `ceea ce lasă o diferență de aproximativ ${ron(c.remainingGap)} pe lună. `
      : "ceea ce acoperă diferența inițială. ";
  if (s.monthlySaving > 0)
    t += `Dacă ${s.user.name} economisește ${ron(s.monthlySaving)} lunar timp de ${c.monthsUntilScenario} luni, familia ar construi un fond de aproximativ ${ron(c.futureCareReserve)}${c.remainingGap > 0 ? `, suficient pentru circa ${c.monthsOfRemainingCovered} luni din diferența rămasă` : ""}.`;
  return (
    t +
    ` În ultima lună analizată rămân ${ron(c.endRemainingGap)}/lună înainte de utilizarea fondului familiei; fondul acoperă ${c.monthsOfRemainingCovered} din ${c.careDurationMonths} luni proiectate.`
  );
}

function Summary() {
  const s = usePlan();
  const c = computePlan(s);
  const p = s.parent;
  const sc = scenarioById(s.scenario);
  const [explained, setExplained] = useState(false);
  const firstSibling = s.members[0];
  const steps = [
    { id: "talk", text: `Discută planul cu ${p.name}.` },
    ...(firstSibling
      ? [{ id: "invite", text: `Invită-l pe ${firstSibling.name} în plan.` }]
      : [{ id: "invite", text: "Gândește-te cine altcineva din familie ar putea ajuta." }]),
    { id: "save", text: `Pune deoparte ${ron(s.monthlySaving)}/lună pentru fondul de îngrijire.` },
    { id: "review", text: "Revedeți planul peste 12 luni." },
    { id: "update", text: "Actualizează estimările dacă situația familiei se schimbă." },
  ];
  const pie = [
    { id: "parent", name: p.name, value: c.parentCovered, color: "var(--primary)" },
    ...c.familyAllocations.map((member, index) => ({
      id: `family-${member.id}`,
      name: member.name,
      value: member.covered,
      color: index === 0 ? "var(--care)" : index % 2 ? "var(--chart-4)" : "var(--chart-5)",
    })),
    { id: "gap", name: "Neacoperit", value: c.remainingGap, color: "var(--muted)" },
  ].filter((item) => item.value > 0);
  const remainingMsg =
    c.remainingGap > 0
      ? `Mai sunt ${ron(c.remainingGap)}/lună de acoperit din contribuții lunare`
      : "Contribuțiile acoperă diferența inițială";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Rezumat"
        title={`Planul familiei pentru ${p.name}`}
        subtitle="Planul se poate schimba pe măsură ce familia se schimbă."
        right={<StatusPill status={c.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card-surface p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Scenariu țintă</p>
            <DemoBadge />
          </div>
          <p className="mt-1 font-display text-2xl font-semibold">
            {sc.label}, începând în jurul vârstei de {c.scenarioAge} ani
          </p>
          <dl className="mt-6 divide-y">
            {[
              ["Necesar total în prima lună", ron(c.totalMonthlyNeed)],
              [`Resursele ${genitive(p.name)}`, `− ${ron(c.parentCovered)}`],
              ["Diferența de acoperit de familie", ron(c.familyFundingGap)],
              [
                `Contribuția ta utilizată (${s.user.name})`,
                `− ${ron(c.familyAllocations[0]!.covered)}`,
              ],
              ...c.familyAllocations
                .slice(1)
                .map((m) => [`Contribuția utilizată: ${m.name}`, `− ${ron(m.covered)}`]),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-3 text-sm">
                <dt>{k}</dt>
                <dd className="tabular font-semibold">{v}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-4">
              <dt className="font-semibold">Rămâne de acoperit</dt>
              <dd className="font-display text-3xl font-semibold text-care">
                <AnimatedNumber value={c.remainingGap} />
                /lună
              </dd>
            </div>
          </dl>
          <div className="mt-2 rounded-2xl bg-primary-soft p-5 text-sm">
            <p className="font-semibold">Fond pentru îngrijire: {ron(c.futureCareReserve)}</p>
            <p className="mt-1 text-muted-foreground">
              {c.remainingGap > 0
                ? `Împreună cu contribuțiile lunare, fondul finanțează ${c.monthsOfRemainingCovered} din ${c.careDurationMonths} luni. Diferența inițială de ${ron(c.remainingGap)}/lună evoluează conform ipotezelor.`
                : `Diferența inițială este zero; proiecția completă este finanțată pentru ${c.monthsOfRemainingCovered} din ${c.careDurationMonths} luni.`}
            </p>
            <p className="mt-2 font-medium">{remainingMsg}.</p>
          </div>
          <div className="mt-4">
            <ExplainButton
              title="Statusul planului"
              lines={[
                { label: "Rămâne neacoperit lunar", value: ron(c.remainingGap) },
                { label: "Fond pentru îngrijire", value: ron(c.futureCareReserve) },
                {
                  label: "Luni acoperite de fond",
                  value: `${c.monthsOfRemainingCovered}`,
                  op: "=",
                },
              ]}
              note="Pregătit: întreaga perioadă analizată este acoperită. Aproape acoperit: cel puțin 12 luni acoperite. Necesită atenție: sub 12 luni. Economiile părintelui sunt finite; costurile și veniturile evoluează cu ratele alese."
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-surface p-6">
            <h2 className="text-xl font-semibold">Cine acoperă necesarul inițial</h2>
            <div className="h-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pie.map((x) => (
                      <Cell key={x.id} fill={x.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => ron(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {pie.map((x) => (
                <li key={x.id} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm border" style={{ background: x.color }} />
                  {x.name}: {ron(x.value)}
                </li>
              ))}
            </ul>
          </div>
          {s.members.some((m) => m.helps.length) && (
            <div className="card-surface p-6">
              <h2 className="text-xl font-semibold">Ajutor cu timp</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {s.members
                  .filter((m) => m.helps.length)
                  .map((m) => (
                    <li key={m.id}>
                      <strong>{m.name}:</strong> {m.helps.join(", ")}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <PlanningAssumptions />
      <section className="mt-8 card-surface p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Explică-mi planul</h2>
          <Button variant="outline" onClick={() => setExplained(true)}>
            <MessageSquareText /> Explică în cuvinte simple
          </Button>
        </div>
        {explained && (
          <p className="mt-4 animate-rise rounded-2xl bg-care-soft p-5 leading-relaxed">
            „{explainPlan(s, c)}”
          </p>
        )}
      </section>

      <section className="mt-8 card-surface p-6 md:p-8">
        <h2 className="text-2xl font-semibold">Următorii pași</h2>
        <ol className="mt-4 space-y-2">
          {steps.map((st, i) => (
            <li key={st.id}>
              <label className="flex cursor-pointer items-center gap-4 rounded-xl border p-4 has-[button[data-state=checked]]:bg-success-soft">
                <Checkbox
                  checked={!!s.checklist[st.id]}
                  onCheckedChange={(v) => setPlan({ checklist: { ...s.checklist, [st.id]: !!v } })}
                />
                <span className={s.checklist[st.id] ? "text-muted-foreground line-through" : ""}>
                  {i + 1}. {st.text}
                </span>
              </label>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          {Object.values(s.checklist).filter(Boolean).length} din {steps.length} pași bifați
        </p>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <PrivacyNote />
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/start">
              <RotateCcw /> Actualizează datele
            </Link>
          </Button>
          <Button asChild>
            <Link to="/scenarii">Ce se întâmplă dacă...?</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
