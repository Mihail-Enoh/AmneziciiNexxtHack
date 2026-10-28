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
    expect(JSON.parse(sessionStorage.getItem('prototype123-plan-v1')!).parent.name).toBe('Maria');
    expect(JSON.parse(sessionStorage.getItem('prototype123-plan-v1')!).yearsUntil).toBe(3);
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
    const raw = JSON.parse(sessionStorage.getItem('prototype123-profiles-v1')!);
    expect(raw.order).toHaveLength(3);
  });

  it('migrates a plan saved before profiles existed', async () => {
    const { demoState } = await import('@/lib/plan');
    localStorage.setItem('prototype123-plan-v1', JSON.stringify({ ...demoState(), parent: { ...demoState().parent, name: 'Vechi' } }));
    const s = await fresh();
    s.loadPlanFromStorage();
    expect(s.getActiveProfileId()).toBe('p1');
    expect(JSON.parse(sessionStorage.getItem('prototype123-profiles-v1')!).plans.p1.parent.name).toBe('Vechi');
    expect(localStorage.getItem('prototype123-plan-v1')).toBeNull(); // old guest data no longer kept forever
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
    expect(JSON.parse(sessionStorage.getItem('prototype123-plan-v1')!).parent.name).toBe('Maria');
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

describe('accounts', () => {
  it('a guest keeps people only in this tab (sessionStorage), never in localStorage', async () => {
    const s = await fresh();
    const { blankWithName } = await import('@/lib/intake');
    s.loadPlanFromStorage();
    s.addProfile(blankWithName('Maria Ionescu'));
    expect(sessionStorage.getItem('prototype123-profiles-v1')).toContain('Maria');
    expect(Object.keys(localStorage).filter((k) => k.startsWith('prototype123-profiles'))).toEqual([]);
  });
  it('signing in keeps the guest people in the account; they survive a new visit', async () => {
    let s = await fresh();
    const { blankWithName } = await import('@/lib/intake');
    s.loadPlanFromStorage();
    const maria = s.addProfile(blankWithName('Maria Ionescu'));
    s.setAccount('user-1');
    expect(s.getActiveProfileId()).toBe(maria);
    expect(sessionStorage.getItem('prototype123-profiles-v1')).toBeNull();
    sessionStorage.clear(); // the browser was closed
    s = await fresh();
    s.loadPlanFromStorage();
    s.setAccount('user-1');
    expect(s.getActiveProfileId()).toBe(maria);
  });
  it('signing out starts again from the example; another account does not see the people', async () => {
    const s = await fresh();
    const { blankWithName } = await import('@/lib/intake');
    s.loadPlanFromStorage();
    s.setAccount('user-1');
    s.addProfile(blankWithName('Ion Pop'));
    s.setAccount(null);
    expect(s.getActiveProfileId()).toBe(s.DEMO_ID);
    s.setAccount('user-2');
    expect(JSON.parse(localStorage.getItem('prototype123-profiles-v1:user-2')!).order).toEqual([s.DEMO_ID]);
    s.setAccount(null);
    s.setAccount('user-1');
    expect(JSON.parse(localStorage.getItem('prototype123-profiles-v1:user-1')!).order).toHaveLength(2);
  });
});
