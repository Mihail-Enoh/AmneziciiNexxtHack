import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { careOffer, clinicOffer, offersFor, OFFER_RULES } from "@/lib/offers";
import { checkoutParams, createCheckoutCore } from "@/lib/checkout.functions";
import { computePlan, demoState } from "@/lib/plan";

const checkoutMock = vi.fn();
vi.mock("@tanstack/react-start", async (orig) => ({ ...(await orig<object>()), useServerFn: () => checkoutMock }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); checkoutMock.mockReset(); });

describe("partner offers", () => {
  it("care offer: 10% under the plan's own cost, rounded to 10 lei; WeCare commission from the partner", () => {
    const o = careOffer("daily", 3000);
    expect(o).toMatchObject({ partner: "Senioria Acasă", standard: 3000, price: 2700, savingPerYear: 3600, commission: 216 });
  });
  it("matches the chosen scenario and always adds the clinic subscription", () => {
    const s = demoState();
    const offers = offersFor({ ...s, scenario: "residential" });
    expect(offers.map((o) => o.id)).toEqual(["care", "clinic"]);
    expect(offers[0]!.title).toBe("Cămin cu îngrijire permanentă");
    expect(clinicOffer()).toMatchObject({ standard: OFFER_RULES.clinicStandard, price: OFFER_RULES.clinicPrice, savingPerYear: 360 });
  });
  it("never changes the plan's numbers", () => {
    const s = demoState();
    const before = JSON.stringify(computePlan(s, s.scenario, new Date("2026-10-29")));
    offersFor(s);
    expect(JSON.stringify(computePlan(s, s.scenario, new Date("2026-10-29")))).toBe(before);
  });
});

describe("Stripe Checkout (test mode only, mocked)", () => {
  const req = { offer: "care" as const, scenario: "daily" as const, standard: 3000, origin: "https://wecare.example/plan" };
  it("refuses live keys and missing keys", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    expect(await createCheckoutCore(req)).toEqual({ ok: false, reason: "no_key" });
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(await createCheckoutCore(req)).toEqual({ ok: false, reason: "no_key" });
  });
  it("creates a monthly subscription in RON at the WeCare price, recomputed on the server", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_abc");
    const f = vi.fn(async () => new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/x" }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect(await createCheckoutCore(req)).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/x" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk_test_abc");
    const p = new URLSearchParams(init.body as string);
    expect(p.get("mode")).toBe("subscription");
    expect(p.get("line_items[0][price_data][currency]")).toBe("ron");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("270000");
    expect(p.get("success_url")).toBe("https://wecare.example/rezumat?plata=ok");
    expect(p.get("metadata[wecare_commission_ron]")).toBe("216");
    expect(p.has("subscription_data[transfer_data][destination]")).toBe(false);
  });
  it("with a partner account, the money goes to the partner and WeCare keeps its commission (Connect)", () => {
    const p = checkoutParams(careOffer("daily", 3000), "https://wecare.example", "acct_123");
    expect(p.get("subscription_data[transfer_data][destination]")).toBe("acct_123");
    expect(p.get("subscription_data[application_fee_percent]")).toBe("8");
  });
  it("a Stripe error is reported, not thrown", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_abc");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "bad" } }), { status: 400 })));
    expect(await createCheckoutCore(req)).toEqual({ ok: false, reason: "stripe" });
  });
});

describe("offer cards", () => {
  it("show both prices and a friendly message when payment is not available", async () => {
    const { PartnerOffers } = await import("@/components/app/PartnerOffers");
    checkoutMock.mockResolvedValue({ ok: false, reason: "no_key" });
    render(<PartnerOffers plan={{ ...demoState(), scenario: "daily" }} />);
    expect(screen.getByText("Îngrijitoare zilnică la domiciliu")).toBeTruthy();
    expect(screen.getByText("Abonament medical Senior")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Alege oferta" })[0]!);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Plata online nu este disponibilă"));
    expect(checkoutMock.mock.calls[0]![0].data).toMatchObject({ offer: "care", scenario: "daily" });
  });
});
