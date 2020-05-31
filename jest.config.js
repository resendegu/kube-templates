module.exports = {
  globals: {
    "ts-jest": {
      diagnostics: false,
    },
  },
  modulePaths: ["<rootDir>/src/"],
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  verbose: true,
  testTimeout: 60000,
};
