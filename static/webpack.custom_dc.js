module.exports = {
  entry: {
    base: [__dirname + "/js/apps/custom_dc/one/base/main.ts", __dirname + "/css/custom_dc/one/core.scss"],
    homepage_custom_dc: null,
    homepage: [
      __dirname + "/js/apps/custom_dc/one/homepage/main.ts",
      __dirname + "/css/custom_dc/one/homepage.scss",
    ],
  },
  resolve: {
    modules: [__dirname, "node_modules"],
    alias: {
      'theme': __dirname + '/js/theme/dc_custom_theme',
    },
  },
};