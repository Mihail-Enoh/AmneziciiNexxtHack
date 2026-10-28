import { describe, expect, it } from "vitest";
import { readLanguage, translate } from "./i18n";
describe("language preference", () => {
  it("restores EN and defaults unsupported selections to RO", () => {
    expect(readLanguage("en")).toBe("en");
    expect(readLanguage("ro")).toBe("ro");
    expect(readLanguage(null)).toBe("ro");
    expect(readLanguage("fr")).toBe("ro");
  });
  it("translates dynamic presentation without changing amounts", () => {
    expect(translate("Scenariul selectat: diferență estimată de 1.700 RON/lună, în aproximativ 10 ani.", "en")).toBe("Selected scenario: an estimated gap of 1.700 RON/month, in approximately 10 years.");
    expect(translate("1.700 RON", "en")).toBe("1.700 RON");
  });
});