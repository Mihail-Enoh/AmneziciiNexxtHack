// Prototype123 — one place for Featherless calls (server only). Owner: P3.
// Secrets: FEATHERLESS_API_KEY, FEATHERLESS_MODEL (text), FEATHERLESS_VISION_MODEL (images).
// Text calls try the text model first, then the vision model (it also reads plain text), so one model
// being down, renamed or overloaded on Featherless does not break the feature.

export const DEFAULT_TEXT_MODEL = "Qwen/Qwen3-235B-A22B";
export const DEFAULT_VISION_MODEL = "Qwen/Qwen2.5-VL-72B-Instruct";
export type Fail = "no_key" | "timeout" | "network" | `http_${number}` | "parse";
export type Content = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
export type Message = { role: "system" | "user"; content: Content };

const env = (name: string) => process.env[name]?.trim() || "";
export const visionModel = () => env("FEATHERLESS_VISION_MODEL") || DEFAULT_VISION_MODEL;
/** Models to try for a text task, in order, without duplicates. */
export const textModels = () => [...new Set([env("FEATHERLESS_MODEL") || DEFAULT_TEXT_MODEL, visionModel()])];

/** Qwen3 "thinks" first by default; that can use the whole token budget and leave no JSON. */
function withoutThinking(model: string, messages: Message[]): Message[] {
  if (!/qwen3/i.test(model)) return messages;
  return messages.map((m, i) => (i === messages.length - 1 && m.role === "user" && typeof m.content === "string" ? { ...m, content: `${m.content}\n\n/no_think` } : m));
}

/** Drop a <think>…</think> block, also an unfinished one. */
export const stripThinking = (text: string) => text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").trim();

export async function chat(model: string, messages: Message[], timeoutMs: number, maxTokens: number, temperature = 0.1): Promise<{ text: string } | { fail: Fail }> {
  const key = env("FEATHERLESS_API_KEY");
  if (!key || !model) return { fail: "no_key" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages: withoutThinking(model, messages) }),
    });
    if (!res.ok) {
      console.error("featherless: call failed", res.status, model);
      return { fail: `http_${res.status}` };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: stripThinking(json.choices?.[0]?.message?.content ?? "") };
  } catch (e) {
    const fail: Fail = e instanceof Error && e.name === "AbortError" ? "timeout" : "network";
    console.error("featherless: call error", fail, model);
    return { fail };
  } finally {
    clearTimeout(timer);
  }
}

/** A failure that no other model can fix (missing or wrong key). */
export const fatal = (f: Fail) => f === "no_key" || f === "http_401" || f === "http_403";

/**
 * Text task with fallback: each model gets one try; `parse` turns the answer into a result (null = unusable).
 * Returns the first good result, or the most telling failure.
 */
export async function textTask<T>(messages: Message[], parse: (text: string) => T | null, timeoutMs: number, maxTokens: number): Promise<{ ok: T } | { fail: Fail }> {
  let last: Fail = "parse";
  for (const model of textModels()) {
    const r = await chat(model, messages, timeoutMs, maxTokens, 0.2);
    if ("fail" in r) {
      last = r.fail;
      if (fatal(r.fail)) break;
      continue;
    }
    const parsed = parse(r.text);
    if (parsed !== null) return { ok: parsed };
    console.error("featherless: answer not usable", model);
    last = "parse";
  }
  return { fail: last };
}
