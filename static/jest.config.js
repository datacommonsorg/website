module.exports = {
  setupFiles: ["<rootDir>/setup.js"],
  verbose: true,
  preset: "ts-jest/presets/js-with-ts",
  globals: {
    google: {},
    "ts-jest": {
      tsconfig: {
        module: "commonjs",
      },
    },
  },
  testEnvironment: "jest-environment-jsdom",
};
