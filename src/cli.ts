import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderReport, runMockColloquium, validateProblem } from "./engine.js";

type Arguments = {
  input: string;
  output: string;
  provider: "mock";
};

function parseArguments(args: string[]): Arguments {
  const values = new Map<string, string>();
  const supportedOptions = new Set(["--input", "--output", "--provider"]);
  const commandArgs = args[0] === "--" ? args.slice(1) : args;
  for (let index = 0; index < commandArgs.length; index += 2) {
    const name = commandArgs[index];
    const value = commandArgs[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      throw new Error("usage: colloquium:run -- --input <file> --output <directory> [--provider mock]");
    }
    if (!supportedOptions.has(name)) {
      throw new Error(`unknown option: ${name}`);
    }
    if (values.has(name)) {
      throw new Error(`duplicate option: ${name}`);
    }
    values.set(name, value);
  }

  const input = values.get("--input");
  const output = values.get("--output");
  const provider = values.get("--provider") ?? "mock";
  if (!input || !output) {
    throw new Error("--input and --output are required");
  }
  if (provider !== "mock") {
    throw new Error("only the local mock provider is available in this MVP");
  }
  return { input, output, provider };
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const inputText = await readFile(resolve(args.input), "utf8");
  const problem = validateProblem(JSON.parse(inputText));
  const artifact = runMockColloquium(problem);
  const outputDirectory = resolve(args.output);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "artifact.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  await writeFile(resolve(outputDirectory, "report.md"), renderReport(artifact), "utf8");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
