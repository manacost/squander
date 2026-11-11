import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const docs_examples = join(repository, "verification", "docs-examples");
const read = (path) => readFileSync(join(repository, path), "utf8");

const canonical_files = [
  "root-game.ts",
  "runtime.ts",
  "ecs.ts",
  "signals.ts",
  "assets.ts",
  "webgpu.ts",
  "getting-started.svelte",
  "svelte-bridge.svelte",
];

for (const filename of canonical_files) {
  const source = readFileSync(join(docs_examples, filename), "utf8");
  assert.ok(source.trim().length > 0, `${filename} must contain source`);
}

const readme = read("README.md");
const root_game = readFileSync(join(docs_examples, "root-game.ts"), "utf8");
const readme_match = readme.match(/<!-- example:root-game:start -->\n\n?```ts\n([\s\S]*?)```\n\s*<!-- example:root-game:end -->/);
assert.ok(readme_match, "README must contain the marked root-game example");
assert.equal(readme_match[1], root_game, "README root-game example is out of sync");

const getting_started = read("src/routes/(docs)/docs/getting-started/+page.svelte");
assert.match(getting_started, /documentation_examples\.getting_started/);

const llms = read("src/routes/llms.txt/+server.ts");
assert.match(llms, /documentation_examples\.getting_started/);
assert.match(llms, /documentation_examples\.root_game/);
assert.match(llms, /supported and deferred behavior/);

const example_sources = read("src/routes/(docs)/docs/_examples/example-sources.ts");
for (const key of ["root_game", "runtime", "ecs", "signals", "assets", "webgpu", "getting_started", "svelte_bridge"]) {
  assert.match(example_sources, new RegExp(`\\b${key}\\b`), `missing canonical example source: ${key}`);
}

console.log(`Validated ${canonical_files.length} canonical documentation examples and their documentation references`);
