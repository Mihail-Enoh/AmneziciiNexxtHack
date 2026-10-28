import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addCustomAnswer, customAnswers, MAX_OTHER, MAX_OTHER_LENGTH, removeCustomAnswer, type QuizAnswers, type QuizQuestion } from '@/lib/health';

/** "Altă afecțiune": answers the user types, shown as removable chips. */
export function OtherAnswers({ q, answers, onChange }: { q: QuizQuestion; answers: QuizAnswers; onChange: (next: QuizAnswers) => void }) {
  const [text, setText] = useState('');
  const items = customAnswers(q, answers);
  const add = () => { const next = addCustomAnswer(q, answers, text); if (next !== answers) onChange(next); setText(''); };
  return <div className="mt-3 space-y-2">
    {!!items.length && <ul className="flex flex-wrap gap-2" aria-label="Afecțiuni adăugate de tine">{items.map(item => <li key={item} className="flex items-center gap-1 rounded-full border border-primary bg-primary-soft py-1 pl-3 pr-1 text-sm">{item}<Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Elimină ${item}`} onClick={() => onChange(removeCustomAnswer(q, answers, item))}><X className="size-3.5" /></Button></li>)}</ul>}
    {items.length < MAX_OTHER && <div className="flex gap-2">
      <Input aria-label="Altă afecțiune" placeholder="Altă afecțiune (scrie și apasă Adaugă)" value={text} maxLength={MAX_OTHER_LENGTH} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      <Button type="button" variant="outline" disabled={!text.trim()} onClick={add}><Plus />Adaugă</Button>
    </div>}
  </div>;
}
