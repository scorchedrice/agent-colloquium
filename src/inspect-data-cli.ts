import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectDataFiles } from "./data-intake.js";
import { validateExecutionTargets, type ExecutionTargets } from "./execution-targets.js";

type Arguments = { targets: string; files: string[] };

function parseArguments(args: string[]): Arguments {
  const values = args[0] === "--" ? args.slice(1) : args;
  const files: string[] = [];
  let targets: string | undefined;
  for (let index = 0; index < values.length; index += 2) {
    const option = values[index];
    const value = values[index + 1];
    if (value === undefined) throw new Error("usage: colloquium:inspect-data -- --targets <file> --file <file> [--file <file>]");
    if (option === "--targets") {
      if (targets) throw new Error("duplicate option: --targets");
      targets = value;
    } else if (option === "--file") {
      files.push(value);
    } else {
      throw new Error(`unknown option: ${option}`);
    }
  }
  if (!targets || files.length === 0) throw new Error("--targets and at least one --file are required");
  return { targets, files };
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const targets = await readTargets(args.targets);
  const inventory = await inspectDataFiles(args.files.map((file) => resolve(file)));
  process.stdout.write(`${JSON.stringify({ dataClassification: targets.dataClassification, executionTargets: targets, inventory }, null, 2)}\n`);
}

async function readTargets(path: string): Promise<ExecutionTargets> {
  try {
    return validateExecutionTargets(JSON.parse(await readFile(resolve(path), "utf8")));
  } catch {
    throw new Error("execution targets configuration is invalid");
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
