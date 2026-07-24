export type LocalLlmConfig = Readonly<{
  protocol: "local-llm/manual-export/v1";
  transport: "manual-export";
  model: string;
}>;

const allowedKeys = new Set(["protocol", "transport", "model"]);

export function validateLocalLlmConfig(value: unknown): LocalLlmConfig {
  const config = record(value);
  Object.keys(config).forEach((key) => {
    if (!allowedKeys.has(key)) throw new Error(`local LLM config has unsupported key: ${key}`);
  });
  if (config.protocol !== "local-llm/manual-export/v1") throw new Error("local LLM config protocol is invalid");
  if (config.transport !== "manual-export") throw new Error("local LLM config transport must be manual-export");
  if (typeof config.model !== "string" || config.model.trim() === "") throw new Error("local LLM config model must be a non-empty string");
  return Object.freeze({ protocol: config.protocol, transport: config.transport, model: config.model });
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("local LLM config must be an object");
  return value as Record<string, unknown>;
}
