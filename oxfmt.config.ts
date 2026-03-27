import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["package-lock.json", "worker-configuration.d.ts", "routeTree.gen.ts"],
  printWidth: 100,
  sortTailwindcss: {
    stylesheet: "./src/styles.css",
    functions: ["clsx", "cn"],
  },
  sortImports: {},
});
