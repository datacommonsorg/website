/**
 * ONE Data Commons — Webpack wrapper
 *
 * Loads the upstream webpack.config.js and applies overrides from
 * webpack.custom_dc.js (entry points, resolve aliases, etc.).
 *
 * This allows webpack.config.js to stay 100% identical to upstream,
 * eliminating merge conflicts when syncing.
 *
 * Usage: webpack --config webpack.one.js --mode=production
 */

const baseConfigFn = require("./webpack.config.js");

// Load custom DC overrides (entry point replacements, theme alias, etc.)
let customConfig;
try {
  customConfig = require("./webpack.custom_dc.js");
} catch (e) {
  customConfig = {};
}

module.exports = (env, argv) => {
  const config = baseConfigFn(env, argv);

  // Override / remove entry points
  if (customConfig.entry) {
    for (const [key, value] of Object.entries(customConfig.entry)) {
      if (value === null) {
        delete config.entry[key];
      } else {
        config.entry[key] = value;
      }
    }
  }

  // Merge resolve config (aliases, extensions, etc.)
  if (customConfig.resolve) {
    config.resolve = {
      ...config.resolve,
      ...customConfig.resolve,
      alias: {
        ...config.resolve?.alias,
        ...customConfig.resolve?.alias,
      },
    };
  }

  return config;
};
