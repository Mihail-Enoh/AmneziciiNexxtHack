import { useNavigate } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addProfile, removeProfile, switchProfile, useProfiles, type PersonSummary } from "@/lib/store";
import { cn } from "@/lib/utils";

const label = (p: PersonSummary) => `${p.name}${p.age > 0 ? `, ${p.age}` : ""}${p.isDemo ? " (exemplu)" : ""}`;

/** The people you plan for: switch, add, remove. Used in the sidebar and the mobile menu. */
export function PersonSwitcher({ onDone }: { onDone?: () => void }) {
  const { activeId, people } = useProfiles();
  const navigate = useNavigate();
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Persoane</div>
      <ul className="space-y-1" aria-label="Persoanele pentru care planifici">
        {people.map((p) => {
          const active = p.id === activeId;
          return (
            <li key={p.id} className="group flex items-center gap-1">
              <button
                type="button"
                aria-pressed={active}
                title={label(p)}
                onClick={() => { switchProfile(p.id); onDone?.(); }}
                className={cn(
                  "flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold",
                  active ? "bg-care-soft text-care" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-background text-xs">{active ? <Check className="size-3.5" /> : (p.firstName || "?").charAt(0).toUpperCase()}</span>
                <span className="truncate">{label(p)}</span>
              </button>
              {people.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 opacity-60 hover:opacity-100"
                  aria-label={`Șterge planul pentru ${p.name}`}
                  title="Șterge persoana"
                  onClick={() => {
                    if (window.confirm(`Ștergi planul pentru ${p.name}? Răspunsurile și analizele acestei persoane se șterg și ele.`)) removeProfile(p.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <Button
        type="button"
        variant="ghost"
        className="mt-1 h-10 w-full justify-start rounded-lg px-3 text-sm font-semibold text-primary"
        onClick={() => { addProfile(); onDone?.(); void navigate({ to: "/start" }); }}
      >
        <Plus className="size-4" />Adaugă o persoană
      </Button>
    </div>
  );
}
