import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CareTimingInputProps {
  careStartDate: string;
  yearsUntil: number;
  onChange: (timing: { careStartDate: string; yearsUntil: number }) => void;
  presets?: readonly number[];
}

/** Shared by onboarding and the live plan, without saving an unfinished form. */
export function CareTimingInput({
  careStartDate,
  yearsUntil,
  onChange,
  presets = [3, 5, 10, 15],
}: CareTimingInputProps) {
  const id = useId();
  const [customEntry, setCustomEntry] = useState(false);
  const custom = Boolean(careStartDate) || customEntry;
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold">Când începe îngrijirea?</legend>
      <div className="flex flex-wrap gap-2">
        {presets.map((years) => (
          <button
            key={years}
            type="button"
            aria-pressed={!custom && yearsUntil === years}
            className={cn(
              "rounded-xl border-2 px-4 py-3 text-sm font-semibold",
              !custom && yearsUntil === years
                ? "border-primary bg-primary-soft text-primary"
                : "hover:border-primary/40",
            )}
            onClick={() => {
              setCustomEntry(false);
              onChange({ careStartDate: "", yearsUntil: years });
            }}
          >
            Peste {years} ani
          </button>
        ))}
        <button
          type="button"
          aria-pressed={custom}
          aria-controls={`${id}-date-panel`}
          className={cn(
            "rounded-xl border-2 px-4 py-3 text-sm font-semibold",
            custom ? "border-primary bg-primary-soft text-primary" : "hover:border-primary/40",
          )}
          onClick={() => setCustomEntry(true)}
        >
          Dată personalizată
        </button>
      </div>
      {custom && (
        <div id={`${id}-date-panel`} className="space-y-2 rounded-xl bg-primary-soft p-4">
          <Label htmlFor={`${id}-date`}>Data estimată de începere a îngrijirii</Label>
          <Input
            id={`${id}-date`}
            type="date"
            value={careStartDate}
            onChange={(event) => {
              setCustomEntry(true);
              onChange({ careStartDate: event.target.value, yearsUntil });
            }}
          />
          {!careStartDate && (
            <p className="text-xs text-muted-foreground">
              Alege o dată pentru a aplica opțiunea personalizată. Până atunci, calculul folosește{" "}
              {yearsUntil} ani.
            </p>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Data se aplică tuturor scenariilor comparate. O dată trecută înseamnă începere acum. Simulăm
        pe luni întregi, rotunjite în sus; nu prezicem evoluția sănătății.
      </p>
    </fieldset>
  );
}
