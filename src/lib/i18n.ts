import { useSyncExternalStore } from "react";
import { english } from "./translations";

export type Language = "ro" | "en";
let language: Language = "ro";
const listeners = new Set<() => void>();
export const LANGUAGE_KEY = "prototype123-language";
export function readLanguage(value: string | null): Language { return value === "en" ? "en" : "ro"; }
export function initializeLanguage() {
  try { language = readLanguage(localStorage.getItem(LANGUAGE_KEY)); } catch { language = "ro"; }
  document.documentElement.lang = language;
  listeners.forEach(fn => fn());
}
export function setLanguage(next: Language) {
  language = next;
  try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* storage unavailable */ }
  document.documentElement.lang = next;
  listeners.forEach(fn => fn());
}
export function useLanguage() {
  const current = useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => language, () => "ro" as Language);
  return current;
}
export function translate(text: string, locale: Language): string {
  if (locale === "ro") return text;
  const trimmed = text.trim();
  const direct = english[text] ?? english[trimmed];
  if (direct) return (text.startsWith(" ") && !direct.startsWith(" ") ? " " : "") + direct + (text.endsWith(" ") && !direct.endsWith(" ") ? " " : "");
  for (const [source, target] of Object.entries(english).sort(([a], [b]) => b.length - a.length)) {
    if (!source.includes("{0}")) continue;
    const pieces = source.split(/\{\d+\}/);
    const expression = "^" + pieces.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.*?)") + "$";
    const match = text.match(new RegExp(expression));
    if (match) return target.replace(/\{(\d+)\}/g, (_, i) => match[Number(i) + 1] ?? "");
  }
  return text;
}
export function useT() {
  const locale = useLanguage();
  return (text: string | number | undefined): string => translate(String(text ?? ""), locale);
}
export function t(text: string | number | undefined): string { return translate(String(text ?? ""), language); }
export function displayName(name: string, locale: Language) {
  if (locale === "ro") return /a$/i.test(name.trim()) ? name.trim().slice(0, -1) + "ei" : `lui ${name.trim()}`;
  return name;
}