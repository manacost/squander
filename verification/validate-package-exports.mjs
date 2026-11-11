import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const package_json = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(package_json.peerDependencies?.["pixi.js"], undefined);
assert.equal(package_json.devDependencies?.["pixi.js"], undefined);
assert.deepEqual(Object.keys(package_json.exports), [
  ".",
  "./core",
  "./core/runtime",
  "./ecs",
  "./signals",
  "./svelte",
  "./svelte/adapter",
]);

const root = await import("squander");
const core = await import("squander/core");
const runtime = await import("squander/core/runtime");
const ecs = await import("squander/ecs");
const signals = await import("squander/signals");
const svelte_adapter = await import("squander/svelte/adapter");

assert.equal(typeof root.create_game, "function");
assert.equal("app" in root, false);
assert.equal("GameHost" in root, false);
assert.equal(typeof core.create_game, "function");
assert.equal(typeof core.create_path, "function");
assert.equal(typeof core.create_polygon, "function");
assert.equal(typeof runtime.create_path, "function");
assert.equal(typeof runtime.create_geometry_owner, "function");
assert.equal(typeof ecs.create_world, "function");
assert.equal(typeof ecs.define_component, "function");
assert.equal(typeof signals.create_signal, "function");
assert.equal(typeof signals.create_event_dispatcher, "function");
assert.equal(typeof svelte_adapter.create_game_adapter, "function");

await assert.rejects(import("squander/core/runtime/game"), (error) => error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED");
await assert.rejects(import("squander/docs/core-guides"), (error) => error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED");

console.log("Validated explicit package exports and rejected undocumented deep imports");
