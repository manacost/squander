import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["verification/ecs-*.test.ts"],
  },
});
