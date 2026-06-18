import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 180_000,
    // afterAll deletes the namespace (cockroach pods + PVCs), which can take
    // well over Vitest's 10s default hook timeout.
    hookTimeout: 180_000,
    // Integration tests run against a shared kind cluster; cap concurrency to
    // avoid overloading it (the Jest setup used `-w10`).
    fileParallelism: true,
    maxWorkers: 10,
  },
});
