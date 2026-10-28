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

/** Today as YYYY-MM-DD in Romania (the date input works with this format). */
export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
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
  const [dateError, setDateError] = useState("");
  const custom = Boolean(careStartDate) || customEntry;
  const today = todayIso();
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold">Când începe îngrijirea?</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!custom && yearsUntil === 0}
          className={cn(
            "rounded-xl border-2 px-4 py-3 text-sm font-semibold",
            !custom && yearsUntil === 0
              ? "border-primary bg-primary-soft text-primary"
              : "hover:border-primary/40",
          )}
          onClick={() => {
            setCustomEntry(false);
            setDateError("");
            onChange({ careStartDate: "", yearsUntil: 0 });
          }}
        >
          Acum
        </button>
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
              setDateError("");
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
            min={today}
            value={careStartDate}
            aria-invalid={dateError ? true : undefined}
            onChange={(event) => {
              setCustomEntry(true);
              const value = event.target.value;
              if (value && value < today) {
                setDateError("Alege o dată de azi încolo. Dacă îngrijirea a început deja, alege „Acum”.");
                return;
              }
              setDateError("");
              onChange({ careStartDate: value, yearsUntil });
            }}
          />
          {dateError && <p role="alert" className="text-xs font-medium text-destructive">{dateError}</p>}
          {!careStartDate && (
            <p className="text-xs text-muted-foreground">
              Alege o dată pentru a aplica opțiunea personalizată. Până atunci, calculul folosește{" "}
              {yearsUntil} ani.
            </p>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Data se aplică tuturor scenariilor comparate. Simulăm
        pe luni întregi, rotunjite în sus; nu prezicem evoluția sănătății.
      </p>
    </fieldset>
  );
}
