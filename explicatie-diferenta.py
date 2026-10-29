# WeCare: „Cum am calculat?” pentru diferența lunară, în ordinea ușor de citit:
#   îngrijire + traiul persoanei (fără ce include deja îngrijirea) = total − pensia = diferența.
# Tipul îngrijirii (de ex. „ajutor zilnic”) apare cu bold. Cifrele nu se schimbă.
# Rulare (din folderul proiectului):  python3 explicatie-diferenta.py   (Windows: python explicatie-diferenta.py)
import io, os, sys

BITS = "src/components/app/bits.tsx"
TEST = "src/test/gap-lines.test.ts"
NEW_IFACE = 'export interface CalcLine { label: string; value: string; op?: "−" | "+" | "=" | "×" | "÷"; /** Part of the label shown in bold. */ strong?: string }\n\n/** A label with its `strong` part in bold. */\nfunction LineLabel({ line }: { line: CalcLine }) {\n  const at = line.strong ? line.label.indexOf(line.strong) : -1;\n  if (!line.strong || at < 0) return <>{line.label}</>;\n  return <>{line.label.slice(0, at)}<strong className="font-bold">{line.strong}</strong>{line.label.slice(at + line.strong.length)}</>;\n}\n\n'
NEW_FN = 'export function gapLines(s: PlanState, c: ReturnType<typeof computePlan>): CalcLine[] {\n  const first = c.projection[0];\n  const sc = scenarioById(s.scenario);\n  const who = s.parent.name.trim();\n  const of = who ? genitive(who) : "persoanei";\n  const replaced = Math.min(replacedExpensesOf(s, s.scenario), Math.max(0, s.parent.expenses));\n  const care = Math.round(c.careMonthlyCost);\n  const lines: CalcLine[] = [{ label: `Îngrijire · ${sc.label.toLowerCase()}, pe lună`, strong: sc.label.toLowerCase(), value: ron(care) }];\n  if (!first) return lines;\n  // Traiul obișnuit al persoanei continuă și în timpul îngrijirii; ce include deja îngrijirea (de ex. masa) nu se numără de două ori.\n  const living = Math.round(first.expenses);\n  if (living > 0 || replaced > 0) {\n    const included = breakdownOf(s, s.scenario).filter((slice) => slice.replacesOwnExpense).map((slice) => slice.label.toLocaleLowerCase("ro-RO")).join(", ");\n    lines.push({\n      label: replaced > 0\n        ? `Traiul ${of}: ${ron(s.parent.expenses)} pe lună, fără ${included || "ce include deja îngrijirea"} (${ron(replaced)}), inclus${included.includes(",") ? "e" : "ă"} deja în îngrijire`\n        : `Traiul ${of} (facturi, mâncare, medicamente), pe lună`,\n      value: ron(living), op: "+",\n    });\n    lines.push({ label: "Total necesar pe lună", value: ron(care + living), op: "=" });\n  }\n  lines.push({ label: `Pensia și veniturile ${of}`, value: ron(first.income), op: "−" });\n  if (first.savingsUsed > 0) lines.push({ label: `Din economiile ${of}`, value: ron(first.savingsUsed), op: "−" });\n  lines.push({ label: "Diferența de acoperit de familie, pe lună", value: ron(c.familyFundingGap), op: "=" });\n  return lines;\n}\n\n'
NEW_DT = '<dt className="text-sm"><LineLabel line={l} /></dt>'
OLD_DT = '<dt className="text-sm">{t(l.label)}</dt>'
NEW_TEST = "import { describe, expect, it } from 'vitest';\nimport { gapLines } from '@/components/app/bits';\nimport { computePlan } from '@/lib/plan';\nimport { blankWithName } from '@/lib/intake';\n\ndescribe('monthly gap explained step by step', () => {\n  it('Gigel: 3000 care + 700 living (1500 minus 800 meals in daily care) = 3700 − 1800 pension = 1900', () => {\n    const base = blankWithName('Gigel Jobbers');\n    const s = { ...base, scenario: 'daily' as const, parent: { ...base.parent, age: 80, pension: 1800, expenses: 1500 }, userContribution: 0 };\n    const c = computePlan(s);\n    const lines = gapLines(s, c);\n    expect(lines.map((l) => [l.op ?? '', l.value])).toEqual([\n      ['', '3.000 RON'], ['+', '700 RON'], ['=', '3.700 RON'], ['−', '1.800 RON'], ['=', '1.900 RON'],\n    ]);\n    expect(lines[1]!.label).toMatch(/1\\.500 RON pe lună, fără masă \\(800 RON\\), inclusă deja în îngrijire/);\n    expect(lines.at(-1)!.label).toBe('Diferența de acoperit de familie, pe lună');\n    expect(lines[0]!.strong).toBe('ajutor zilnic'); // shown in bold in the dialog\n  });\n  it('Maria (demo): 3000 + 1000 = 4000 − 2100 = 1900', () => {\n    const base = blankWithName('Maria Ionescu');\n    const s = { ...base, scenario: 'daily' as const, parent: { ...base.parent, age: 74, pension: 2100, expenses: 1800 } };\n    const lines = gapLines(s, computePlan(s));\n    expect(lines.map((l) => l.value)).toEqual(['3.000 RON', '1.000 RON', '4.000 RON', '2.100 RON', '1.900 RON']);\n  });\n});\n"

if not os.path.isfile("package.json") or not os.path.isfile(BITS):
    sys.exit("Rulează scriptul din folderul proiectului (acolo unde e package.json).")

raw = io.open(BITS, encoding="utf-8", newline="").read()
crlf = "\r\n" in raw
s = raw.replace("\r\n", "\n")

if "function LineLabel(" in s and "strong: sc.label.toLowerCase()" in s:
    print("Deja aplicat. Nimic de făcut.")
    sys.exit(0)

problems = []
# 1) tipul CalcLine + componenta care pune bold
i = s.find("export interface CalcLine")
j = s.find("/**\n * The monthly gap", i)
if i < 0 or j < 0:
    j = s.find("export function gapLines(", i)
if i < 0 or j < 0: problems.append("CalcLine")
# 2) funcția gapLines
k = s.find("export function gapLines(")
m = s.find("export function ExplainButton(", k)
if k < 0 or m < 0: problems.append("gapLines")
# 3) eticheta din fereastră
if s.count(OLD_DT) != 1: problems.append("eticheta din fereastra „Cum am calculat?”")
if problems:
    sys.exit("NU am schimbat nimic. Nu am găsit: " + ", ".join(problems) + ". Trimite-mi fișierul " + BITS + ".")

doc = s[j:k] if s[j:k].startswith("/**") else ""
s = s[:i] + NEW_IFACE + (doc or "") + NEW_FN + s[m:]
s = s.replace(OLD_DT, NEW_DT)
io.open(BITS, "w", encoding="utf-8", newline="").write(s.replace("\n", "\r\n") if crlf else s)
io.open(TEST, "w", encoding="utf-8", newline="").write(NEW_TEST)
print("OK: explicația diferenței lunare e rearanjată, iar tipul îngrijirii apare cu bold.")
