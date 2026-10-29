import { CostBreakdown } from "@/components/app/CostBreakdown";
import { CareTimingInput } from "@/components/app/CareTimingInput";
import {
  computePlan,
  RESIDENTIAL_REFERENCES,
  RESIDENTIAL_SOURCE,
  ron,
} from "@/lib/plan";
import { setPlan, usePlan } from "@/lib/store";
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
          {s.scenario === "residential" && (
            <div className="rounded-xl border p-4 text-sm">
              <p className="font-semibold">
                Repere rezidențiale istorice · document municipal, propunere pentru 2025
              </p>
              <p className="mt-2">
                Standarde anuale propuse, convertite în cost lunar. Nu sunt tarife private, costuri
                actuale garantate sau contribuții datorate de familie.
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
