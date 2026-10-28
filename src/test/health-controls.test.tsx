import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { DocumentUpload } from '@/components/health/DocumentUpload';
import { LabReview } from '@/components/health/LabReview';
import { selectDocuments, MAX_PDF_PAGES } from '@/components/health/documents';
import { useState } from 'react';
import type { LabResult } from '@/lib/health';
vi.mock('@tanstack/react-start', () => ({ useServerFn: () => vi.fn() }));
vi.mock('@/lib/health.functions', () => ({ readHealthDocument: vi.fn() }));
afterEach(cleanup);

describe('Health document and review rules', () => {
 it('allows at most 3 files including already selected files', () => {
  const files = [1,2,3,4].map(i => new File(['image'], `${i}.jpg`, { type: 'image/jpeg' }));
  expect(selectDocuments(files, 0)).toHaveLength(3);
  expect(selectDocuments(files, 2)).toHaveLength(1);
  expect(selectDocuments(files, 3)).toHaveLength(0);
 });
 it('limits each PDF to 3 rendered pages', () => {
  expect(MAX_PDF_PAGES).toBe(3);
 });
 it('requires consent for picker and demonstrative document and revokes access when unchecked', () => {
  const view = render(<DocumentUpload onLabs={() => {}} onBusy={() => {}} consent={false} />);
  const picker = screen.getByLabelText('Alege documente');
  const demo = screen.getByRole('button', { name: 'Folosește un buletin demonstrativ' });
  expect(picker).toBeDisabled(); expect(demo).toBeDisabled();
  view.rerender(<DocumentUpload onLabs={() => {}} onBusy={() => {}} consent />);
  expect(picker).toBeEnabled(); expect(demo).toBeEnabled();
  view.rerender(<DocumentUpload onLabs={() => {}} onBusy={() => {}} consent={false} />);
  expect(picker).toBeDisabled(); expect(demo).toBeDisabled();
 });
 it('reflags edited lab values against the reference interval', () => {
  let result: LabResult[] = [];
  function Review() {
   const [labs, setLabs] = useState<LabResult[]>([{ name: 'Glicemie', value: 90, unit: 'mg/dL', refLow: 70, refHigh: 100, refText: '', flag: 'normal' }]);
   return <LabReview labs={labs} onChange={rows => { result = rows; setLabs(rows); }} />;
  }
  render(<Review />);
  expect(screen.getByText('Am citit 1 valoare din document')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Verifică valorile citite' }));
  fireEvent.change(screen.getByLabelText('Valoare analiză 1'), { target: { value: '130' } });
  expect(result[0]?.value).toBe(130); expect(result[0]?.flag).toBe('high');
  fireEvent.change(screen.getByLabelText('Valoare analiză 1'), { target: { value: '60' } });
  expect(result[0]?.flag).toBe('low');
 });
});
