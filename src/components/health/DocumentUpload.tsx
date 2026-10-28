import { useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { FileText, Upload, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { readHealthDocument } from '@/lib/health.functions';
import { MAX_FILES } from '@/lib/health-files';
import type { LabResult } from '@/lib/health';
import { ACCEPT, documentError, documentImages, readError, selectDocuments } from './documents';

type Entry = { id: number; name: string; status: string; progress: number; error: boolean; file: File };
export function DocumentUpload({ onLabs, onBusy }: { onLabs: (labs: LabResult[]) => void; onBusy: (busy: boolean) => void }) {
  const read = useServerFn(readHealthDocument);
  const [consent, setConsent] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [drag, setDrag] = useState(false);
  const lock = useRef(false);
  const nextId = useRef(0);
  const picker = useRef<HTMLInputElement>(null);
  const patch = (id: number, update: Partial<Entry>) => setEntries(rows => rows.map(r => r.id === id ? { ...r, ...update } : r));
  const process = async (entry: Entry) => {
    patch(entry.id, { status: 'Pregătim documentul…', progress: 5, error: false });
    let count = 0; const errors: string[] = [];
    try {
      for await (const { image, page, total } of documentImages(entry.file)) {
        patch(entry.id, { status: `Citim pagina ${page} din ${total}…`, progress: Math.round((page - 1) / total * 100) });
        try {
          const response = await read({ data: { image } });
          if (response.ok) { count += response.read.labs.length; onLabs(response.read.labs); }
          else errors.push(readError(response.reason));
        } catch { errors.push(readError('network')); }
        patch(entry.id, { progress: Math.round(page / total * 100) });
      }
      patch(entry.id, { status: errors.length ? [...new Set(errors)].join(' ') : count ? `${count} analize citite. Le verificăm la pasul următor.` : 'Nu am găsit analize numerice. Poți adăuga valorile manual.', progress: 100, error: errors.length > 0 });
    } catch { patch(entry.id, { status: 'Nu am putut deschide documentul. Alege alt fișier sau continuă manual.', error: true, progress: 100 }); }
  };
  const run = async (rows: Entry[]) => {
    lock.current = true; setBusy(true); onBusy(true);
    try { for (const row of rows) await process(row); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  };
  const add = async (files: File[]) => {
    if (lock.current || !consent) { if (!consent) setNotice('Bifează acordul înainte de a încărca documente.'); return; }
    const accepted = selectDocuments(files, entries.length);
    setNotice(accepted.length < files.length ? `Poți încărca maximum ${MAX_FILES} fișiere.` : '');
    const rows: Entry[] = [];
    for (const file of accepted) {
      const error = documentError(file);
      if (error) { setNotice(error); continue; }
      rows.push({ id: nextId.current++, name: file.name, file, status: 'În așteptare', progress: 0, error: false });
    }
    setEntries(old => [...old, ...rows]);
    await run(rows);
  };
  const demo = async () => {
    if (!consent || lock.current) return;
    lock.current = true; setBusy(true); onBusy(true);
    try {
      const response = await fetch('/demo/buletin-fictiv.jpg');
      if (!response.ok) throw new Error('download');
      const blob = await response.blob();
      lock.current = false;
      await add([new File([blob], 'Buletin demonstrativ.jpg', { type: 'image/jpeg' })]);
    } catch { setNotice('Documentul demonstrativ nu a putut fi deschis. Poți continua manual.'); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  };
  return <div className="space-y-5">
    <label className="flex items-start gap-3 rounded-lg border bg-primary-soft/40 p-4 text-sm leading-relaxed"><Checkbox checked={consent} disabled={busy} onCheckedChange={v => setConsent(v === true)} className="mt-0.5" />Am acordul părintelui sau folosesc documente demonstrative.</label>
    <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); void add(Array.from(e.dataTransfer.files)); }} className={`rounded-lg border-2 border-dashed p-7 text-center ${drag ? 'border-primary bg-primary-soft' : 'border-input bg-card'}`}>
      <Upload className="mx-auto mb-3 size-8 text-primary" /><h3 className="text-xl font-semibold">Adaugă documentele, dacă le ai</h3><p className="mt-2 text-sm text-muted-foreground">PNG, JPG, WEBP sau PDF · maximum {MAX_FILES} fișiere, 20 MB fiecare.<br />Pentru PDF citim primele 3 pagini.</p>
      <input ref={picker} type="file" accept={ACCEPT} multiple className="sr-only" aria-label="Alege documente" disabled={!consent || busy || entries.length >= MAX_FILES} onChange={e => { void add(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <Button variant="outline" className="mt-5" disabled={!consent || busy || entries.length >= MAX_FILES} onClick={() => picker.current?.click()}><Upload />Alege fișiere</Button>
    </div>
    <Button variant="ghost" className="text-primary" disabled={!consent || busy || entries.length >= MAX_FILES} onClick={() => void demo()}><FileText />Folosește un buletin demonstrativ</Button>
    <p className="text-xs leading-relaxed text-muted-foreground">Documentele sunt trimise serviciului de citire automată. Nu le salvăm; sunt păstrate doar în memorie cât timp ești pe această pagină.</p>
    {notice && <p role="alert" className="text-sm text-care">{notice}</p>}
    <ul className="space-y-3" aria-live="polite">{entries.map(entry => <li key={entry.id} className="rounded-lg border bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{entry.name}</p><p className="mt-1 text-sm text-muted-foreground">{entry.status}</p></div><div className="flex shrink-0 gap-1">{busy ? <Loader2 className="size-5 animate-spin text-primary" /> : <>{entry.error && <Button variant="ghost" size="icon" aria-label={`Recitește ${entry.name}`} title="Încearcă din nou" onClick={() => void run([entry])}><RotateCcw /></Button>}<Button variant="ghost" size="icon" aria-label={`Elimină ${entry.name}`} title="Elimină documentul" onClick={() => setEntries(old => old.filter(r => r.id !== entry.id))}><Trash2 /></Button></>}</div></div><Progress value={entry.progress} className="mt-3" aria-label={`Progres ${entry.name}`} /></li>)}</ul>
  </div>;
}
