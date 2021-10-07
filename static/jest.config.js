module.exports = {
  setupFiles: ["<rootDir>/setup.js"],
  verbose: true,
  preset: "ts-jest/presets/js-with-ts",
  globals: {
    google: {},
  },
  // d3-geo-projection needs to be transformed in order be parsed by jest.
  transformIgnorePatterns: ["/node_modules/(?!(d3-geo-projection))"]
};
