module.exports = {
  setupFiles: ["<rootDir>/setup.js"],
  verbose: true,
  preset: "ts-jest/presets/js-with-ts",
  globals: {
    google: {},
  },
  moduleNameMapper: {
    '^d3$': '<rootDir>/node_modules/d3/dist/d3.min.js',
  },
  testEnvironment: "jest-environment-jsdom",
};
