// WeCare — partner offers (business model). The family pays the partner a discounted price;
// the partner pays WeCare a commission. Offers never change the plan's numbers.
// Partners below are fictitious examples. Edit prices and commissions here.
import type { Intensity, PlanState } from "./plan";

export const OFFER_RULES = {
  /** Discount negotiated for WeCare families on care services, vs. the plan's own cost estimate. */
  careDiscount: 0.1,
  /** Share of the discounted price the care partner pays WeCare. */
  careCommission: 0.08,
  /** Senior subscription at a clinic network (RON per month). */
  clinicStandard: 190,
  clinicPrice: 160,
  clinicCommission: 25,
};

export type OfferId = "care" | "clinic";
export interface Offer {
  id: OfferId;
  partner: string;
  title: string;
  /** Usual monthly price and the price through WeCare (RON). */
  standard: number;
  price: number;
  savingPerYear: number;
  /** What the partner pays WeCare per month (RON). Not shown to families. */
  commission: number;
}

const CARE: Record<Intensity, { partner: string; title: string }> = {
  occasional: { partner: "Senioria Acasă", title: "Ajutor ocazional la domiciliu" },
  frequent: { partner: "Senioria Acasă", title: "Îngrijitoare de câteva ori pe săptămână" },
  daily: { partner: "Senioria Acasă", title: "Îngrijitoare zilnică la domiciliu" },
  residential: { partner: "Rezidența Livada Verde", title: "Cămin cu îngrijire permanentă" },
};

const round10 = (n: number) => Math.round(n / 10) * 10;

/** Care offer for the chosen scenario; the usual price is the plan's own monthly cost estimate. */
export function careOffer(scenario: Intensity, standard: number): Offer {
  const price = round10(standard * (1 - OFFER_RULES.careDiscount));
  return {
    id: "care", ...CARE[scenario], standard, price,
    savingPerYear: (standard - price) * 12,
    commission: Math.round(price * OFFER_RULES.careCommission),
  };
}

export function clinicOffer(): Offer {
  const { clinicStandard: standard, clinicPrice: price, clinicCommission: commission } = OFFER_RULES;
  return { id: "clinic", partner: "Clinicile Bunăstare", title: "Abonament medical Senior", standard, price, savingPerYear: (standard - price) * 12, commission };
}

/** The offers shown for a plan: care matching the chosen scenario, plus a clinic subscription. */
export function offersFor(s: Pick<PlanState, "scenario" | "costs">): Offer[] {
  const standard = Math.round(s.costs[s.scenario] ?? 0);
  return [...(standard >= 100 ? [careOffer(s.scenario, standard)] : []), clinicOffer()];
}
