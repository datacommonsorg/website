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
const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries");

const config = {
  entry: {
    dev: [__dirname + "/js/dev.ts", __dirname + "/css/dev.scss"],
    dev_menu: [
      __dirname + "/js/tools/dev_menu.ts",
      __dirname + "/css/timeline.scss",
    ],
    download: __dirname + "/js/tools/download.js",
    kg: [__dirname + "/js/browser/kg.js", __dirname + "/css/kg.scss"],
    mcf_playground: __dirname + "/js/mcf_playground.js",
    place: [
      __dirname + "/js/place/place.ts",
      __dirname + "/css/place/place.scss",
    ],
    scatter: [
      __dirname + "/js/tools/scatter.js",
      __dirname + "/css/scatter.scss",
    ],
    search: __dirname + "/css/search.scss",
    static: __dirname + "/css/static.scss",
    timeline: [
      __dirname + "/js/tools/timeline.js",
      __dirname + "/css/timeline.scss",
    ],
    translator: [
      __dirname + "/js/translator.js",
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
        use: "ts-loader",
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
    new CopyPlugin([
      { from: "css/**/*.css" },
      { from: "images/*" },
      { from: "fonts/*" },
      { from: "data/**/*" },
      { from: "sitemap/*.txt" },
      { from: "favicon.ico" },
      { from: "robots.txt" },
    ]),
    new FixStyleOnlyEntriesPlugin({
      silent: true,
    }),
  ],
};
module.exports = [config];
