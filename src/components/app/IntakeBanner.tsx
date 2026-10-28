import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { clearIntakeNote, readIntakeNote, type IntakeNote } from "@/lib/intake-session";
import { Button } from "@/components/ui/button";

export function IntakeBanner() {
  const [note, setNote] = useState<IntakeNote | null>(null);
  useEffect(() => { setNote(readIntakeNote()); }, []);
  if (!note) return null;
  const close = () => { clearIntakeNote(); setNote(null); };
  return (
    <div role="status" className="card-surface mb-6 border-l-4 border-l-care p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-care" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-medium">{note.message}</p>
          {note.filled.length > 0 && <ChipRow title="Ai spus tu" chips={note.filled} tone="bg-primary-soft text-primary" />}
          {note.assumed.length > 0 && <ChipRow title="Estimat de noi — poți schimba" chips={note.assumed} tone="bg-care-soft text-care" />}
          {note.missing.length > 0 && <p className="text-sm text-muted-foreground"><span className="font-semibold">Lipsește: </span>{note.missing.join(", ")}</p>}
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" aria-label="Închide" onClick={close}><X /></Button>
      </div>
    </div>
  );
}

function ChipRow({ title, chips, tone }: { title: string; chips: { label: string; value: string }[]; tone: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c, i) => <span key={i} className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{c.label}: {c.value}</span>)}
      </div>
    </div>
  );
}
