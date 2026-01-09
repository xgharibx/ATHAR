module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ["eslint:recommended", "plugin:react-hooks/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh", "@typescript-eslint"],
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }]
  }
};
