module.exports = {
  setupFiles: ["<rootDir>/setup.js"],
  verbose: true,
  preset: "ts-jest/presets/js-with-ts",
  globals: {
    google: {},
  },
  testEnvironment: "jest-environment-jsdom",
};
