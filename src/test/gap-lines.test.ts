import { describe, expect, it } from 'vitest';
import { gapLines } from '@/components/app/bits';
import { computePlan } from '@/lib/plan';
import { blankWithName } from '@/lib/intake';

describe('monthly gap explained step by step', () => {
  it('Gigel: 3000 cost − 1800 pension + 700 own expenses (1500 minus 800 meals in daily care) = 1900', () => {
    const base = blankWithName('Gigel Jobbers');
    const s = { ...base, scenario: 'daily' as const, parent: { ...base.parent, age: 80, pension: 1800, expenses: 1500 }, userContribution: 0 };
    const c = computePlan(s);
    const lines = gapLines(s, c);
    expect(lines.map((l) => [l.op ?? '', l.value])).toEqual([
      ['', '3.000 RON'], ['−', '1.800 RON'], ['+', '700 RON'], ['=', '1.900 RON'],
    ]);
    expect(lines[2]!.label).toMatch(/1\.500 RON, minus 800 RON incluși deja în ajutor zilnic \(masa\)/);
  });
});
