// Prototype123 — how much each habit changes the risk of needing daily help.
// THIS IS THE FILE TO EDIT when you find better numbers. Nothing else needs to change.
//
// hr = hazard ratio: how many times higher the yearly chance of needing daily help is, compared with
//      the healthy answer (hr 1). Example: 1.8 = 80% higher risk every year.
//      Keys are the answer ids from the quiz (src/lib/health.ts → QUIZ).
// reversible = share of that extra risk that goes away if the habit changes NOW (0..1).
//      Quitting late does not undo everything: former smokers stay above never-smokers.
//
// Years gained ≈ ln(hr) × reversible / 0.1   (0.1 = how fast the risk grows with age, per year)
//      hr 1.8, reversible 0.5 → ≈ 2,9 years      hr 2.0, reversible 0.7 → ≈ 4,9 years
//
// Where the current values come from (orientative, for a demo — check them before relying on them):
//  - Zaninotto, Head, Steptoe (2020), Scientific Reports 10:6955 — ELSA (England) + HRS (US):
//    2+ risk factors vs none ≈ 10–11 fewer years without disability from age 50; smoking had the biggest effect.
//    https://doi.org/10.1038/s41598-020-63843-6
//  - Mehta, Myrskylä (2017), Health Affairs 36(8) — never smoking + non-obese + moderate drinking
//    delays disability onset by several years. https://doi.org/10.1377/hlthaff.2016.1569
//  - Stenholm et al. (2016), Int J Epidemiol 45(4) — smoking, physical inactivity, obesity and alcohol
//    vs healthy life expectancy (Whitehall II, GAZEL, FPS…). https://doi.org/10.1093/ije/dyw126
//  - Pahor et al. (2014), JAMA 311(23) — LIFE trial: starting regular exercise at 70–89 lowered
//    major mobility disability (HR 0.82). https://doi.org/10.1001/jama.2014.5616

export interface HabitEvidence {
  /** Quiz question id. */
  id: string;
  title: string;
  /** Finishes the sentence "dacă Maria … de acum". */
  action: string;
  hr: Record<string, number>;
  reversible: number;
  /** Short label for the "Cum calculăm" list. */
  label: string;
}

export const HABIT_EVIDENCE: HabitEvidence[] = [
  {
    id: "smoking", title: "Renunțarea la fumat", action: "renunță la fumat", label: "fumat",
    hr: { sometimes: 1.4, daily: 2.0 }, reversible: 0.6,
  },
  {
    id: "exercise", title: "Mișcare regulată", action: "face mișcare de câteva ori pe săptămână", label: "lipsa mișcării",
    hr: { rarely: 1.5, never: 1.9 }, reversible: 0.6,
  },
  {
    id: "alcohol", title: "Mai puțin alcool", action: "bea alcool cel mult ocazional", label: "alcool",
    hr: { weekly: 1.3, daily: 1.7 }, reversible: 0.7,
  },
  {
    id: "social", title: "Mai multă viață socială", action: "iese mai des din casă și se vede cu alți oameni", label: "izolare",
    hr: { rarely: 1.3, almostNever: 1.6 }, reversible: 0.5,
  },
];

export const HABIT_EVIDENCE_NOTE =
  "Riscuri relative din studii pe populații mari (ELSA, HRS, Whitehall II, studiul LIFE), aplicate orientativ. Nu sunt o predicție pentru o persoană anume.";
