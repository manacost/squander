import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspace = mkdtempSync(join(tmpdir(), "squander-consumer-"));
const cache = process.env.npm_config_cache ?? "/tmp/squander-npm-cache";
const npm_environment = { ...process.env, npm_config_cache: cache };

execFileSync("npm", ["pack", "--pack-destination", workspace], {
  cwd: repository,
  env: npm_environment,
  stdio: "ignore",
});
const archive = join(
  workspace,
  readdirSync(workspace).find((entry) => entry.endsWith(".tgz")),
);

const create_consumer = (name) => {
  const directory = join(workspace, name);
  mkdirSync(directory);
  writeFileSync(join(directory, "package.json"), JSON.stringify({ name, private: true, type: "module" }));
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", "--omit=peer", archive], {
    cwd: directory,
    env: npm_environment,
    stdio: "ignore",
  });
  return directory;
};

const core_consumer = create_consumer("core-consumer");
execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `
  const root = await import("squander");
  const core = await import("squander/core");
  const runtime = await import("squander/core/runtime");
  const ecs = await import("squander/ecs");
  if (typeof root.create_game !== "function" || typeof core.create_path !== "function" || typeof runtime.create_game !== "function" || typeof ecs.create_world !== "function" || typeof ecs.define_component !== "function") process.exit(1);
  if ("GameHost" in root || "app" in root) process.exit(1);
`,
  ],
  { cwd: core_consumer, env: npm_environment, stdio: "inherit" },
);

const svelte_consumer = create_consumer("svelte-consumer");
symlinkSync(join(repository, "node_modules/svelte"), join(svelte_consumer, "node_modules/svelte"), "dir");
execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `
  const adapter = await import("squander/svelte/adapter");
  const { compile } = await import("svelte/compiler");
  const source = ${JSON.stringify(readFileSync(join(svelte_consumer, "node_modules/squander/dist/svelte/GameHost.svelte"), "utf8"))};
  if (typeof adapter.create_game_adapter !== "function") process.exit(1);
  compile(source, { generate: "client" });
`,
  ],
  { cwd: svelte_consumer, env: npm_environment, stdio: "inherit" },
);

assert.ok(archive.endsWith(".tgz"));
console.log("Validated isolated consumers with and without Svelte");
