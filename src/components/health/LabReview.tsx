import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { duplicateLabNames, labKey, reflag, type LabResult, type Flag } from '@/lib/health';

const FLAGS: Record<Flag, string> = { low: 'Sub interval', high: 'Peste interval', normal: 'În interval', unknown: 'Fără interval' };
const TONES: Record<Flag, string> = { low: 'bg-warning-soft text-foreground', high: 'bg-warning-soft text-foreground', normal: 'bg-success-soft text-success', unknown: 'bg-muted text-muted-foreground' };
export function LabReview({ labs, onChange, defaultOpen = false }: { labs: LabResult[]; onChange: (labs: LabResult[]) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const edit = (index: number, patch: Partial<LabResult>) => onChange(reflag(labs.map((row, i) => i === index ? { ...row, ...patch } : row)));
  const number = (index: number, key: 'value' | 'refLow' | 'refHigh', text: string) => {
    const parsed = text.trim() === '' ? null : Number(text.replace(',', '.'));
    if (parsed === null && key !== 'value') edit(index, { [key]: null });
    else if (parsed !== null && Number.isFinite(parsed)) edit(index, { [key]: parsed });
  };
  const dups = duplicateLabNames(labs);
  const isDup = (lab: LabResult) => dups.some(n => labKey(n) === labKey(lab.name));
  const dupNote = dups.length > 0 && <p role="alert" className="mt-3 rounded-lg bg-warning-soft p-3 text-sm font-medium">{dups.length === 1 ? `Analiza „${dups[0]}” apare de mai multe ori.` : `Analizele ${dups.map(n => `„${n}”`).join(', ')} apar de mai multe ori.`} Păstrează un singur rând pentru fiecare (de obicei valoarea cea mai recentă) și șterge-le pe celelalte.</p>;
  if (labs.length && !open) return <div className="rounded-lg border bg-card p-6 text-center"><p className="text-lg font-semibold">Am citit {labs.length} {labs.length === 1 ? 'valoare' : labs.length < 20 ? 'valori' : 'de valori'} din document</p><p className="mt-2 text-sm text-muted-foreground">Te rugăm să verifici că valorile au fost citite corect.</p>{dupNote}<Button type="button" variant="outline" className="mt-5" aria-expanded={false} onClick={() => setOpen(true)}><ChevronDown />Verifică valorile citite</Button></div>;
  return <div>
    {!!labs.length && <div className="mb-3 flex justify-end"><Button type="button" variant="ghost" aria-expanded onClick={() => setOpen(false)}><ChevronUp />Ascunde valorile</Button></div>}
    {!labs.length && <div className="border-y py-8 text-center"><p className="font-semibold">Nu sunt analize de verificat.</p></div>}
    {!!labs.length && <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[740px] text-left text-sm"><caption className="sr-only">Analizele persoanei îngrijite: valori și intervale de referință editabile</caption><thead className="border-b bg-muted"><tr>{['Analiză', 'Valoare', 'Unitate', 'Referință', 'Interval', ''].map((title, i) => <th key={i} scope="col" className="p-3 font-semibold">{title}</th>)}</tr></thead><tbody>{labs.map((lab, i) => <tr key={i} className="border-b last:border-0"><td className="min-w-40 p-3"><Input aria-label={`Nume analiză ${i + 1}`} aria-invalid={isDup(lab) || undefined} className={isDup(lab) ? 'border-destructive' : undefined} placeholder="ex. Glicemie" value={lab.name} maxLength={80} onChange={e => edit(i, { name: e.target.value })} />{isDup(lab) && <p className="mt-1 text-xs font-medium text-destructive">Apare de mai multe ori</p>}</td><td className="min-w-28 p-3"><Input key={`${i}-value`} aria-label={`Valoare analiză ${i + 1}`} type="number" step="any" required defaultValue={lab.value} onChange={e => number(i, 'value', e.target.value)} /></td><td className="min-w-24 p-3"><Input aria-label={`Unitate analiză ${i + 1}`} value={lab.unit} maxLength={30} onChange={e => edit(i, { unit: e.target.value })} /></td><td className="min-w-52 p-3"><div className="grid grid-cols-2 gap-2"><Input aria-label={`Limită inferioară analiză ${i + 1}`} placeholder="Minim" type="number" step="any" defaultValue={lab.refLow ?? ''} onChange={e => number(i, 'refLow', e.target.value)} /><Input aria-label={`Limită superioară analiză ${i + 1}`} placeholder="Maxim" type="number" step="any" defaultValue={lab.refHigh ?? ''} onChange={e => number(i, 'refHigh', e.target.value)} /></div><Input className="mt-2" aria-label={`Referință analiză ${i + 1}`} placeholder="Referința de pe buletin" value={lab.refText} maxLength={40} onChange={e => edit(i, { refText: e.target.value })} /></td><td className="p-3"><span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${TONES[lab.flag]}`}>{FLAGS[lab.flag]}</span></td><td className="p-3"><Button type="button" variant="ghost" size="icon" title="Șterge analiza" aria-label={`Șterge analiza ${i + 1}`} onClick={() => onChange(reflag(labs.filter((_, index) => index !== i)))}><Trash2 /></Button></td></tr>)}</tbody></table></div>}
    {dupNote}
    <Button type="button" variant="outline" className="mt-5" disabled={labs.length >= 60} onClick={() => { setOpen(true); onChange(reflag([...labs, { name: '', value: 0, unit: '', refLow: null, refHigh: null, refText: '', flag: 'unknown' }])); }}><Plus />Adaugă o analiză</Button>
    {labs.length >= 60 && <p className="mt-2 text-sm text-muted-foreground">Poți verifica maximum 60 de analize.</p>}
  </div>;
}
