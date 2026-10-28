// Prototype123 — how much each habit changes the risk of needing daily help.
// THIS IS THE FILE TO EDIT when you find better numbers. Nothing else needs to change.
//
// hr = hazard ratio: how many times higher the yearly chance of needing daily help is, compared with
//      the healthy answer (hr 1). Example: 1.8 = 80% higher risk every year.
//      Keys are the answer ids from the quiz (src/lib/health.ts → QUIZ).
// reversible = share of that extra risk that goes away if the habit changes NOW (0..1).
//      Quitting late does not undo everything: former smokers stay above never-smokers.
//
// Weight of a habit = ln(hr) × reversible. Daily smoking: ln(1.6)×0.5 = 0.235; daily alcohol: ln(1.15)×0.5 = 0.07
//      → quitting smoking counts ≈ 3.4 times more than cutting daily alcohol.
// For a younger person with few risks, years gained ≈ weight / 0.1; close to the onset the gain is smaller.
//
// HOW TO CHANGE A VALUE: edit `hr` (how much riskier the habit is) or `reversible` below, save, done.
// The cards then show, for each habit, its share of the total delay; the shares always add up to the total.
//
// Where the current values come from (read the abstracts; numbers for people 65+ where possible):
//  - Exercise — strongest evidence. Tak et al. (2013), Ageing Research Reviews 12(1):329–338, meta-analysis
//    of 9 cohorts: medium/high activity vs low → risk of new ADL disability ×0.51 (CI 0.38–0.68),
//    i.e. inactivity ≈ ×2.0. https://doi.org/10.1016/j.arr.2012.10.001
//    Starting late still helps: LIFE trial (Pahor 2014, JAMA 311:2387), ages 70–89, HR 0.82.
//  - Smoking. Klijs, Mackenbach, Kunst (2011), BMC Public Health 11:378: current smokers OR 1.58 for
//    disability (1.48 with a stricter cut-off). https://doi.org/10.1186/1471-2458-11-378
//    Zaninotto et al. (2020), Sci Rep 10:6955: smoking = biggest loss of disability-free years (ELSA, HRS).
//    Quitting late removes only part of the risk → reversible 0.5.
//  - Alcohol — weak evidence for disability at moderate amounts. Lang et al. (2007), J Am Geriatr Soc
//    55(1):49–57 (HRS + ELSA, 65+): drinking more than 1–2 drinks/day → ADL OR 1.0 (no extra risk);
//    light/moderate drinkers even had LOWER disability than abstainers (NHEFS, OR 0.75).
//    Heavy drinking is harmful, but the quiz does not ask how much → small values.
//  - Social isolation. Shankar et al. (2017), Health Psychology 36(2):179–187 (ELSA, 3,070 people):
//    loneliness predicts more ADL difficulties; isolation predicts slower walking. No pooled ratio → modest values.

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
  /** Finishes "… vin din …": what the share of the delay comes from. */
  because: string;
}

export const HABIT_EVIDENCE: HabitEvidence[] = [
  {
    id: "exercise", title: "Mișcare regulată", action: "face mișcare de câteva ori pe săptămână", label: "lipsa mișcării",
    because: "mișcarea regulată", hr: { rarely: 1.5, never: 2.0 }, reversible: 0.5,
  },
  {
    id: "smoking", title: "Renunțarea la fumat", action: "renunță la fumat", label: "fumat",
    because: "renunțarea la fumat", hr: { sometimes: 1.3, daily: 1.6 }, reversible: 0.5,
  },
  {
    id: "social", title: "Mai multă viață socială", action: "iese mai des din casă și se vede cu alți oameni", label: "izolare",
    because: "o viață socială mai activă", hr: { rarely: 1.2, almostNever: 1.4 }, reversible: 0.5,
  },
  {
    id: "alcohol", title: "Mai puțin alcool", action: "bea alcool cel mult ocazional", label: "alcool zilnic",
    because: "mai puțin alcool", hr: { weekly: 1.0, daily: 1.15 }, reversible: 0.5,
  },
];

export const HABIT_EVIDENCE_NOTE =
  "Riscuri relative din studii pe vârstnici: mișcare (meta-analiza Tak 2013), fumat (Klijs 2011, ELSA/HRS), alcool (Lang 2007), izolare (Shankar 2017). Aplicate orientativ; nu sunt o predicție pentru o persoană anume.";
