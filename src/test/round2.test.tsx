import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { LabReview } from '@/components/health/LabReview';
import { AmountSlider } from '@/components/app/AmountSlider';
import { duplicateLabNames, namedLabs, type LabResult } from '@/lib/health';
import { readHealthSession, saveHealthSession } from '@/lib/health-files';
afterEach(cleanup);
// Radix Slider needs ResizeObserver, which jsdom does not have.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const lab = (name: string, value: number): LabResult => ({ name, value, unit: 'mg', refLow: 100, refHigh: 130, refText: '', flag: 'normal' });

describe('the same test cannot be added twice by hand', () => {
  it('finds duplicates, also written differently', () => {
    expect(duplicateLabNames([lab('Vitamina B12', 123), lab('vitamina b-12', 12), lab('Glicemie', 90)])).toEqual(['Vitamina B12']);
    expect(duplicateLabNames([lab('Glicemie', 90), lab('', 0), lab('', 0)])).toEqual([]);
    expect(namedLabs([lab('Glicemie', 90), lab(' ', 0)])).toHaveLength(1);
  });
  it('shows which row is duplicated', () => {
    function Review() { const [labs, setLabs] = useState([lab('Vitamina B12', 123), lab('Vitamina B12', 12)]); return <LabReview labs={labs} onChange={setLabs} defaultOpen />; }
    render(<Review />);
    expect(screen.getByRole('alert').textContent).toMatch(/„Vitamina B12” apare de mai multe ori/);
    expect(screen.getAllByText('Apare de mai multe ori')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Șterge analiza 2' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('contribution: any amount', () => {
  it('the exact field accepts more than the slider end', () => {
    const onChange = vi.fn();
    render(<AmountSlider id="x" value={500} max={2000} onChange={onChange} label="Contribuția" />);
    fireEvent.change(screen.getByLabelText('Sau scrie suma:'), { target: { value: '4500' } });
    expect(onChange).toHaveBeenCalledWith(4500);
  });
});

describe('health answers belong to one person', () => {
  it('a session saved for someone else is not shown (and is cleared)', () => {
    sessionStorage.clear();
    saveHealthSession({ story: 'John fumează', answers: { smoking: ['daily'] }, assessment: null, person: 'John Cena' });
    expect(readHealthSession('Maria Ionescu')).toBeNull();
    expect(readHealthSession('John Cena')).toBeNull(); // cleared
    saveHealthSession({ story: 'Maria', answers: {}, assessment: null, person: 'Maria Ionescu' });
    expect(readHealthSession('Maria Ionescu')?.story).toBe('Maria');
  });
  it('an old session without a person is not shown', () => {
    sessionStorage.clear();
    saveHealthSession({ story: 'vechi', answers: {}, assessment: null });
    expect(readHealthSession('Maria Ionescu')).toBeNull();
  });
});
