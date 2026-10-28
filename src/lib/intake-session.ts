import type { Chip } from "./intake";

export interface IntakeNote { message: string; filled: Chip[]; assumed: Chip[]; missing: string[] }
const KEY = "prototype123-intake-note";

export function saveIntakeNote(n: IntakeNote) {
  try { sessionStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ }
}
export function readIntakeNote(): IntakeNote | null {
  try { const r = sessionStorage.getItem(KEY); return r ? (JSON.parse(r) as IntakeNote) : null; } catch { return null; }
}
export function clearIntakeNote() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
