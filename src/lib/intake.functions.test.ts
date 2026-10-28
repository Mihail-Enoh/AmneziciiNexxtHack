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
  it("reports the reason: no key / wrong key (no retry) / parse after trying both models", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "");
    expect(await runIntake("x")).toEqual({ ok: false, reason: "no_key" });
    vi.stubEnv("FEATHERLESS_API_KEY", "abc");
    let f = vi.fn(async () => new Response("bad key", { status: 401 })); vi.stubGlobal("fetch", f);
    expect(await runIntake("x")).toEqual({ ok: false, reason: "http_401" });
    expect(f).toHaveBeenCalledTimes(1);
    f = vi.fn(async () => reply("nu știu")); vi.stubGlobal("fetch", f);
    expect(await runIntake("x")).toEqual({ ok: false, reason: "parse" });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("falls back to the vision model when the text model is unavailable", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "abc"); vi.stubEnv("FEATHERLESS_MODEL", "Qwen/Qwen3-235B-A22B");
    const models: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { model: string; messages: { content: string }[] };
      models.push(body.model);
      if (body.model.includes("Qwen3")) {
        expect(body.messages.at(-1)!.content).toMatch(/\/no_think$/); // no thinking: answer goes straight to JSON
        return new Response("model not found", { status: 404 });
      }
      return reply(JSON.stringify({ parent: { name: "Ana", age: 70 } }));
    }));
    const r = await runIntake("Mama Ana are 70 de ani.");
    expect(r.ok).toBe(true);
    expect(models).toEqual(["Qwen/Qwen3-235B-A22B", "Qwen/Qwen2.5-VL-72B-Instruct"]);
  });
  it("ignores a <think> block, even an unfinished one before the JSON", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "abc");
    vi.stubGlobal("fetch", vi.fn(async () => reply('<think>hmm</think>{"parent":{"name":"Ana","age":70}}')));
    expect((await runIntake("x")).ok).toBe(true);
  });
});