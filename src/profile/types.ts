export type DataVisibility =
  | "evidence-packs-only"
  | "decontextualized-numeric-only"
  | "raw-internal-data";

export type ContextVisibility = "research-brief-and-evidence" | "none";
export type RoleCapability = "external-research" | "local-analysis";

type BaseProfileRole = {
  id: string;
  title: string;
  purpose: string;
};

export type PublicResearchRole = BaseProfileRole & {
  kind: "public-research";
  dataVisibility: "evidence-packs-only";
  contextVisibility: "research-brief-and-evidence";
  capabilities: readonly ["external-research"];
};

export type BlindLocalAnalysisRole = BaseProfileRole & {
  kind: "blind-local-analysis";
  dataVisibility: "decontextualized-numeric-only";
  contextVisibility: "none";
  capabilities: readonly ["local-analysis"];
};

export type ProfileRole = PublicResearchRole | BlindLocalAnalysisRole;

export type DeliberationProfile = {
  id: string;
  title: string;
  roles: readonly ProfileRole[];
};

export function defineProfileRole(value: unknown): ProfileRole {
  const role = record(value);
  const base = {
    id: requiredString(role.id, "role.id"),
    title: requiredString(role.title, "role.title"),
    purpose: requiredString(role.purpose, "role.purpose"),
  };
  const capabilities = requiredSingleCapability(role.capabilities);

  if (role.kind === "public-research") {
    if (role.dataVisibility !== "evidence-packs-only") {
      throw new Error("public-research roles must use evidence-packs-only");
    }
    if (role.contextVisibility !== "research-brief-and-evidence") {
      throw new Error("public-research roles must use research-brief-and-evidence context");
    }
    if (capabilities !== "external-research") {
      throw new Error("public-research roles must use external-research only");
    }
    return Object.freeze({ ...base, kind: role.kind, dataVisibility: role.dataVisibility, contextVisibility: role.contextVisibility, capabilities: Object.freeze(["external-research"]) as readonly ["external-research"] });
  }

  if (role.kind === "blind-local-analysis") {
    if (role.dataVisibility !== "decontextualized-numeric-only") {
      throw new Error("blind-local-analysis roles must use decontextualized-numeric-only");
    }
    if (role.contextVisibility !== "none") {
      throw new Error("blind-local-analysis roles must use no experiment context");
    }
    if (capabilities !== "local-analysis") {
      throw new Error("blind-local-analysis roles must use local-analysis only");
    }
    return Object.freeze({ ...base, kind: role.kind, dataVisibility: role.dataVisibility, contextVisibility: role.contextVisibility, capabilities: Object.freeze(["local-analysis"]) as readonly ["local-analysis"] });
  }

  throw new Error("role kind is invalid");
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("role must be an object");
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
  return value;
}

function requiredSingleCapability(value: unknown): RoleCapability {
  if (!Array.isArray(value) || value.length !== 1 || (value[0] !== "external-research" && value[0] !== "local-analysis")) {
    throw new Error("role capabilities must contain exactly one recognized capability");
  }
  return value[0];
}
