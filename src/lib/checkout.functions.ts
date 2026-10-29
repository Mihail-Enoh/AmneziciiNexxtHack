// WeCare — Stripe Checkout for a partner offer (TEST MODE ONLY: the key must start with sk_test_).
// Secrets (server-only): STRIPE_SECRET_KEY; optional STRIPE_PARTNER_ACCOUNT (acct_…) — then the payment goes
// to the partner's connected account and WeCare keeps its commission as an application fee (Stripe Connect).
// The price is recomputed here; the browser only says which offer and which plan cost.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { careOffer, clinicOffer, type Offer } from "./offers";

const env = (name: string) => process.env[name]?.trim() || "";

export const CheckoutInput = z.object({
  offer: z.enum(["care", "clinic"]),
  scenario: z.enum(["occasional", "frequent", "daily", "residential"]),
  standard: z.number().int().min(100).max(50_000),
  origin: z.string().max(200).regex(/^https?:\/\/[^/\s]+/),
});
export type CheckoutRequest = z.infer<typeof CheckoutInput>;
export type CheckoutResponse = { ok: true; url: string } | { ok: false; reason: "no_key" | "stripe" };

/** Form fields for POST /v1/checkout/sessions (monthly subscription, price in bani). */
export function checkoutParams(o: Offer, origin: string, partnerAccount = ""): URLSearchParams {
  const base = new URL(origin).origin;
  const p = new URLSearchParams({
    mode: "subscription",
    locale: "ro",
    success_url: `${base}/rezumat?plata=ok`,
    cancel_url: `${base}/rezumat`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "ron",
    "line_items[0][price_data][unit_amount]": String(o.price * 100),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `${o.title} · ${o.partner}`,
    "metadata[partner]": o.partner,
    "metadata[offer]": o.id,
    "metadata[wecare_commission_ron]": String(o.commission),
  });
  if (/^acct_\w+$/.test(partnerAccount)) {
    p.set("subscription_data[transfer_data][destination]", partnerAccount);
    p.set("subscription_data[application_fee_percent]", String(Math.round((o.commission / o.price) * 10000) / 100));
  }
  return p;
}

/** Plain function (testable). Never logs the key. */
export async function createCheckoutCore(d: CheckoutRequest): Promise<CheckoutResponse> {
  const key = env("STRIPE_SECRET_KEY");
  if (!key.startsWith("sk_test_")) return { ok: false, reason: "no_key" };
  const offer = d.offer === "care" ? careOffer(d.scenario, d.standard) : clinicOffer();
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: checkoutParams(offer, d.origin, env("STRIPE_PARTNER_ACCOUNT")).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) {
      console.error("checkout: stripe error", res.status, json.error?.message ?? "");
      return { ok: false, reason: "stripe" };
    }
    return { ok: true, url: json.url };
  } catch {
    console.error("checkout: network error");
    return { ok: false, reason: "stripe" };
  }
}

export const startCheckoutFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CheckoutInput.parse(d))
  .handler(({ data }): Promise<CheckoutResponse> => createCheckoutCore(data));
