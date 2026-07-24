import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateLocalLlmConfig } from "./local-llm.js";

function configPath(args: string[]): string {
  const values = args[0] === "--" ? args.slice(1) : args;
  if (values.length !== 2 || values[0] !== "--config") {
    throw new Error("usage: colloquium:validate-local-llm -- --config <file>");
  }
  return values[1];
}

async function main(): Promise<void> {
  const path = resolve(configPath(process.argv.slice(2)));
  const text = await readFile(path, "utf8");
  const config = validateLocalLlmConfig(JSON.parse(text));
  process.stdout.write(`Validated networkless manual-export config for model: ${config.model}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
