import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const specs_root = join(resolve("."), "specs");
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
  const status = source.match(/^## Status\n\n(?:\*\*)?([^*\n:.]+)(?:\*\*)?(?:\.|:)/m)?.[1]?.trim();
  if (!status || !valid_statuses.includes(status)) errors.push(`${path}: invalid lifecycle status`);
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

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
for (const warning of warnings) console.warn(`warning: ${warning}`);
console.log(
  `Validated ${readdirSync(specs_root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length} capability directories.`,
);
