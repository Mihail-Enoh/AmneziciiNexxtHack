import { describe, expect, it } from 'vitest';
import { computePlan, demoState } from '@/lib/plan';

describe('"Mai devreme înseamnă mai ușor" uses the family share, not what you save today', () => {
  it('is not 0 when you save nothing today; starting 5 years later costs more per month', () => {
    const s = { ...demoState(), monthlySaving: 0, yearsUntil: 10, careStartDate: '' };
    const c = computePlan(s);
    const share = Math.round(c.projection.reduce((a, r) => a + r.gap, 0));
    expect(c.earlySaving.target).toBe(share);
    expect(share).toBeGreaterThan(0);
    expect(c.earlySaving.now).toBe(Math.ceil(share / c.monthsUntilScenario));
    expect(c.earlySaving.later!).toBeGreaterThan(c.earlySaving.now!);
    expect(c.earlySaving.growth.at(-1)!.now).toBe(share);
  });
  it('care starting now: no time to save before', () => {
    const c = computePlan({ ...demoState(), yearsUntil: 0, careStartDate: '' });
    expect(c.earlySaving.now).toBeNull();
    expect(c.earlySaving.later).toBeNull();
  });
});
