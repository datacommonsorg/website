/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const FixStyleOnlyEntriesPlugin = require("webpack-remove-empty-scripts");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

const smp = new SpeedMeasurePlugin();

const config = {
  entry: {
    scatter: [
      __dirname + "/js/tools/scatter/scatter.ts",
      __dirname + "/css/tools/scatter.scss",
    ],
    map: [
      __dirname + "/js/tools/map/map.ts",
      __dirname + "/css/tools/map.scss",
    ],
    stat_var: [
      __dirname + "/js/tools/stat_var/stat_var.ts",
      __dirname + "/css/tools/stat_var.scss",
    ],
    dev: [__dirname + "/js/dev.ts", __dirname + "/css/dev.scss"],
    diff: [__dirname + "/js/apps/diff/main.ts", __dirname + "/css/diff.scss"],
    timeline: [
      __dirname + "/js/tools/timeline/timeline.ts",
      __dirname + "/css/tools/timeline.scss",
    ],
    timeline_bulk_download: [__dirname + "/js/tools/timeline/bulk_download.ts"],
    mcf_playground: __dirname + "/js/mcf_playground.js",
    queryStore: path.resolve(__dirname, "js/shared/stores/query_store.ts"),
    base: [__dirname + "/js/apps/base/main.ts", __dirname + "/css/core.scss"],
    place: [
      __dirname + "/js/place/place.ts",
      __dirname + "/css/place/place_page.scss",
    ],
    place_landing: [
      __dirname + "/js/place/place_landing.ts",
      __dirname + "/css/place/place_landing.scss",
    ],
    dev_place: [
      __dirname + "/js/place/dev_place.ts",
      __dirname + "/css/place/dev_place_page.scss",
    ],
    topic_page: [
      __dirname + "/js/apps/topic_page/main.ts",
      __dirname + "/css/topic_page.scss",
    ],
    explore_landing: [
      __dirname + "/js/apps/explore_landing/main.ts",
      __dirname + "/css/explore_landing.scss",
    ],
    explore: [
      __dirname + "/js/apps/explore/main.ts",
      __dirname + "/css/explore.scss",
    ],
    eval_embeddings: [
      __dirname + "/js/apps/eval_embeddings/main.ts",
      __dirname + "/css/eval_embeddings.scss",
    ],
    eval_retrieval_generation: [
      __dirname + "/js/apps/eval_retrieval_generation/main.ts",
      __dirname + "/css/eval_retrieval_generation.scss",
    ],
    eval_retrieval_generation_sxs: [
      __dirname + "/js/apps/eval_retrieval_generation/sxs/main.ts",
    ],
    ranking: [
      __dirname + "/js/ranking/ranking.ts",
      __dirname + "/css/ranking.scss",
    ],
    browser: [
      __dirname + "/js/browser/browser.ts",
      __dirname + "/css/browser.scss",
    ],
    browser_landing: [
      __dirname + "/js/apps/browser_landing/main.ts",
      __dirname + "/css/browser_landing.scss",
    ],
    biomedical: __dirname + "/css/biomedical/biomedical_shared.scss",
    biomedical_landing: [
      __dirname + "/js/biomedical/landing/main.ts",
      __dirname + "/css/biomedical/biomedical_landing.scss",
    ],
    disease: [
      __dirname + "/js/biomedical/disease/disease.ts",
      __dirname + "/css/biomedical/disease.scss",
    ],
    protein: [
      __dirname + "/js/biomedical/protein/protein.ts",
      __dirname + "/css/biomedical/protein.scss",
    ],
    static: __dirname + "/css/static.scss",
    screenshot: [
      __dirname + "/js/apps/screenshot/main.ts",
      __dirname + "/css/screenshot.scss",
    ],
    search: [
      __dirname + "/js/search/search.ts",
      __dirname + "/css/search.scss",
    ],
    download: [
      __dirname + "/js/tools/download/download.ts",
      __dirname + "/css/tools/download.scss",
    ],
    import_wizard: [
      __dirname + "/js/import_wizard/import_wizard.ts",
      __dirname + "/css/import_wizard.scss",
    ],
    import_wizard2: [
      __dirname + "/js/import_wizard2/import_wizard.ts",
      __dirname + "/css/import_wizard2.scss",
    ],
    about: [
      __dirname + "/js/apps/about/main.ts",
      __dirname + "/css/about.scss",
    ],
    admin: [__dirname + "/js/admin/main.ts", __dirname + "/css/admin.scss"],
    build: [
      __dirname + "/js/apps/build/main.ts",
      __dirname + "/css/build.scss",
    ],
    disaster_dashboard: [
      __dirname + "/js/apps/disaster_dashboard/main.ts",
      __dirname + "/css/disaster_dashboard.scss",
    ],
    event: [
      __dirname + "/js/apps/event/main.ts",
      __dirname + "/css/event.scss",
    ],
    sustainability: [
      __dirname + "/js/apps/sustainability/main.ts",
      __dirname + "/css/sustainability.scss",
    ],
    datacommons: [__dirname + "/library/index.ts"],
    homepage: [
      __dirname + "/js/apps/homepage/main.ts",
      __dirname + "/css/homepage.scss",
    ],
    homepage_custom_dc: [
      __dirname + "/js/apps/homepage/main_custom_dc.ts",
      __dirname + "/css/homepage.scss",
    ],
    visualization: [
      __dirname + "/js/apps/visualization/main.ts",
      __dirname + "/css/tools/visualization.scss",
    ],
  },
  output: {
    path: path.resolve(__dirname, "../") + "/server/dist",
    filename: "[name].js",
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(css|scss)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "css/",
              name: "[name].min.css",
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new NodePolyfillPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "css/**/*.css" },
        { from: "images/**/*" },
        { from: "fonts/*" },
        { from: "data/**/*" },
        { from: "sitemap/*.txt" },
        { from: "custom_dc/**/*" },
        { from: "*favicon.ico" },
        { from: "robots.txt" },
      ],
    }),
    new FixStyleOnlyEntriesPlugin({
      silent: true,
    }),
  ],
};

module.exports = (env, argv) => {
  // If in development, disable optimization.minimize.
  // development and production are arguments.
  if (argv.mode === "development") {
    config.devtool = "source-map";
  }

  return argv.mode === "development" ? config : smp.wrap(config);
};
