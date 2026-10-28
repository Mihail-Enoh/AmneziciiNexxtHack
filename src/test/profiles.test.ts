import { beforeEach, describe, expect, it, vi } from 'vitest';

async function fresh() {
  vi.resetModules();
  return await import('@/lib/store');
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('several people', () => {
  it('starts with the example person', async () => {
    const s = await fresh();
    s.loadPlanFromStorage();
    expect(s.getActiveProfileId()).toBe(s.DEMO_ID);
  });

  it('adds, switches and keeps plans separate', async () => {
    const s = await fresh();
    const { blankWithName } = await import('@/lib/intake');
    const a = s.addProfile(blankWithName('Maria Ionescu'));
    s.setPlan({ yearsUntil: 3 });
    const b = s.addProfile(blankWithName('Ion Pop'));
    expect(s.getActiveProfileId()).toBe(b);
    s.setPlan({ yearsUntil: 9 });
    s.switchProfile(a);
    const store = await import('@/lib/store');
    expect(JSON.parse(localStorage.getItem('prototype123-plan-v1')!).parent.name).toBe('Maria');
    expect(JSON.parse(localStorage.getItem('prototype123-plan-v1')!).yearsUntil).toBe(3);
    expect(store.getActiveProfileId()).toBe(a);
  });

  it('restores all people after reload', async () => {
    let s = await fresh();
    const { blankWithName } = await import('@/lib/intake');
    const a = s.addProfile(blankWithName('Maria Ionescu'));
    s.addProfile(blankWithName('Ion Pop'));
    s.switchProfile(a);
    s = await fresh();
    s.loadPlanFromStorage();
    expect(s.getActiveProfileId()).toBe(a);
    const raw = JSON.parse(localStorage.getItem('prototype123-profiles-v1')!);
    expect(raw.order).toHaveLength(3);
  });

  it('migrates a plan saved before profiles existed', async () => {
    const { demoState } = await import('@/lib/plan');
    localStorage.setItem('prototype123-plan-v1', JSON.stringify({ ...demoState(), parent: { ...demoState().parent, name: 'Vechi' } }));
    const s = await fresh();
    s.loadPlanFromStorage();
    expect(s.getActiveProfileId()).toBe('p1');
    expect(JSON.parse(localStorage.getItem('prototype123-profiles-v1')!).plans.p1.parent.name).toBe('Vechi');
  });

  it('removes a person with their health data, never the last one', async () => {
    const s = await fresh();
    expect(s.removeProfile(s.DEMO_ID)).toBe(false);
    const a = s.addProfile();
    sessionStorage.setItem(s.healthSessionKey(a), '{}');
    localStorage.setItem(s.consentKey(a), '{}');
    expect(s.removeProfile(a)).toBe(true);
    expect(s.getActiveProfileId()).toBe(s.DEMO_ID);
    expect(sessionStorage.getItem(s.healthSessionKey(a))).toBeNull();
    expect(localStorage.getItem(s.consentKey(a))).toBeNull();
  });

  it('the example never overwrites a person you added', async () => {
    const s = await fresh();
    const { blankWithName } = await import('@/lib/intake');
    const a = s.addProfile(blankWithName('Maria Ionescu'));
    s.loadDemo();
    expect(s.getActiveProfileId()).toBe(s.DEMO_ID);
    s.switchProfile(a);
    expect(JSON.parse(localStorage.getItem('prototype123-plan-v1')!).parent.name).toBe('Maria');
  });

  it('keeps health answers per person', async () => {
    const s = await fresh();
    const files = await import('@/lib/health-files');
    files.saveHealthSession({ story: 'demo story' } as never);
    s.addProfile();
    expect(files.readHealthSession()?.story ?? '').toBe('');
    s.switchProfile(s.DEMO_ID);
    expect(files.readHealthSession()?.story).toBe('demo story');
  });
});
