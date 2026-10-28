export const CONSENT_KEY = "prototype123-health-consent";
export const CONSENT_VERSION = "2";
export type HealthConsent = { consentVersion: string; acceptedAt: string };

export function saveConsent(now: Date = new Date()): HealthConsent {
  const value: HealthConsent = { consentVersion: CONSENT_VERSION, acceptedAt: now.toISOString() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); } catch { /* storage unavailable */ }
  return value;
}
export function clearConsent() {
  try { localStorage.removeItem(CONSENT_KEY); } catch { /* storage unavailable */ }
}
export function hasConsent(): boolean {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") as HealthConsent | null;
    return value?.consentVersion === CONSENT_VERSION && !Number.isNaN(Date.parse(value.acceptedAt));
  } catch { return false; }
}
