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
  moduleNameMapper: {
    '^d3$': '<rootDir>/node_modules/d3/dist/d3.min.js',
  },
  testEnvironment: "jest-environment-jsdom",
};
