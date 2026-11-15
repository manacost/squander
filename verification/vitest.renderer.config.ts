import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["verification/renderer-benchmark.test.ts"],
  },
});
