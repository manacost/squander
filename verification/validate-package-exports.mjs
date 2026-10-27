import assert from "node:assert/strict";

const core = await import("squander/core");
const runtime = await import("squander/core/runtime");

assert.equal(typeof core.create_game, "function");
assert.equal(typeof core.create_path, "function");
assert.equal(typeof core.create_polygon, "function");
assert.equal(typeof runtime.create_path, "function");
assert.equal(typeof runtime.create_geometry_owner, "function");

console.log("Validated package subpaths: squander/core, squander/core/runtime");
