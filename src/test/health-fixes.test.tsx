import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { LabReview } from '@/components/health/LabReview';
import { DocumentUpload } from '@/components/health/DocumentUpload';
import { fileFingerprint } from '@/components/health/documents';
import { CareTimingInput, todayIso } from '@/components/app/CareTimingInput';
import type { LabResult } from '@/lib/health';
vi.mock('@tanstack/react-start', () => ({ useServerFn: () => vi.fn(async () => ({ ok: false, reason: 'parse' })) }));
vi.mock('@/lib/health.functions', () => ({ readHealthDocument: vi.fn() }));
afterEach(cleanup);

describe('lab review can be closed again', () => {
  it('opens and closes the table', () => {
    function Review() {
      const [labs, setLabs] = useState<LabResult[]>([{ name: 'Glicemie', value: 90, unit: 'mg/dL', refLow: 70, refHigh: 100, refText: '', flag: 'normal' }]);
      return <LabReview labs={labs} onChange={setLabs} />;
    }
    render(<Review />);
    fireEvent.click(screen.getByRole('button', { name: 'Verifică valorile citite' }));
    expect(screen.getByLabelText('Valoare analiză 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ascunde valorile' }));
    expect(screen.queryByLabelText('Valoare analiză 1')).toBeNull();
    expect(screen.getByRole('button', { name: 'Verifică valorile citite' })).toBeTruthy();
  });
});

describe('the same document is not read twice', () => {
  it('fingerprints by content, not by name', async () => {
    const a = await fileFingerprint(new File(['abc'], 'a.jpg'));
    expect(await fileFingerprint(new File(['abc'], 'b.jpg'))).toBe(a);
    expect(await fileFingerprint(new File(['abd'], 'a.jpg'))).not.toBe(a);
  });
  it('rejects a file with the same content, even with another name; a failed read is not remembered', async () => {
    const onHash = vi.fn();
    render(<DocumentUpload onLabs={() => {}} onBusy={() => {}} consent onHash={onHash} />);
    const picker = screen.getByLabelText('Alege documente');
    const a = new File(['same bytes'], 'analize.jpg', { type: 'image/jpeg' });
    const b = new File(['same bytes'], 'analize (1).jpg', { type: 'image/jpeg' });
    await act(async () => { fireEvent.change(picker, { target: { files: [a] } }); });
    await waitFor(() => expect(screen.getByText('analize.jpg')).toBeTruthy()); // the first file is in the list
    await waitFor(() => expect(picker).toBeEnabled()); // and reading it has finished (it fails in jsdom)
    expect(onHash).not.toHaveBeenCalled(); // not read → can be tried again later
    await act(async () => { fireEvent.change(picker, { target: { files: [b] } }); });
    await waitFor(() => expect(screen.getByText(/este deja în listă/)).toBeTruthy());
  });
  it('a document read in an earlier visit gets a friendly note, not an error', async () => {
    const hash = await fileFingerprint(new File(['old document'], 'first-name.jpg', { type: 'image/jpeg' }));
    render(<DocumentUpload onLabs={() => {}} onBusy={() => {}} consent knownHashes={[hash]} />);
    await act(async () => { fireEvent.change(screen.getByLabelText('Alege documente'), { target: { files: [new File(['old document'], 'other-name.jpg', { type: 'image/jpeg' })] } }); });
    await waitFor(() => expect(screen.getByText(/a fost deja citit.*Începe din nou/)).toBeTruthy());
  });
});

describe('care start: "Acum" and no dates in the past', () => {
  it('"Acum" sets the start to now', () => {
    const onChange = vi.fn();
    render(<CareTimingInput careStartDate="" yearsUntil={10} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Acum' }));
    expect(onChange).toHaveBeenCalledWith({ careStartDate: '', yearsUntil: 0 });
  });
  it('rejects a past date and accepts a future one', () => {
    const onChange = vi.fn();
    render(<CareTimingInput careStartDate="" yearsUntil={10} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dată personalizată' }));
    const input = screen.getByLabelText('Data estimată de începere a îngrijirii');
    expect(input.getAttribute('min')).toBe(todayIso());
    fireEvent.change(input, { target: { value: '2020-01-01' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/de azi încolo/);
    fireEvent.change(input, { target: { value: '2099-01-01' } });
    expect(onChange).toHaveBeenCalledWith({ careStartDate: '2099-01-01', yearsUntil: 10 });
  });
});
