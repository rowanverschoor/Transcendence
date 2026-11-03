import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["**/*.spec.ts"],
      reporter: [
        "text",
        "html",
        "clover",
        "json",
        // Written to coverage/coverage.txt for the CI step summary
        ["text", { file: "coverage.txt" }],
      ],
    },
  },
});
