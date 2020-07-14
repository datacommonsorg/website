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
    kg: [__dirname + "/js/kg.js", __dirname + "/css/kg.scss"],
    gni: __dirname + "/js/gni.js",
    download: __dirname + "/js/download.js",
    scatter: [__dirname + "/js/scatter.js", __dirname + "/css/scatter.scss"],
    translator: [
      __dirname + "/js/translator.js",
      __dirname + "/css/translator.scss",
    ],
    dev: __dirname + "/js/dev.js",
    place_overview: __dirname + "/js/place_overview.js",
    mcf_playground: __dirname + "/js/mcf_playground.js",
    search: __dirname + "/css/search.scss",
    static: __dirname + "/css/static.scss",
  },
  output: {
    path: path.resolve(__dirname, "../") + "/server/dist",
    filename: "[name].js",
  },
  resolve: {
    extensions: [".js", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.ts?$/,
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
      { from: "favicon.ico" },
    ]),
    new FixStyleOnlyEntriesPlugin({
      silent: true,
    }),
  ],
};
module.exports = [config];
