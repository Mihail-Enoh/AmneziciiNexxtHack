import { describe, expect, it } from 'vitest';
import { fullName, genitive, splitName, demoState, type PlanState } from '@/lib/plan';
import { applyIntake, blankWithName, parseIntake } from '@/lib/intake';
import { runIntakeCore } from '@/lib/intake.functions';
import { loadPlanFromStorage, setPlan } from '@/lib/store';

describe('names', () => {
  it('full name, split and genitive never say "părinte"', () => {
    expect(fullName({ name: 'Elena', lastName: 'Popescu' })).toBe('Elena Popescu');
    expect(fullName({ name: ' Ion ', lastName: '' })).toBe('Ion');
    expect(fullName({ name: '', lastName: '' })).toBe('Persoana îngrijită');
    expect(splitName('  Maria  Ionescu Pop ')).toEqual({ name: 'Maria', lastName: 'Ionescu Pop' });
    expect(genitive('')).toBe('persoanei');
  });
  it('the typed name wins over the AI and is never "Elena" by default', () => {
    const r = applyIntake(parseIntake('{"parent":{"age":72,"pension":1800,"name":"Mama"}}'), { name: 'Maria Ionescu' });
    expect(r.patch.parent).toMatchObject({ name: 'Maria', lastName: 'Ionescu' });
    const noName = applyIntake(parseIntake('{"parent":{"age":72,"pension":1800}}'));
    expect(noName.patch.parent?.name).toBe('');
    expect(noName.patch.parent?.name).not.toBe(demoState().parent.name);
  });
  it('when the AI fails, the blank plan keeps the typed name', () => {
    const b = blankWithName('Ion Pop');
    expect(b.parent).toMatchObject({ name: 'Ion', lastName: 'Pop', pension: 0, savings: 0 });
    expect(b.members).toEqual([]);
  });
  it('the endpoint passes the typed name through', async () => {
    const { vi } = await import('vitest');
    vi.stubEnv('FEATHERLESS_API_KEY', 'k');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"parent":{"age":70,"pension":2000}}' } }] }))));
    const r = await runIntakeCore('Tata are 70 de ani', 'Vasile Rusu');
    expect(r.ok && r.result.patch.parent).toMatchObject({ name: 'Vasile', lastName: 'Rusu' });
    vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });
  it('an older saved plan never borrows the demo family name', () => {
    const { lastName: _drop, ...parentWithoutLastName } = { ...demoState().parent, name: 'Ion' };
    localStorage.setItem('prototype123-plan-v1', JSON.stringify({ ...demoState(), parent: parentWithoutLastName }));
    loadPlanFromStorage();
    let current: PlanState | null = null;
    setPlan(s => { current = s; return {}; });
    expect(current!.parent).toMatchObject({ name: 'Ion', lastName: '' });
  });
});
