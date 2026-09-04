import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/miniprogram_npm/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["miniprogram/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.es2020,
        wx: "readonly",
        App: "readonly",
        Page: "readonly",
        Component: "readonly",
        getApp: "readonly",
        getCurrentPages: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
