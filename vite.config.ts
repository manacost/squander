import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { defineConfig } from "vitest/config";

const configured_base = process.argv.includes("dev") ? "" : (process.env.BASE_PATH ?? "");
if (configured_base !== "" && (!configured_base.startsWith("/") || configured_base.endsWith("/"))) {
  throw new Error("BASE_PATH must be empty or start with / without a trailing /");
}
// Validation above narrows the environment string to SvelteKit’s base-path contract.
const base = configured_base as "" | `/${string}`;

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      extensions: [".svelte", ".md"],
      preprocess: [mdsvex({ extensions: [".md"] }), vitePreprocess()],
      paths: {
        base,
      },
    }),
  ],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/lib/**/*.{ts,svelte}"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "src/lib/ui/ui-type-testing.ts", "src/lib/polyfill/**"],
    },
  },
  server: {
    fs: {
      allow: ["./package.json"],
    },
  },
});
