import assert from "node:assert/strict";

const core = await import("squander/core");
const runtime = await import("squander/core/runtime");
const svelte_adapter = await import("squander/svelte/adapter");

assert.equal(typeof core.create_game, "function");
assert.equal(typeof core.create_path, "function");
assert.equal(typeof core.create_polygon, "function");
assert.equal(typeof runtime.create_path, "function");
assert.equal(typeof runtime.create_geometry_owner, "function");
assert.equal(typeof svelte_adapter.create_game_adapter, "function");

console.log("Validated package subpaths: squander/core, squander/core/runtime, squander/svelte/adapter");
