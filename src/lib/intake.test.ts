import { describe, expect, it } from "vitest";
import { applyIntake, blankState, intakeFromModelText, parseIntake, snap, CITIES } from "./intake";
import { INTAKE_SYSTEM_PROMPT } from "./intake-prompt";
import { computePlan, demoState, type PlanState } from "./plan";

// The exact example from the system prompt: the model's ideal answer.
const GOOD = `{"message":"Am înțeles.","open":"plan","parent":{"age":72,"city":"Iași","living":"Locuiește singur(ă)","housing":"Proprietar","independence":"occasional","pension":1800,"savings":15000},"user":{"income":7000},"userContribution":500,"members":[{"name":"Radu","role":"Frate","contribution":300,"financial":"da"}]}`;

const full = (patch: Record<string, unknown>) => JSON.stringify({ parent: { age: 70, pension: 2000 }, ...patch });

describe("parsing model text", () => {
  it("accepts the ideal answer", () => {
    const r = intakeFromModelText(GOOD)!;
    expect(r.open).toBe("plan");
    expect(r.path).toBe("/plan");
    expect(r.patch.parent).toMatchObject({ age: 72, city: "Iași", pension: 1800, savings: 15000, independence: "occasional" });
    expect(r.patch.userContribution).toBe(500);
  });
  it("handles markdown fences, <think> blocks and chatter", () => {
    const wrapped = "<think>hmm {not json}</think>Iată:\n```json\n" + GOOD + "\n```\nSper că ajută!";
    expect(intakeFromModelText(wrapped)?.patch.parent?.pension).toBe(1800);
  });
  it("returns null when there is no JSON", () => {
    expect(intakeFromModelText("Nu am înțeles întrebarea.")).toBeNull();
    expect(intakeFromModelText("{ broken json")).toBeNull();
  });
  it("never throws on garbage shapes", () => {
    for (const g of ['{"parent":null,"user":5,"members":"x"}', "[]", '{"members":[null,1,"a"]}', '{"parent":{"age":[1]}}']) {
      expect(() => applyIntake(parseIntake(g))).not.toThrow();
    }
    expect(() => applyIntake(null)).not.toThrow();
  });
});

describe("safety: the model cannot push bad values into the plan", () => {
  it("drops out-of-range numbers instead of failing the whole answer", () => {
    const r = applyIntake(parseIntake(full({ parent: { age: 70, pension: 2000, savings: 9e12, expenses: -5 } })));
    expect(r.patch.parent?.pension).toBe(2000);
    expect(r.patch.parent?.savings).toBe(0);
    expect(r.assumed.some((a) => a.label === "Cheltuieli esențiale")).toBe(true); // expenses fell back to the estimate
  });
  it("accepts numeric strings but not nonsense", () => {
    const r = applyIntake(parseIntake(full({ parent: { age: "71", pension: "2 100", otherIncome: "mult" } })));
    expect(r.patch.parent).toMatchObject({ age: 71, pension: 2100, otherIncome: 0 });
  });
  it("rejects an implausible parent age as missing", () => {
    const r = applyIntake(parseIntake(JSON.stringify({ parent: { age: 12, pension: 2000 } })));
    expect(r.open).toBe("start");
    expect(r.missing).toContain("vârsta părintelui");
  });
  it("snaps enums and falls back safely", () => {
    expect(snap("bucuresti", CITIES)).toBe("București");
    expect(snap("CLUJ", CITIES)).toBe("Cluj-Napoca");
    expect(snap("Paris", CITIES)).toBeUndefined();
    const r = applyIntake(parseIntake(full({ parent: { age: 70, pension: 2000, city: "Paris", independence: "foarte" } })));
    expect(r.patch.parent?.city).toBe("Alt oraș");
    expect(r.patch.parent?.independence).toBe("independent");
    expect(r.assumed.some((a) => a.label === "Independență")).toBe(true);
  });
  it("only opens allowlisted pages, never a URL from the model", () => {
    for (const open of ["https://evil.example", "/admin", "../../x", "javascript:alert(1)"]) {
      expect(applyIntake(parseIntake(full({ open }))).path).toBe("/plan");
    }
  });
  it("opens /scenarii only when a scenario was really asked", () => {
    expect(applyIntake(parseIntake(full({ open: "scenarii" }))).path).toBe("/plan");
    const r = applyIntake(parseIntake(full({ open: "scenarii", scenario: "residential" })));
    expect(r.path).toBe("/scenarii");
    expect(r.patch.scenario).toBe("residential");
    expect(r.patch.yearsUntil).toBe(15); // scenario default from plan.ts
  });
});

