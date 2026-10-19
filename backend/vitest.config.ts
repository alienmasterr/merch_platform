import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/modules/**"],
      reporter: ["text", "lcov"],
    },
  },
});
