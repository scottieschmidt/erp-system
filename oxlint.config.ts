import QueryPlugin from "@tanstack/eslint-plugin-query";
import RouterPlugin from "@tanstack/eslint-plugin-router";
import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["oxc", "eslint", "typescript", "unicorn", "react", "import"],
  jsPlugins: ["@tanstack/eslint-plugin-query", "@tanstack/eslint-plugin-router"],
  options: {
    typeAware: true,
    typeCheck: true,
  },
  rules: {
    ...QueryPlugin.configs.recommended.rules,
    ...RouterPlugin.configs.recommended.rules,
    "react/no-children-prop": "off",
    "import/first": "warn",
    "import/no-duplicates": ["warn", { "prefer-inline": true }],
    "import/consistent-type-specifier-style": ["warn", "prefer-inline"],
  },
});
