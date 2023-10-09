module.exports = {
  modulePaths: ["<rootDir>/src/"],
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  verbose: true,
  testTimeout: 180_000,
};
