import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture_root = join(repository, "verification", "consumer-fixtures");
const mode_argument = process.argv.find((argument) => argument.startsWith("--mode="));
const mode = mode_argument?.slice("--mode=".length) ?? "full";

if (mode !== "fast" && mode !== "full") {
  throw new Error(`Unknown consumer validation mode: ${mode}`);
}

const workspace = mkdtempSync(join(tmpdir(), "squander-consumer-"));
const cache = mkdtempSync(join(tmpdir(), "squander-npm-cache-"));
const npm_environment = {
  ...process.env,
  npm_config_cache: cache,
  npm_config_fetch_retries: "0",
  npm_config_fetch_timeout: "10000",
};
const tsc = join(repository, "node_modules", "typescript", "bin", "tsc");

const cleanup = () => {
  rmSync(workspace, { recursive: true, force: true });
  rmSync(cache, { recursive: true, force: true });
};
process.once("exit", cleanup);

const run = (phase, executable, arguments_, options = {}) => {
  try {
    return execFileSync(executable, arguments_, {
      cwd: options.cwd ?? repository,
      env: options.env ?? npm_environment,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stdout = typeof error.stdout === "string" ? error.stdout : "";
    const stderr = typeof error.stderr === "string" ? error.stderr : "";
    throw new Error(`Consumer validation failed during ${phase}\n${stdout}${stderr}`, { cause: error });
  }
};

const write_consumer_files = (directory) => {
  mkdirSync(join(directory, "src"), { recursive: true });
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ name: `squander-${mode}-consumer`, private: true, type: "module" }, null, 2),
  );
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          lib: ["ES2022", "DOM"],
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ),
  );
  copyFileSync(join(fixture_root, "core-consumer.ts"), join(directory, "src", "core-consumer.ts"));
  copyFileSync(join(fixture_root, "svelte-consumer.ts"), join(directory, "src", "svelte-consumer.ts"));
  const docs_directory = join(directory, "src", "docs-examples");
  mkdirSync(docs_directory);
  for (const filename of readdirSync(join(repository, "verification", "docs-examples"))) {
    if (filename.endsWith(".ts")) copyFileSync(join(repository, "verification", "docs-examples", filename), join(docs_directory, filename));
  }
};

const link_local_dependencies = (directory) => {
  mkdirSync(join(directory, "node_modules"), { recursive: true });
  symlinkSync(repository, join(directory, "node_modules", "squander"), "dir");
  symlinkSync(join(repository, "node_modules", "svelte"), join(directory, "node_modules", "svelte"), "dir");
  symlinkSync(join(repository, "node_modules", "prismjs"), join(directory, "node_modules", "prismjs"), "dir");
};

const create_archive = () => {
  run("package archive creation", "npm", ["pack", "--ignore-scripts", "--pack-destination", workspace]);
  const filename = readdirSync(workspace).find((entry) => entry.endsWith(".tgz"));
  assert.ok(filename, "npm pack did not create a tarball");
  return join(workspace, filename);
};

const create_svelte_archive = () => {
  const svelte_directory = join(repository, "node_modules", "svelte");
  run("Svelte archive creation", "npm", ["pack", "--ignore-scripts", "--pack-destination", workspace], { cwd: svelte_directory });
  const filename = readdirSync(workspace).find((entry) => entry.startsWith("svelte-") && entry.endsWith(".tgz"));
  assert.ok(filename, "npm pack did not create a Svelte tarball");
  return join(workspace, filename);
};

const archive = mode === "full" ? create_archive() : undefined;
const svelte_archive = mode === "full" ? create_svelte_archive() : undefined;

const create_consumer = (name) => {
  const directory = join(workspace, name);
  mkdirSync(directory);
  write_consumer_files(directory);
  if (mode === "fast") {
    link_local_dependencies(directory);
  } else {
    run(
      `${name} package installation`,
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", svelte_archive, archive],
      { cwd: directory },
    );
  }
  return directory;
};

const core_consumer = create_consumer("core-consumer");
const svelte_consumer = create_consumer("svelte-consumer");

for (const consumer of [core_consumer, svelte_consumer]) {
  run(`${consumer} declaration compilation`, process.execPath, [tsc, "--noEmit", "-p", "tsconfig.json"], { cwd: consumer });
}

const runtime_probe = `
  const root = await import("squander");
  const core = await import("squander/core");
  const runtime = await import("squander/core/runtime");
  const ecs = await import("squander/ecs");
  const signals = await import("squander/signals");
  const adapter = await import("squander/svelte/adapter");
  if (typeof root.create_game !== "function" || typeof core.create_path !== "function" || typeof runtime.create_game !== "function" || typeof ecs.create_world !== "function" || typeof signals.create_signal !== "function" || typeof adapter.create_game_adapter !== "function") process.exit(1);
  if ("GameHost" in root || "app" in root) process.exit(1);
  try {
    await import("squander/core/runtime/game");
    process.exit(1);
  } catch (error) {
    if (!(error instanceof Error) || !["ERR_PACKAGE_PATH_NOT_EXPORTED", "ERR_MODULE_NOT_FOUND"].includes(error.code)) process.exit(1);
  }
`;
run("public runtime import probe", process.execPath, ["--input-type=module", "-e", runtime_probe], { cwd: core_consumer });

const svelte_sources = ["App.svelte", "getting-started.svelte", "svelte-bridge.svelte"].map((filename) => ({
  filename,
  source: readFileSync(
    join(filename === "App.svelte" ? fixture_root : join(repository, "verification", "docs-examples"), filename),
    "utf8",
  ),
}));
const svelte_probe = `
  const { compile } = await import("svelte/compiler");
  const sources = ${JSON.stringify(svelte_sources)};
  for (const { filename, source } of sources) {
    const result = compile(source, { generate: "client" });
    if (result.warnings.length > 0) throw new Error(filename + " produced Svelte warnings");
  }
`;
run("Svelte consumer compilation", process.execPath, ["--input-type=module", "-e", svelte_probe], { cwd: svelte_consumer });

cleanup();
console.log(`Validated ${mode} consumers with generated declarations, public imports, and Svelte compilation`);
