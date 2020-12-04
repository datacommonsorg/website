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
const WebpackShellPlugin = require("webpack-shell-plugin");

const config = {
  entry: {
    // TODO(intrepiditee): Rename to scatter when ready.
    scatter2: [
      __dirname + "/js/tools/scatter2/scatter2.ts",
      __dirname + "/css/tools/scatter2.scss",
    ],
    choropleth: [
      __dirname + "/js/tools/choropleth/choropleth_template.tsx",
      __dirname + "/css/tools/choropleth.scss",
    ],
    dev: [__dirname + "/js/dev.ts", __dirname + "/css/dev.scss"],
    timeline: [
      __dirname + "/js/tools/timeline.ts",
      __dirname + "/css/timeline.scss",
    ],
    kg: [
      "babel-polyfill",
      __dirname + "/js/browser/kg.js",
      __dirname + "/css/kg.scss",
    ],
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
    scatter: [
      __dirname + "/js/tools/scatter.js",
      __dirname + "/css/scatter.scss",
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
    new WebpackShellPlugin({
      onBuildEnd: ["cp -r ../server/dist ../go/dist"],
    }),
  ],
};
module.exports = [config];
