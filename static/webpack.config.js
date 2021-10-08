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
    timeline: [
      __dirname + "/js/tools/timeline/timeline.ts",
      __dirname + "/css/timeline.scss",
    ],
    timeline_bulk_download: [__dirname + "/js/tools/timeline/bulk_download.ts"],
    mcf_playground: __dirname + "/js/mcf_playground.js",
    place: [
      __dirname + "/js/place/place.ts",
      __dirname + "/css/place/place.scss",
    ],
    place_landing: [__dirname + "/js/place/place_landing.ts"],
    ranking: [
      __dirname + "/js/ranking/ranking.ts",
      __dirname + "/css/ranking.scss",
    ],
    browser: [
      __dirname + "/js/browser/browser.ts",
      __dirname + "/css/browser.scss",
    ],
    protein: [
      __dirname + "/js/protein/protein.ts",
      __dirname + "/css/protein.scss",
    ],
    search: __dirname + "/css/search.scss",
    static: __dirname + "/css/static.scss",
    translator: [
      __dirname + "/js/translator/translator.ts",
      __dirname + "/css/translator.scss",
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
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
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
    new CopyPlugin({
      patterns: [
        { from: "css/**/*.css" },
        { from: "images/*" },
        { from: "fonts/*" },
        { from: "data/**/*" },
        { from: "sitemap/*.txt" },
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
    config.devtool = "eval-cheap-module-source-map";
  }

  return config;
};
