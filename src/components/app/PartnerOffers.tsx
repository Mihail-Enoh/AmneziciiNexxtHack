import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCheckoutFn } from "@/lib/checkout.functions";
import { offersFor, type OfferId } from "@/lib/offers";
import { ron, type PlanState } from "@/lib/plan";

/** Partner offers for the chosen plan, paid through Stripe Checkout. The plan's numbers do not change. */
export function PartnerOffers({ plan }: { plan: PlanState }) {
  const checkout = useServerFn(startCheckoutFn);
  const offers = offersFor(plan);
  const [busy, setBusy] = useState<OfferId | null>(null);
  const [problem, setProblem] = useState("");
  const [paid, setPaid] = useState(false);
  useEffect(() => { setPaid(new URLSearchParams(window.location.search).get("plata") === "ok"); }, []);

  const choose = async (id: OfferId) => {
    setBusy(id); setProblem("");
    try {
      const r = await checkout({ data: { offer: id, scenario: plan.scenario, standard: Math.round(plan.costs[plan.scenario]), origin: window.location.origin } });
      if (r.ok) { window.location.assign(r.url); return; }
    } catch { /* message below */ }
    setProblem("Plata online nu este disponibilă momentan. Încearcă din nou mai târziu.");
    setBusy(null);
  };

  return (
    <section className="mt-8 card-surface p-6 md:p-8" aria-labelledby="offers-title">
      <h2 id="offers-title" className="text-2xl font-semibold">Oferte pentru planul tău</h2>
      {paid && <p role="status" className="mt-4 rounded-lg bg-success-soft p-3 text-sm font-medium">Plata a fost înregistrată. Mulțumim!</p>}
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {offers.map((o) => (
          <li key={o.id} className="flex flex-col rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{o.partner}</p>
            <p className="mt-1 font-semibold">{o.title}</p>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm text-muted-foreground line-through">{ron(o.standard)}</span>
              <span className="font-display text-2xl font-semibold text-care">{ron(o.price)}</span>
              <span className="text-sm text-muted-foreground">pe lună</span>
            </p>
            <p className="mt-1 text-sm font-medium text-success">Economisești {ron(o.savingPerYear)} pe an</p>
            <Button className="mt-4 self-start" disabled={busy !== null} onClick={() => void choose(o.id)}>
              {busy === o.id && <Loader2 className="animate-spin" />}Alege oferta
            </Button>
          </li>
        ))}
      </ul>
      {problem && <p role="alert" className="mt-4 rounded-lg bg-warning-soft p-3 text-sm">{problem}</p>}
    </section>
  );
}
