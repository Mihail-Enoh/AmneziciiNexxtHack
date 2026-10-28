import { beforeEach, describe, expect, it } from "vitest";
import { CONSENT_KEY, clearConsent, hasConsent, saveConsent } from "@/components/health/consent";
describe("health document consent", () => {
  beforeEach(() => localStorage.clear());
  it("starts unticked and stores only version 1 and an ISO timestamp", () => {
    expect(hasConsent()).toBe(false);
    saveConsent(new Date("2026-10-28T18:00:00.000Z"));
    expect(JSON.parse(localStorage.getItem(CONSENT_KEY)!)).toEqual({ consentVersion: "1", acceptedAt: "2026-10-28T18:00:00.000Z" });
    expect(hasConsent()).toBe(true);
    clearConsent();
    expect(hasConsent()).toBe(false);
  });
});
