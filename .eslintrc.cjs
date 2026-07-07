module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ["eslint:recommended", "plugin:react-hooks/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh", "@typescript-eslint"],
  // CMIRC/MIRC are reference source projects (gitignored) with their own eslint
  // setups — walking into them breaks plugin resolution.
  ignorePatterns: ["dist", "node_modules", "CMIRC", "MIRC", "android", "ios"],
  rules: {
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    // TypeScript compiler handles unused-var & undefined checks — base ESLint rules
    // produce false positives on TS interface parameter names and DOM type references.
    "no-unused-vars": "off",
    "no-undef": "off",
    "no-redeclare": "off",
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "caughtErrorsIgnorePattern": "^_"
    }],
    // Allow empty catch blocks (intentional swallowing of non-critical errors)
    "no-empty": ["warn", { "allowEmptyCatch": true }]
  }
};
