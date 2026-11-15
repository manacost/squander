import { spawnSync } from "node:child_process";
import { join } from "node:path";

const file_extensions = new Set([".cjs", ".js", ".mjs", ".svelte", ".ts"]);
const batch_size = 25;
const tracked_files = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  encoding: "utf8",
});

if (tracked_files.status !== 0) {
  process.stderr.write(tracked_files.stderr);
  process.exit(tracked_files.status ?? 1);
}

const files = tracked_files.stdout.split("\0").filter((file) => file_extensions.has(file.slice(file.lastIndexOf("."))));
const eslint_cli = join(process.cwd(), "node_modules", "eslint", "bin", "eslint.js");

for (let start = 0; start < files.length; start += batch_size) {
  const batch = files.slice(start, start + batch_size);
  process.stdout.write(`ESLint batch ${Math.floor(start / batch_size) + 1}: ${batch.length} files\n`);
  const result = spawnSync(process.execPath, [eslint_cli, ...batch, "--max-warnings", "0", "--no-warn-ignored"], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
