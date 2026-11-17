import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "node_modules", "android", "ios", "CMIRC", "MIRC"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, prettier],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React Compiler rules: reported as warnings. The app does not use the
      // React Compiler; these mark code to clean up before adopting it.
      ...Object.fromEntries(
        Object.keys(reactHooks.configs.flat.recommended.rules)
          .filter((rule) => rule !== "react-hooks/rules-of-hooks" && rule !== "react-hooks/exhaustive-deps")
          .map((rule) => [rule, "warn"]),
      ),
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // The TypeScript compiler handles unused and undefined names; the base
      // rules give false positives on type-only names.
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-redeclare": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // Empty catch blocks are used to swallow non-critical errors on purpose.
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
]);
