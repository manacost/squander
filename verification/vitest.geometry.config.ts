import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["verification/filled-path-benchmark.test.ts", "verification/stroke-benchmark.test.ts"],
  },
});
