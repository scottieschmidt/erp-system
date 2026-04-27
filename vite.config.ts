import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const enableDevtools = process.env.TANSTACK_DEVTOOLS === "true";

export default defineConfig(({ mode }) => {
  const isTest = mode === "test" || process.env.VITEST === "true";
  const useCloudflarePlugin =
    process.env.CLOUDFLARE_VITE === "true" || mode === "production";

  return {
    plugins: [
      enableDevtools && !isTest ? devtools() : undefined,
      isTest || !useCloudflarePlugin
        ? undefined
        : cloudflare({ inspectorPort: false, viteEnvironment: { name: "ssr" } }),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        importProtection: {
          client: {
            specifiers: [/cloudflare:/],
            files: ["src/lib/server/**"],
          },
        },
      }),
      viteReact(),
    ].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["@tanstack/react-router"],
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
