import { consentKey, getActiveProfileId } from "@/lib/store";

export const CONSENT_KEY = "prototype123-health-consent";
/** Consent is given per person (the documents are about that person). */
export const activeConsentKey = () => consentKey(getActiveProfileId());
export const CONSENT_VERSION = "2";
export type HealthConsent = { consentVersion: string; acceptedAt: string };

export function saveConsent(now: Date = new Date()): HealthConsent {
  const value: HealthConsent = { consentVersion: CONSENT_VERSION, acceptedAt: now.toISOString() };
  try { localStorage.setItem(activeConsentKey(), JSON.stringify(value)); } catch { /* storage unavailable */ }
  return value;
}
export function clearConsent() {
  try { localStorage.removeItem(activeConsentKey()); } catch { /* storage unavailable */ }
}
export function hasConsent(): boolean {
  try {
    const value = JSON.parse(localStorage.getItem(activeConsentKey()) ?? "null") as HealthConsent | null;
    return value?.consentVersion === CONSENT_VERSION && !Number.isNaN(Date.parse(value.acceptedAt));
  } catch { return false; }
}
