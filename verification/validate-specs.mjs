import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const specs_root = join(resolve("."), "specs");
const index_path = join(specs_root, "README.md");
const required_sections = [
  "Goal",
  "Status",
  "Requirements",
  "Scenarios",
  "Acceptance criteria",
  "Usage description",
  "Test references",
  "Notes",
];
const valid_statuses = ["Draft", "Accepted", "Implemented", "Deprecated"];
const errors = [];
const warnings = [];

function capability_status(source, path) {
  const status = source.match(/^## Status\n\n(?:\*\*)?([^*\n:.]+)(?:\*\*)?(?:\.|:)/m)?.[1]?.trim();
  if (!status || !valid_statuses.includes(status)) errors.push(`${path}: invalid lifecycle status`);
  return status;
}

function section_body(source, heading) {
  const heading_start = source.indexOf(`## ${heading}`);
  if (heading_start < 0) return undefined;
  const body_start = source.indexOf("\n", heading_start) + 1;
  const next_heading = source.slice(body_start).search(/\n## (?!#)/);
  return source.slice(body_start, next_heading < 0 ? undefined : body_start + next_heading);
}

function indexed_capabilities(source, heading) {
  const body = section_body(source, heading);
  if (body === undefined) return [];
  return [...body.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)$/gm)].map(([, label, target]) => {
    const target_path = target.split("#", 1)[0];
    const resolved_target = resolve(specs_root, target_path);
    const relative_target = resolved_target.startsWith(`${specs_root}/`) ? resolved_target.slice(specs_root.length + 1) : "";
    const capability = relative_target.match(/^([^/]+)\/spec\.md$/)?.[1];
    if (capability === undefined) {
      errors.push(`${index_path}: invalid capability link ${target}`);
      return { label, capability: "" };
    }
    if (label !== capability) errors.push(`${index_path}: link label ${label} does not match capability ${capability}`);
    return { label, capability };
  });
}

for (const capability of readdirSync(specs_root, { withFileTypes: true })) {
  if (!capability.isDirectory()) continue;
  const path = join(specs_root, capability.name, "spec.md");
  if (!existsSync(path)) {
    errors.push(`${capability.name}: missing spec.md`);
    continue;
  }
  const source = readFileSync(path, "utf8");
  if (source.match(/^# (.+)$/m)?.[1] !== capability.name) errors.push(`${path}: title must match directory name`);
  for (const section of required_sections) {
    if (!source.includes(`## ${section}`)) errors.push(`${path}: missing ## ${section}`);
  }
  const status = capability_status(source, path);
  if (status === "Implemented" && !/\[[^\]]+\]\([^)]+\)/.test(source))
    errors.push(`${path}: Implemented capability needs a test reference`);
  for (const [, target] of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("#")) continue;
    const target_path = target.split("#", 1)[0];
    if (target_path && !existsSync(resolve(dirname(path), target_path))) errors.push(`${path}: missing link target ${target}`);
  }
  if (!/No automated tests exist|tests are not claimed|Planned verification|\[[a-z0-9-]+\]/.test(source))
    warnings.push(`${path}: test evidence or an explicit test gap is not obvious`);
}

const index_source = readFileSync(index_path, "utf8");
const indexed = [
  ...indexed_capabilities(index_source, "Implemented capabilities").map((entry) => ({ ...entry, section: "Implemented" })),
  ...indexed_capabilities(index_source, "Draft capabilities").map((entry) => ({ ...entry, section: "Draft" })),
];
const indexable_capabilities = new Map();
for (const capability of readdirSync(specs_root, { withFileTypes: true })) {
  if (!capability.isDirectory() || capability.name === "specs") continue;
  const path = join(specs_root, capability.name, "spec.md");
  if (!existsSync(path)) continue;
  const status = capability_status(readFileSync(path, "utf8"), path);
  indexable_capabilities.set(capability.name, status);
}

const seen = new Set();
for (const entry of indexed) {
  if (seen.has(entry.capability)) errors.push(`${index_path}: duplicate capability ${entry.capability}`);
  seen.add(entry.capability);
  const expected_status = indexable_capabilities.get(entry.capability);
  if (expected_status === undefined) errors.push(`${index_path}: unknown capability ${entry.capability}`);
  else if (expected_status === "Implemented" ? entry.section !== "Implemented" : entry.section !== "Draft") {
    errors.push(`${index_path}: ${entry.capability} is ${expected_status} but indexed under ${entry.section}`);
  }
}
for (const [capability, status] of indexable_capabilities) {
  if (!seen.has(capability)) errors.push(`${index_path}: ${capability} (${status}) is missing from the capability index`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
for (const warning of warnings) console.warn(`warning: ${warning}`);
console.log(`Validated ${indexable_capabilities.size} product capability directories and their index entries.`);
