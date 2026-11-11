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
    ignores: [
      "build/**",
      ".svelte-kit/**",
      "dist/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "examples/wails-jumping-rope/**",
      "verification/docs-examples/**",
      "verification/consumer-fixtures/**",
      // Copied agent skill bundles are not product runtime, app, or test code.
      ".agents/**",
      ".github/skills/**",
    ],
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
      // Keep the type system honest: narrow values or introduce a typed helper instead of asserting.
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression",
          message: "Use type narrowing, a type predicate, or a typed helper instead of a type assertion.",
        },
        {
          selector: "TSTypeAssertion",
          message: "Use type narrowing, a type predicate, or a typed helper instead of a type assertion.",
        },
      ],
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
        // Framework, WebGPU, and DOM contracts use externally defined property names.
        { selector: "property", format: null },
        { selector: "objectLiteralMethod", format: null },
        { selector: "typeMethod", format: null },
        { selector: "variable", filter: { regex: "^(on[A-Z]|__)", match: true }, format: null },
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
    // Documentation demos intentionally model browser boundaries and keep their evidence hooks local.
    files: ["src/routes/(docs)/**/*.svelte", "src/lib/docs/**/*.svelte"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // Async test doubles often mirror promise-returning framework APIs without awaiting work.
    files: ["src/**/*.test.ts", "src/**/*.spec.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/require-await": "off",
      // Test fixtures may need explicit boundary shapes for browser and GPU doubles.
      "no-restricted-syntax": "off",
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
