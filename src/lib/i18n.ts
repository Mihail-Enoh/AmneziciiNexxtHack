// Aplicația este disponibilă doar în limba română.
// Helperii rămân ca funcții identitate pentru a nu modifica textele existente.
export function useT() {
  return (text: string | number | undefined): string => String(text ?? "");
}
export function t(text: string | number | undefined): string { return String(text ?? ""); }
/** Forma de genitiv pentru un nume („Elenei”, „lui Ion”). */
export function displayName(name: string) {
  return /a$/i.test(name.trim()) ? name.trim().slice(0, -1) + "ei" : `lui ${name.trim()}`;
}
