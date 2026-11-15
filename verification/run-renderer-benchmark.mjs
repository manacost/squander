import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "node";
const enforce = process.argv.includes("--guard");
const executable = mode === "browser" ? (process.platform === "win32" ? "npx.cmd" : "npx") : process.execPath;
const command =
  mode === "browser"
    ? ["--no-install", "playwright", "test", "--config=playwright.webgpu.config.ts", "tests/webgpu-renderer-performance.spec.ts"]
    : ["node_modules/vitest/vitest.mjs", "--config", "verification/vitest.renderer.config.ts", "run", "--reporter=verbose"];

const child = spawn(executable, command, {
  env: { ...process.env, ...(enforce ? { RENDERER_BENCHMARK_ENFORCE: "1" } : {}) },
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once("close", (code) => {
  process.exitCode = code ?? 1;
});
