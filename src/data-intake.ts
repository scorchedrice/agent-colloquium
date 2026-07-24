import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";

export type DataInventory = Readonly<{
  name: string;
  format: "csv" | "tsv" | "json";
  bytes: number;
  rows: number;
  columns: string[];
}>;

export async function inspectDataFiles(paths: string[]): Promise<DataInventory[]> {
  return Promise.all(paths.map(inspectDataFile));
}

async function inspectDataFile(path: string): Promise<DataInventory> {
  const format = formatFor(path);
  try {
    const metadata = await stat(path);
    if (!metadata.isFile()) throw new Error("data path must be a file");
    const text = await readFile(path, "utf8");
    const summary = format === "json" ? inspectJson(text) : inspectDelimited(text, format);
    return Object.freeze({ name: basename(path), format, bytes: metadata.size, ...summary });
  } catch (error) {
    if (error instanceof Error && /^(csv|tsv) data file|^JSON data|^data path/.test(error.message)) throw error;
    throw new Error("unable to inspect data file");
  }
}

function formatFor(path: string): DataInventory["format"] {
  const extension = extname(path).toLowerCase();
  if (extension === ".csv") return "csv";
  if (extension === ".tsv") return "tsv";
  if (extension === ".json") return "json";
  throw new Error(`unsupported data file extension: ${extension || "none"}`);
}

function inspectDelimited(text: string, format: "csv" | "tsv"): Pick<DataInventory, "rows" | "columns"> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) throw new Error(`${format} data file must include a header`);
  const delimiter = format === "csv" ? "," : "\t";
  const columns = lines[0].split(delimiter).map((column) => column.trim()).filter((column) => column !== "");
  if (columns.length === 0) throw new Error(`${format} data file must include at least one column`);
  return { rows: Math.max(0, lines.length - 1), columns };
}

function inspectJson(text: string): Pick<DataInventory, "rows" | "columns"> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("JSON data is invalid");
  }
  if (Array.isArray(value)) {
    const objects = value.filter(isRecord);
    if (objects.length !== value.length) throw new Error("JSON data array must contain objects only");
    return { rows: objects.length, columns: unique(objects.flatMap((item) => Object.keys(item))) };
  }
  if (isRecord(value)) return { rows: 1, columns: Object.keys(value) };
  throw new Error("JSON data must be an object or an array of objects");
}

function unique(values: string[]): string[] { return [...new Set(values)]; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
