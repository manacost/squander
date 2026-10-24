import eslint from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

const typed_files = ["*.ts", "src/**/*.ts", "src/**/*.svelte", "tests/**/*.ts"];

export default defineConfig(
  {
    ignores: ["build/**", ".svelte-kit/**", "dist/**", "playwright-report/**", "test-results/**", "coverage/**"],
  },
  eslint.configs.recommended,
  comments.recommended,
  {
    files: typed_files,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".svelte"],
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-unused-vars": ["error", { args: "all", argsIgnorePattern: "^_", caughtErrors: "all" }],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["snake_case"], leadingUnderscore: "allow" },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "import", format: null },
        { selector: "parameter", format: ["snake_case"], leadingUnderscore: "allow" },
        { selector: "property", modifiers: ["requiresQuotes"], format: null },
        { selector: "memberLike", modifiers: ["override"], format: null },
        // Svelte generates $-prefixed store bindings and uses runes as compiler intrinsics.
        { selector: "variable", filter: { regex: "^[$]", match: true }, format: null },
      ],
    },
  },
  svelte.configs.recommended,
  {
    files: ["src/**/*.svelte", "src/**/*.svelte.ts"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".svelte"],
      },
    },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
    rules: {
      "@eslint-community/eslint-comments/require-description": "error",
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
    },
  },
  prettier,
  svelte.configs.prettier,
);
