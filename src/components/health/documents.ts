import { MAX_FILES, ACCEPTED_IMAGES, imageFileToDataUrl, canvasToDataUrl } from '@/lib/health-files';

export const MAX_PDF_PAGES = 3;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf';
export function selectDocuments(files: File[], existingCount: number) {
  return files.slice(0, Math.max(0, MAX_FILES - existingCount));
}
export function documentError(file: File): string | null {
  if (file.size > MAX_DOCUMENT_BYTES) return 'Fișierul este prea mare. Alege unul de cel mult 20 MB.';
  if (!ACCEPTED_IMAGES.includes(file.type) && file.type !== 'application/pdf') return 'Alege un document PNG, JPG, WEBP sau PDF.';
  return null;
}
async function readBytes(file: File): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof file.arrayBuffer === 'function') return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
/** 64-bit FNV-1a over the bytes (two 32-bit lanes); used only if SHA-256 is unavailable. */
function fnv(bytes: Uint8Array): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ bytes.length;
  for (let i = 0; i < bytes.length; i++) { a = Math.imul(a ^ bytes[i]!, 0x01000193) >>> 0; b = Math.imul(b ^ bytes[i]!, 0x5bd1e995) >>> 0; }
  return `fnv-${a.toString(16)}${b.toString(16)}-${bytes.length}`;
}
/** Same content = same fingerprint, whatever the file name (SHA-256; content hash or name+size as fallbacks). */
export async function fileFingerprint(file: File): Promise<string> {
  let bytes: Uint8Array<ArrayBuffer>;
  try { bytes = await readBytes(file); } catch { return `${file.name}:${file.size}:${file.lastModified}`; }
  try {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return fnv(bytes);
  }
}
export function readError(reason: string): string {
  if (reason === 'no_key') return 'Citirea automată nu este disponibilă momentan. Poți continua fără document.';
  if (reason === 'timeout') return 'Citirea a durat prea mult. Poți încerca din nou.';
  if (reason === 'parse') return 'Nu am putut citi clar analizele. Poți introduce valorile manual.';
  if (reason.startsWith('http_')) return 'Serviciul de citire nu este disponibil momentan. Poți continua manual.';
  return 'Nu am putut citi documentul. Verifică fișierul sau încearcă din nou.';
}
/** Yield one image at a time; PDF pages and source files are never persisted. */
export async function* documentImages(file: File): AsyncGenerator<{ image: string; page: number; total: number }> {
  if (file.type !== 'application/pdf') {
    yield { image: await imageFileToDataUrl(file), page: 1, total: 1 };
    return;
  }
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  try {
    const total = Math.min(MAX_PDF_PAGES, pdf.numPages);
    for (let page = 1; page <= total; page++) {
      const sheet = await pdf.getPage(page);
      const viewport = sheet.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const canvasContext = canvas.getContext('2d');
      if (!canvasContext) throw new Error('canvas');
      await sheet.render({ canvasContext, viewport }).promise;
      const image = canvasToDataUrl(canvas);
      canvas.width = 0; canvas.height = 0; sheet.cleanup();
      yield { image, page, total };
    }
  } finally { await task.destroy(); }
}
