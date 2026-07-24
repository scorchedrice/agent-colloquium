export const CODEX_TARGET = "codex" as const;
export const LOCAL_LLM_TARGET = "AGENT-COLLOQUIUM:LOCAL-LLM" as const;

export type DataClassification = "none" | "internal" | "sanitized-public";
export type InternalDataApproval = "not-applicable" | "local-only" | "codex-approved";
export type ExecutionTarget = typeof CODEX_TARGET | typeof LOCAL_LLM_TARGET;
export type ExecutionTargets = Readonly<{
  dataClassification: DataClassification;
  internalDataApproval: InternalDataApproval;
  defaultTarget: ExecutionTarget;
  roleTargets: Record<string, ExecutionTarget>;
}>;

const allowedKeys = new Set(["dataClassification", "internalDataApproval", "defaultTarget", "roleTargets"]);

export function validateExecutionTargets(value: unknown): ExecutionTargets {
  const plan = record(value, "execution targets");
  Object.keys(plan).forEach((key) => {
    if (!allowedKeys.has(key)) throw new Error(`execution targets has unsupported key: ${key}`);
  });
  if (plan.dataClassification !== "none" && plan.dataClassification !== "internal" && plan.dataClassification !== "sanitized-public") {
    throw new Error("execution targets dataClassification is invalid");
  }
  approval(plan.internalDataApproval);
  target(plan.defaultTarget, "execution targets defaultTarget");
  const roleTargets = record(plan.roleTargets, "execution targets roleTargets");
  Object.entries(roleTargets).forEach(([role, value]) => {
    if (role.trim() === "") throw new Error("execution targets roleTargets contains an empty role id");
    target(value, `execution targets roleTargets.${role}`);
  });
  if (plan.dataClassification !== "internal" && plan.internalDataApproval !== "not-applicable") {
    throw new Error("non-internal data requires internalDataApproval to be not-applicable");
  }
  if (plan.dataClassification === "internal" && plan.internalDataApproval === "not-applicable") {
    throw new Error("internal data requires an explicit internalDataApproval");
  }
  if (plan.dataClassification === "internal" && plan.internalDataApproval !== "codex-approved" && (plan.defaultTarget !== LOCAL_LLM_TARGET || Object.values(roleTargets).some((value) => value !== LOCAL_LLM_TARGET))) {
    throw new Error("internal Codex routing requires explicit codex-approved approval");
  }
  return Object.freeze({
    dataClassification: plan.dataClassification,
    internalDataApproval: plan.internalDataApproval,
    defaultTarget: plan.defaultTarget,
    roleTargets: Object.freeze({ ...roleTargets }) as Record<string, ExecutionTarget>,
  });
}

function target(value: unknown, label: string): asserts value is ExecutionTarget {
  if (value !== CODEX_TARGET && value !== LOCAL_LLM_TARGET) throw new Error(`${label} is invalid`);
}

function approval(value: unknown): asserts value is InternalDataApproval {
  if (value !== "not-applicable" && value !== "local-only" && value !== "codex-approved") {
    throw new Error("execution targets internalDataApproval is invalid");
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}
