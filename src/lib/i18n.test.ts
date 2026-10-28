import { describe, expect, it } from "vitest";
import { displayName, t } from "./i18n";
describe("text în limba română", () => {
  it("păstrează textul și sumele neschimbate", () => {
    expect(t("Diferență estimată de 1.700 RON/lună")).toBe("Diferență estimată de 1.700 RON/lună");
  });
  it("formează genitivul numelor", () => {
    expect(displayName("Elena")).toBe("Elenei");
    expect(displayName("Ion")).toBe("lui Ion");
  });
});
