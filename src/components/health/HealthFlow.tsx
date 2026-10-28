import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { clearConsent, hasConsent, saveConsent } from './consent';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, ArrowRight, HeartPulse, Loader2, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { QUIZ, DOMAIN_LABEL, healthPatch, mergeLabs, reflag, toggleAnswer, type HealthAssessment, type QuizAnswers, type LabResult } from '@/lib/health';
import { fullName, genitive } from '@/lib/plan';
import { OtherAnswers } from './OtherAnswers';
import { assessHealthFn } from '@/lib/health.functions';
import { readHealthSession, saveHealthSession } from '@/lib/health-files';
import { setPlan, switchProfile, usePlan, useProfiles } from '@/lib/store';
import { DocumentUpload } from './DocumentUpload';
import { LabReview } from './LabReview';
import { HealthResult } from './HealthResult';
import { ForecastSection } from './ForecastSection';
import { forecast, forecastPatch } from '@/lib/forecast';

const STEPS = ['Povestea', 'Chestionar', 'Acord', 'Documente', 'Verifică analizele', 'Rezultat'];
const LAST = STEPS.length - 1;
const NOTE = 'Nu este o evaluare medicală. Sunt scenarii de îngrijire pentru planificarea financiară; discută rezultatele cu medicul.';

