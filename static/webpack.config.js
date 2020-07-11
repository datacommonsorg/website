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

const config = {
  entry: {
    kg: __dirname + "/js/kg.js",
    gni: __dirname + "/js/gni.js",
    download: __dirname + "/js/download.js",
    scatter: __dirname + "/js/scatter.js",
    translator: __dirname + "/js/translator.js",
    dev: __dirname + "/js/dev.ts",
    place_overview: __dirname + "/js/place_overview.ts",
    mcf_playground: __dirname + "/js/mcf_playground.js",
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
    ],
  },
  plugins: [
    new CopyPlugin([
      { from: "css/**/*" },
      { from: "images/*" },
      { from: "fonts/*" },
      { from: "data/**/*" },
      { from: "favicon.ico" },
    ]),
  ],
};
module.exports = [config];
