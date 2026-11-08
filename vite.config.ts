import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { defineConfig } from "vitest/config";

const configured_base = process.argv.includes("dev") ? "" : (process.env.BASE_PATH ?? "");
const is_valid_base = (value: string): value is `/${string}` => value.startsWith("/") && !value.endsWith("/");
function normalize_base(value: string): "" | `/${string}`;
function normalize_base(value: string): "" | `/${string}` {
  if (value === "") return value;
  if (!is_valid_base(value)) {
    throw new Error("BASE_PATH must be empty or start with / without a trailing /");
  }
  return value;
}
const base = normalize_base(configured_base);

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
      allow: ["./package.json", "./verification"],
    },
  },
});
