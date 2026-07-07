import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Match the app's "@/*" path alias.
      "@": root.replace(/\/$/, ""),
      // `server-only` throws outside a React Server Component; stub it so server
      // modules (services/repos/lib) can be unit-tested for their pure parts.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
