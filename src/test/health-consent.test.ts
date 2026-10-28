import { beforeEach, describe, expect, it } from "vitest";
import { activeConsentKey, clearConsent, hasConsent, saveConsent } from "@/components/health/consent";
describe("health document consent", () => {
  beforeEach(() => localStorage.clear());
  it("starts unticked and stores only version 1 and an ISO timestamp", () => {
    expect(hasConsent()).toBe(false);
    saveConsent(new Date("2026-10-28T18:00:00.000Z"));
    expect(JSON.parse(localStorage.getItem(activeConsentKey())!)).toEqual({ consentVersion: "2", acceptedAt: "2026-10-28T18:00:00.000Z" });
    expect(hasConsent()).toBe(true);
    clearConsent();
    expect(hasConsent()).toBe(false);
  });
});
