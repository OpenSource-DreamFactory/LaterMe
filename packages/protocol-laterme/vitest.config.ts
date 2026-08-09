import { defineConfig } from "vitest/config";

export default defineConfig({
  // Stage-3 decorators must be lowered by esbuild (same constraint as Moss).
  esbuild: { target: "es2022" },
  test: {
    environment: "node",
  },
});
