// Prototype123 — browser helpers for the health feature (client only). Owner: P3.
import type { HealthAssessment, LabResult, QuizAnswers } from "./health";
import { getActiveProfileId, healthSessionKey } from "./store";

export const MAX_FILES = 3;
export const ACCEPTED_IMAGES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Shrink a photo before upload: max 1600 px on the long side, JPEG 0.85.
 * Keeps lab reports readable while the request stays ~200–600 KB.
 * Throws for unsupported files (e.g. HEIC from some iPhones) so the UI can show a message.
 */
export async function imageFileToDataUrl(file: File, maxSide = 1600, quality = 0.85): Promise<string> {
  if (!ACCEPTED_IMAGES.includes(file.type)) throw new Error("unsupported");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff"; // transparent PNGs → white paper
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

/** Same for a canvas you already rendered (e.g. a PDF page drawn with pdfjs-dist). */
export function canvasToDataUrl(canvas: HTMLCanvasElement, maxSide = 1600, quality = 0.85): string {
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
  if (scale === 1) return canvas.toDataURL("image/jpeg", quality);
  const c = document.createElement("canvas");
  c.width = Math.round(canvas.width * scale);
  c.height = Math.round(canvas.height * scale);
  c.getContext("2d")?.drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

// Keep the health flow across pages for this browser tab only (never persisted, never sent anywhere else).
/** One health session per person (this browser tab only). */
const key = () => healthSessionKey(getActiveProfileId());
export interface HealthSession {
  story: string; answers: QuizAnswers; assessment: HealthAssessment | null;
  /** Lab results read so far (also before a result exists) and fingerprints of the documents already read. */
  labs?: LabResult[]; docHashes?: string[];
}

export function saveHealthSession(s: HealthSession) {
  try { sessionStorage.setItem(key(), JSON.stringify(s)); } catch { /* ignore */ }
}
export function readHealthSession(): HealthSession | null {
  try { const r = sessionStorage.getItem(key()); return r ? (JSON.parse(r) as HealthSession) : null; } catch { return null; }
}
export function clearHealthSession() {
  try { sessionStorage.removeItem(key()); } catch { /* ignore */ }
}