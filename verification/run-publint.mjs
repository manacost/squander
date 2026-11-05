import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const cache_directory = await mkdtemp(join(tmpdir(), "squander-npm-cache-"));
const executable = process.platform === "win32" ? "npx.cmd" : "npx";

const run_publint = new Promise((resolve, reject) => {
  const child = spawn(executable, ["--no-install", "publint"], {
    env: { ...process.env, npm_config_cache: cache_directory },
    stdio: "inherit",
  });
  child.once("error", reject);
  child.once("close", (code) => resolve(code ?? 1));
});

try {
  process.exitCode = await run_publint;
} finally {
  await rm(cache_directory, { recursive: true, force: true });
}
