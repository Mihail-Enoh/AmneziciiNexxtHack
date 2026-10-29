import { describe, expect, it } from 'vitest';
import { gapLines } from '@/components/app/bits';
import { computePlan } from '@/lib/plan';
import { blankWithName } from '@/lib/intake';

describe('monthly gap explained step by step', () => {
  it('Gigel: 3000 care + 700 living (1500 minus 800 meals in daily care) = 3700 − 1800 pension = 1900', () => {
    const base = blankWithName('Gigel Jobbers');
    const s = { ...base, scenario: 'daily' as const, parent: { ...base.parent, age: 80, pension: 1800, expenses: 1500 }, userContribution: 0 };
    const c = computePlan(s);
    const lines = gapLines(s, c);
    expect(lines.map((l) => [l.op ?? '', l.value])).toEqual([
      ['', '3.000 RON'], ['+', '700 RON'], ['=', '3.700 RON'], ['−', '1.800 RON'], ['=', '1.900 RON'],
    ]);
    expect(lines[1]!.label).toMatch(/1\.500 RON pe lună, fără masă \(800 RON\), inclusă deja în îngrijire/);
    expect(lines.at(-1)!.label).toBe('Diferența de acoperit de familie, pe lună');
    expect(lines[0]!.strong).toBe('ajutor zilnic'); // shown in bold in the dialog
  });
  it('Maria (demo): 3000 + 1000 = 4000 − 2100 = 1900', () => {
    const base = blankWithName('Maria Ionescu');
    const s = { ...base, scenario: 'daily' as const, parent: { ...base.parent, age: 74, pension: 2100, expenses: 1800 } };
    const lines = gapLines(s, computePlan(s));
    expect(lines.map((l) => l.value)).toEqual(['3.000 RON', '1.000 RON', '4.000 RON', '2.100 RON', '1.900 RON']);
  });
});