/** Lab merge outcome in plain Romanian. */
function mergeMessage(m: ReturnType<typeof mergeLabs>): string {
  const parts = m.replaced.map(r => `${r.name} apărea deja: am păstrat ${r.kept.toLocaleString('ro-RO')} (documentul cel mai nou), nu ${r.dropped.toLocaleString('ro-RO')}.`);
  if (m.duplicates) parts.push(`${m.duplicates} ${m.duplicates === 1 ? 'valoare era deja citită' : 'valori erau deja citite'} și nu am adăugat-o din nou.`);
  return parts.join(' ');
}
export function HealthFlow() {
  const plan = usePlan();
  const profiles = useProfiles();
  const navigate = useNavigate();
  const assess = useServerFn(assessHealthFn);
  const [step, setStep] = useState(0);
  const [story, setStory] = useState('');
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [assessment, setAssessment] = useState<HealthAssessment | null>(null);
  const [aiFail, setAiFail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [resultAge, setResultAge] = useState<number | null>(null);
  const [docHashes, setDocHashes] = useState<string[]>([]);
  const [labNotice, setLabNotice] = useState('');
  const who = plan.parent.name.trim();
  const ofWho = who ? genitive(who) : 'persoanei';
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const saved = readHealthSession();
    if (saved) {
      setStory(saved.story.slice(0, 4000)); setAnswers(saved.answers); setAssessment(saved.assessment);
      setLabs(reflag(saved.labs ?? saved.assessment?.labs ?? []));
      setDocHashes(saved.docHashes ?? []);
      setAiFail(saved.assessment && !saved.assessment.aiUsed ? 'unavailable' : null);
    }
    setConsent(hasConsent());
    setReady(true);
  }, []);
  useEffect(() => { if (ready) saveHealthSession({ story, answers, assessment, labs, docHashes }); }, [ready, story, answers, assessment, labs, docHashes]);
  const go = (value: number) => { setStep(value); setError(''); requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }); };
  const invalidate = () => { setAssessment(null); setResultAge(null); };
  const changeLabs = (rows: LabResult[]) => { setLabs(reflag(rows)); invalidate(); };
  const addLabs = (rows: LabResult[]) => { setLabs(old => { const m = mergeLabs(old, rows); setLabNotice(mergeMessage(m)); return m.labs; }); invalidate(); };
  const restartDocuments = () => { setLabs([]); setDocHashes([]); setLabNotice(''); invalidate(); };
  const submit = async () => {
    if (lock.current) return;
    if (assessment && resultAge === plan.parent.age) { go(LAST); return; }
    lock.current = true; setBusy(true); setError(''); go(LAST);
    try {
      const result = await assess({ data: { name: who, age: plan.parent.age, story: story.trim(), answers, labs: reflag(labs) } });
      setAssessment(result.assessment); setAiFail(result.aiFail); setResultAge(plan.parent.age);
    } catch { setError('Nu am putut pregăti rezultatul momentan. Răspunsurile tale sunt păstrate; poți încerca din nou.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <AppShell><div className="mx-auto max-w-4xl" lang="ro">
    <header className="mb-7"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><HeartPulse className="size-5" />Pentru {fullName(plan.parent, 'persoana îngrijită')}</div><h1 className="text-3xl font-semibold sm:text-4xl">Sănătate și obiceiuri</h1><p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Un pas în plus pentru a înțelege ce sprijin ar putea fi util {who ? `pentru ${who}` : 'persoanei îngrijite'}. Răspunde în ritmul tău.</p></header>
    <div className="mb-8"><div className="mb-3 flex justify-between gap-3 text-sm"><span className="font-semibold">Pasul {step + 1} din {STEPS.length} · {STEPS[step]}</span><span className="text-muted-foreground">{Math.round((step + 1) / STEPS.length * 100)}%</span></div><Progress value={(step + 1) / STEPS.length * 100} aria-label="Progres sănătate și obiceiuri" /><ol className="mt-3 hidden grid-cols-5 gap-3 text-xs sm:grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>{STEPS.map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined} className={i === step ? 'font-bold text-primary' : 'text-muted-foreground'}>{label}</li>)}</ol></div>
    <h2 ref={heading} tabIndex={-1} className="mb-5 scroll-mt-24 text-2xl font-semibold focus:outline-none">{step === 0 ? `Povestește despre sănătatea și obiceiurile ${ofWho}` : step === 1 ? 'Cum arată o zi obișnuită?' : step === 2 ? 'Înainte de documente' : step === 3 ? 'Documente, doar dacă dorești' : step === 4 ? 'Verifică analizele' : 'Scenarii de îngrijire pentru planificare'}</h2>
    {step === 0 && profiles.people.length > 1 && <div className="mb-5 rounded-xl border bg-card p-4"><label htmlFor="health-person" className="mb-2 block text-sm font-semibold">Despre cine completezi?</label><select id="health-person" className="h-11 w-full rounded-lg border bg-background px-3 text-base" value={profiles.activeId} onChange={e => switchProfile(e.target.value)}>{profiles.people.map(p => <option key={p.id} value={p.id}>{p.name}{p.age > 0 ? `, ${p.age}` : ''}{p.isDemo ? ' (exemplu)' : ''}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">Răspunsurile și documentele se păstrează separat pentru fiecare persoană.</p></div>}
    {step === 0 && <div><label htmlFor="health-story" className="sr-only">{`Povestește despre sănătatea și obiceiurile ${ofWho}`}</label><Textarea id="health-story" className="min-h-56 bg-card text-base leading-relaxed" maxLength={4000} value={story} onChange={e => { setStory(e.target.value); invalidate(); }} placeholder="De exemplu: mama se plimbă zilnic, locuiește singură și o ajut uneori cu cumpărăturile…" /><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>Scrie doar ce te simți confortabil să împărtășești. Poți lăsa acest pas necompletat.</span><span>{story.length} / 4000</span></div></div>}
    {step === 1 && <div className="space-y-7"><p className="text-sm text-muted-foreground">Poți lăsa fără răspuns orice întrebare.</p>{QUIZ.map((q, index) => <fieldset key={q.id} className="border-b pb-6"><legend className="mb-3 w-full"><span className="mb-1 block text-xs font-semibold text-primary">{index + 1} · {DOMAIN_LABEL[q.domain]}</span><span className="font-semibold">{q.text}</span></legend><div className="grid gap-2 sm:grid-cols-2">{q.options.map(option => { const selected = (answers[q.id] ?? []).includes(option.id); return q.multi ? <label key={option.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${selected ? 'border-primary bg-primary-soft' : 'bg-card'}`}><Checkbox checked={selected} onCheckedChange={checked => { setAnswers(old => toggleAnswer(q, old, option.id, checked === true)); invalidate(); }} />{option.label}</label> : <Button key={option.id} type="button" variant="outline" aria-pressed={selected} className={`min-h-12 justify-start p-3 text-left ${selected ? 'border-primary bg-primary-soft text-primary' : 'bg-card'}`} onClick={() => { setAnswers(old => ({ ...old, [q.id]: selected ? [] : [option.id] })); invalidate(); }}><span aria-hidden className={`size-4 shrink-0 rounded-full border ${selected ? 'border-4 border-primary' : 'border-input'}`} />{option.label}</Button>; })}</div>{q.allowOther && <OtherAnswers q={q} answers={answers} onChange={next => { setAnswers(next); invalidate(); }} />}</fieldset>)}</div>}
    {step === 2 && <div className="space-y-4"><p className="text-sm leading-relaxed text-muted-foreground">Acest pas este opțional. Dacă vrei să adaugi analize, avem nevoie mai întâi de confirmarea ta.</p><label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-5 leading-relaxed"><Checkbox checked={consent} onCheckedChange={v => { const on = v === true; setConsent(on); if (on) saveConsent(); else clearConsent(); }} className="mt-1" /><span>Înțeleg că documentele medicale conțin date despre sănătate. Am acordul explicit al persoanei ale cărei documente le încarc{who ? ` (${who})` : ''}, sau folosesc documente demonstrative.</span></label><p className="text-sm"><Link to="/cum-folosim-datele" className="font-semibold text-primary underline underline-offset-4">Cum folosim datele</Link></p></div>}
    <div hidden={step !== 3} className="space-y-5">{!!labs.length && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm"><p>Ai deja <strong>{labs.length} {labs.length === 1 ? 'analiză citită' : 'analize citite'}</strong> pentru {who || 'această persoană'}. Documentele noi se adaugă la ele; o analiză care apare din nou nu se dublează.</p><Button type="button" variant="outline" size="sm" disabled={uploadBusy} onClick={restartDocuments}>Începe din nou</Button></div>}<DocumentUpload onLabs={addLabs} onBusy={setUploadBusy} consent={consent} knownHashes={docHashes} onHash={h => setDocHashes(old => old.includes(h) ? old : [...old, h])} />{labNotice && <p role="status" className="rounded-lg border bg-warning-soft p-4 text-sm">{labNotice}</p>}</div>
    {step === 4 && <form id="health-labs" onSubmit={e => { e.preventDefault(); void submit(); }}><LabReview labs={labs} onChange={changeLabs} /></form>}
    {step === LAST && (busy ? <div role="status" className="py-16 text-center"><Loader2 className="mx-auto mb-4 size-9 animate-spin text-primary" /><p className="text-xl font-semibold">Pregătim imaginea de ansamblu…</p><p className="mt-2 text-sm text-muted-foreground">Luăm în considerare răspunsurile și analizele disponibile.</p></div> : error ? <div role="alert" className="space-y-4 border-y py-8"><p>{error}</p><Button onClick={() => void submit()}>Încearcă din nou</Button></div> : assessment ? <HealthResult assessment={assessment} aiFail={aiFail} forecast={<ForecastSection plan={plan} health={{ domains: assessment.domains, answers }} />} onApply={() => { setPlan(current => { const f = forecast(current, { domains: assessment.domains, answers }); return { ...healthPatch(current, assessment), ...forecastPatch(f) }; }); void navigate({ to: '/plan' }); }} /> : null)}
    {step < LAST && <div className="mt-8 flex items-center justify-between gap-3 border-t py-5">{step > 0 ? <Button type="button" variant="ghost" disabled={busy || uploadBusy} onClick={() => go(step - 1)}><ArrowLeft />Înapoi</Button> : <span />}<Button key={step} size="lg" disabled={!ready || busy || uploadBusy} {...(step === 4 ? { type: 'submit', form: 'health-labs' } : { type: 'button', onClick: () => go(step + 1) })}>{step === 4 ? 'Vezi scenariile' : step === 3 ? labs.length ? 'Verifică analizele' : 'Continuă' : 'Continuă'}<ArrowRight /></Button></div>}
    {step === LAST && !busy && <Button variant="ghost" className="mt-5" onClick={() => go(4)}><ArrowLeft />Revino la analize</Button>}
    <p className="mt-6 flex items-start gap-2 border-t pt-5 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-primary" />{NOTE}</p>
  </div></AppShell>;
}
