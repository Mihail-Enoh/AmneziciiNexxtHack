import { afterEach, describe, expect, it, vi } from "vitest";
import { runIntakeCore as runIntake } from "./intake.functions";
const GOOD = '{"message":"ok","open":"plan","parent":{"age":72,"pension":1800}}';
const reply = (content: string, status = 200) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("runIntake endpoint (mocked Featherless)", () => {
  it("works when FEATHERLESS_MODEL is missing (default model) and the key has a trailing newline", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "abc\n"); vi.stubEnv("FEATHERLESS_MODEL", "");
    const f = vi.fn(async () => reply(GOOD)); vi.stubGlobal("fetch", f);
    const r = await runIntake("Mama are 72 de ani");
    expect(r.ok).toBe(true);
    const body = JSON.parse((f.mock.calls[0] as any)[1].body);
    expect(body.model).toBe("Qwen/Qwen3-235B-A22B");
    expect((f.mock.calls[0] as any)[1].headers.Authorization).toBe("Bearer abc");
  });
  it("trims a model name pasted with spaces", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "abc"); vi.stubEnv("FEATHERLESS_MODEL", "  Qwen/Qwen3-235B-A22B ");
    const f = vi.fn(async () => reply(GOOD)); vi.stubGlobal("fetch", f);
    await runIntake("x");
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).model).toBe("Qwen/Qwen3-235B-A22B");
  });
  it("reports the reason: no key / http 404 (no retry) / parse after 2 tries", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "");
    expect(await runIntake("x")).toEqual({ ok: false, reason: "no_key" });
    vi.stubEnv("FEATHERLESS_API_KEY", "abc");
    let f = vi.fn(async () => new Response("not found", { status: 404 })); vi.stubGlobal("fetch", f);
    expect(await runIntake("x")).toEqual({ ok: false, reason: "http_404" });
    expect(f).toHaveBeenCalledTimes(1);
    f = vi.fn(async () => reply("nu știu")); vi.stubGlobal("fetch", f);
    expect(await runIntake("x")).toEqual({ ok: false, reason: "parse" });
    expect(f).toHaveBeenCalledTimes(2);
  });
});