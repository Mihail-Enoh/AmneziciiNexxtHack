import { CostBreakdown } from "@/components/app/CostBreakdown";
import { CareTimingInput } from "@/components/app/CareTimingInput";
import {
  computePlan,
  costReferenceProjections,
  INFLATION_REFERENCE,
  RESIDENTIAL_REFERENCES,
  RESIDENTIAL_SOURCE,
  ron,
} from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CareDateInput() {
  const s = usePlan();
  return (
    <CareTimingInput
      careStartDate={s.careStartDate}
      yearsUntil={s.yearsUntil}
      onChange={(timing) => setPlan(timing)}
    />
  );
}

export function PlanningAssumptions({
  editable = false,
  showTiming = true,
}: {
  editable?: boolean;
  showTiming?: boolean;
}) {
  const s = usePlan();
  const c = computePlan(s);
  const numeric = (
    id: string,
    label: string,
    value: number,
    key: "costGrowth" | "incomeGrowth" | "savingsSpreadMonths" | "careDurationMonths",
    max: number,
    min = 0,
  ) => (
    <div className="space-y-2" key={id}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={key.includes("Growth") ? 0.1 : 1}
        value={value}
        onChange={(e) =>
          setPlan({
            [key]: key.endsWith("Months")
              ? Math.round(Math.max(min, Math.min(max, Number(e.target.value) || min)))
              : Math.max(min, Math.min(max, Number(e.target.value) || min)),
          })
        }
      />
    </div>
  );
  return (
    <section className="card-surface mt-8 space-y-5 p-6">
      <h2 className="text-2xl font-semibold">Ipoteze și proiecții financiare</h2>
      <p className="text-sm">
        Începere: {c.fundingStartLabel} · Durată analizată: {c.careDurationMonths} luni.
      </p>
      {editable && (
        <>
          {showTiming && <CareDateInput />}
          <CostBreakdown />
          <div className="grid gap-4 sm:grid-cols-2">
            {numeric(
              "cost-growth",
              "Creștere anuală costuri și cheltuieli (%)",
              s.costGrowth,
              "costGrowth",
              100,
            )}
            {numeric(
              "income-growth",
              "Creștere anuală venit părinte (%)",
              s.incomeGrowth,
              "incomeGrowth",
              100,
            )}
            {numeric(
              "savings-months",
              "Perioada utilizării economiilor (luni)",
              s.savingsSpreadMonths,
              "savingsSpreadMonths",
              600,
              1,
            )}
            {numeric(
              "care-duration",
              "Durata îngrijirii analizate (luni)",
              s.careDurationMonths,
              "careDurationMonths",
              600,
              1,
            )}
          </div>
          <div className="rounded-xl bg-primary-soft p-4 text-sm">
            <p>Repere de inflație: ținta BNR, nu prognoze pentru servicii de îngrijire.</p>
            <div className="my-3 flex flex-wrap gap-2">
              {[INFLATION_REFERENCE.low, INFLATION_REFERENCE.rate, INFLATION_REFERENCE.high].map(
                (rate) => (
                  <Button
                    key={rate}
                    variant="outline"
                    onClick={() => setPlan({ costGrowth: rate })}
                  >
                    {rate}% / an
                  </Button>
                ),
              )}
            </div>
            <div className="mb-3 overflow-auto">
              <table className="w-full text-left">
                <caption className="text-left">
                  Proiecții matematice ale costului de bază ales, fără a reprezenta prognoze
                  oficiale
                </caption>
                <thead>
                  <tr>
                    <th>Ani</th>
                    <th>1,5%/an</th>
                    <th>2,5%/an</th>
                    <th>3,5%/an</th>
                  </tr>
                </thead>
                <tbody>
                  {costReferenceProjections(s.costs[s.scenario]).map((row) => (
                    <tr key={row.years}>
                      <td>{row.years}</td>
                      <td>{ron(row.low)}</td>
                      <td>{ron(row.target)}</td>
                      <td>{ron(row.high)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              className="underline"
              href={INFLATION_REFERENCE.url}
              target="_blank"
              rel="noreferrer"
            >
              {INFLATION_REFERENCE.label}
            </a>
          </div>
          {s.scenario === "residential" && (
            <div className="rounded-xl border p-4 text-sm">
              <p className="font-semibold">
                Repere rezidențiale istorice · document municipal, propunere pentru 2025
              </p>
              <p className="mt-2">
                Standarde anuale propuse, convertite în cost lunar. Nu sunt tarife private, costuri
                actuale garantate sau contribuții datorate de familie. Aplicarea copiază valoarea
                istorică drept bază de simulare; actualizeaz-o cu o ofertă înainte de utilizare.
              </p>
              <div className="my-3 flex flex-wrap gap-2">
                {RESIDENTIAL_REFERENCES.map((r) => (
                  <Button
                    key={r.annual}
                    variant="outline"
                    className="h-auto whitespace-normal text-left"
                    onClick={() => {
                      const costBreakdown = { ...s.costBreakdown };
                      delete costBreakdown.residential;
                      setPlan({ costBreakdown, costs: { ...s.costs, residential: r.monthly } });
                    }}
                  >
                    {r.label}: {ron(r.monthly)}/lună
                  </Button>
                ))}
              </div>
              <a className="underline" href={RESIDENTIAL_SOURCE} target="_blank" rel="noreferrer">
                Primăria Târgoviște · proiect nr. 449/2024, pentru 2025
              </a>
            </div>
          )}
        </>
      )}
      <p className="text-sm">
        Necesar inițial: {ron(c.careMonthlyCost)} pentru îngrijire + {ron(c.essentialShortfall)}{" "}
        deficit pentru cheltuielile esențiale rămase = {ron(c.totalMonthlyNeed)}/lună. Suma rămasă
        nefinanțată pe întreaga perioadă, după fond: {ron(c.totalUnfunded)}.
      </p>
      <p className="text-sm text-muted-foreground">
        Costurile de bază sunt demonstrative sau introduse de tine. Creștere costuri: {s.costGrowth}
        %/an; venituri: {s.incomeGrowth}%/an. Fără randamente, taxe sau subvenții publice presupuse.
        Contribuțiile familiei și economisirea lunară rămân fixe. Economiile existente nu cresc
        înainte de începerea îngrijirii. Localitatea, locuința, bunurile și independența sunt
        informații de context; nu modifică automat costurile. Venitul și economisirea personală nu
        stabilesc automat contribuția familiei: tu alegi contribuția și fondul.
      </p>
      <div className="grid gap-4 sm:grid-cols-3" aria-live="polite">
        <div>
          <p className="text-sm text-muted-foreground">Cost la începutul îngrijirii</p>
          <p className="text-xl font-semibold">{ron(c.careMonthlyCost)}/lună</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Diferență în ultima lună, înainte de fond</p>
          <p className="text-xl font-semibold">{ron(c.endRemainingGap)}/lună</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Fondul acoperă diferența rămasă</p>
          <p className="text-xl font-semibold">
            {c.monthsOfRemainingCovered} din {c.careDurationMonths} luni
          </p>
        </div>
      </div>
      <p className="text-sm">
        {!s.useSavings
          ? "Economiile părintelui nu sunt utilizate."
          : c.parentSavingsExhaustedMonth !== null
            ? `Economiile părintelui se epuizează la sfârșitul lunii ${c.parentSavingsExhaustedMonth}; apoi contribuția lor este zero.`
            : `Economiile părintelui nu se epuizează în perioada analizată (${s.careDurationMonths} luni).`}{" "}
        Statusul „Pregătit” înseamnă că fondul și contribuțiile acoperă întreaga perioadă analizată.
      </p>
      {c.monthsUntilScenario === 0 && c.targetReserve > 0 && (
        <p className="text-sm font-semibold text-care">
          Îngrijirea începe acum: nu există timp de acumulare. Fond necesar pentru primele{" "}
          {c.targetMonths} luni: {ron(c.targetReserve)}.
        </p>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Vezi evoluția lunară și epuizarea economiilor
        </summary>
        <div className="mt-3 max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="pb-2 text-left">
              Valori nominale, rotunjite la afișare. Fondul familiei se consumă pentru diferența
              rămasă.
            </caption>
            <thead>
              <tr>
                <th scope="col">Luna</th>
                <th scope="col">Cost</th>
                <th scope="col">Necesar total</th>
                <th scope="col">Părinte</th>
                <th scope="col">Familie</th>
                <th scope="col">Economii părinte rămase</th>
                <th scope="col">Diferență înainte de fond</th>
                <th scope="col">Fond utilizat</th>
                <th scope="col">Fond rămas</th>
                <th scope="col">Nefinanțat</th>
              </tr>
            </thead>
            <tbody>
              {c.projection.map((r) => (
                <tr key={r.month} className="border-t">
                  <td>{r.month}</td>
                  <td>{ron(r.cost)}</td>
                  <td>{ron(r.need)}</td>
                  <td>{ron(r.parent)}</td>
                  <td>{ron(r.family)}</td>
                  <td>{ron(r.savingsLeft)}</td>
                  <td>{ron(r.remaining)}</td>
                  <td>{ron(r.reserveUsed)}</td>
                  <td>{ron(r.reserveLeft)}</td>
                  <td>{ron(r.unfunded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