describe("essentials and the Elena demo must not leak", () => {
  it("missing age/pension sends the user to /start with a missing list", () => {
    const r = applyIntake(parseIntake('{"parent":{"name":"Maria"},"message":"Câți ani are?"}'));
    expect(r.open).toBe("start");
    expect(r.patch.onboarded).toBe(false);
    expect(r.missing.length).toBeGreaterThanOrEqual(2);
  });
  it("starts from a blank plan, not from Elena's numbers", () => {
    const r = applyIntake(parseIntake('{"parent":{"age":70,"pension":1500}}'));
    const demo = demoState();
    expect(r.patch.parent?.savings).toBe(0);
    expect(r.patch.parent?.savings).not.toBe(demo.parent.savings);
    expect(r.patch.members).toEqual([]);
    expect(r.patch.userContribution).toBe(0);
    expect(blankState().parent.name).toBe("");
  });
  it("assumed values are reported so the UI can label them", () => {
    const r = applyIntake(parseIntake('{"parent":{"age":70,"pension":2000}}'));
    expect(r.patch.parent?.expenses).toBe(1600);
    expect(r.assumed.map((a) => a.label)).toEqual(expect.arrayContaining(["Cheltuieli esențiale", "Independență"]));
  });
});

describe("the patch works with the real engine (plan.ts)", () => {
  it("produces finite numbers and the family contributions flow through", () => {
    const r = applyIntake(parseIntake(GOOD));
    const state = { ...blankState(), ...r.patch } as PlanState;
    const c = computePlan(state, "daily");
    expect(Number.isFinite(c.familyFundingGap)).toBe(true);
    expect(c.siblingTotal).toBe(300);
    expect(c.familyContributions).toBe(800);
    expect(c.remainingGap).toBe(Math.max(0, c.familyFundingGap - 800));
  });
  it("a sibling who helps in other ways adds no money", () => {
    const r = applyIntake(parseIntake(full({ members: [{ name: "Ana", role: "Soră", contribution: 400, financial: "alte-moduri" }] })));
    expect(r.patch.members?.[0]).toMatchObject({ name: "Ana", role: "Soră", contribution: 0, financial: "alte-moduri" });
  });
  it("caps members at 5", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `M${i}`, contribution: 10 }));
    expect(applyIntake(parseIntake(full({ members: many }))).patch.members).toHaveLength(5);
  });
});

describe("prompt", () => {
  it("lists the exact option values the form uses", () => {
    for (const s of ["București", "Zonă rurală", "Pensie privată (Pilon III)", "Alt membru al familiei", "alte-moduri", "residential"]) expect(INTAKE_SYSTEM_PROMPT).toContain(s);
  });
  it("its own example parses to a plan that opens /plan", () => {
    const m = INTAKE_SYSTEM_PROMPT.match(/Răspuns: (\{.*\})/s)!;
    expect(intakeFromModelText(m[1] ?? "")?.path).toBe("/plan");
  });
});
describe("missing items the model already filled", () => {
  it("drops 'vârsta părintelui' and 'pensia' when age and pension were filled, keeps the rest", async () => {
    const { alreadyFilled } = await import("./intake");
    const labels = ["Numele persoanei", "Vârsta părintelui", "Pensie lunară", "Cheltuieli esențiale"];
    expect(alreadyFilled("vârsta părintelui", labels)).toBe(true);
    expect(alreadyFilled("pensia", labels)).toBe(true);
    expect(alreadyFilled("venitul tău", labels)).toBe(false);
    expect(alreadyFilled("economiile părintelui", labels)).toBe(false);
  });
});
