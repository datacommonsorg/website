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
const WebpackShellPlugin = require("webpack-shell-plugin-next");

const config = {
  entry: {
    // TODO(intrepiditee): Rename to scatter when ready.
    scatter2: [
      path.resolve(__dirname, "/js/tools/scatter2/scatter2.ts"),
      path.resolve(__dirname, "/css/tools/scatter2.scss")
    ],
    choropleth: [
      path.resolve(__dirname, "/js/tools/choropleth/choropleth_template.tsx"),
      path.resolve(__dirname, "/css/tools/choropleth.scss")
    ],
    dev: [
      path.resolve(__dirname, "/js/dev.ts"),
      path.resolve(__dirname, "/css/dev.scss")
    ],
    timeline: [
      path.resolve(__dirname, "/js/tools/timeline.ts"),
      path.resolve(__dirname, "/css/timeline.scss")
    ],
    kg: [
      "babel-polyfill",
      path.resolve(__dirname,  "/js/browser/kg.js"),
      path.resolve(__dirname, "/css/kg.scss")
    ],
    mcf_playground: path.resolve(__dirname, "/js/mcf_playground.js"),
    place: [
      path.resolve(__dirname, "/js/place/place.ts"),
      path.resolve(__dirname, "/css/place/place.scss"),
    ],
    place_landing: [path.resolve(__dirname, "/js/place/place_landing.ts")],
    ranking: [
      path.resolve(__dirname, "/js/ranking/ranking.ts"),
      path.resolve(__dirname, "/css/ranking.scss"),
    ],
    scatter: [
      path.resolve(__dirname, "/js/tools/scatter.js"),
      path.resolve(__dirname, "/css/scatter.scss"),
    ],
    search: path.resolve(__dirname, "/css/search.scss"),
    static: path.resolve(__dirname, "/css/static.scss"),
    translator: [
      path.resolve(__dirname, "/js/translator/translator.ts"),
      path.resolve(__dirname, "/css/translator.scss"),
    ],
  },
  output: {
    path: path.resolve(__dirname, "../server/dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
  },
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all'
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        }
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
    new CopyPlugin(
      {
        "patterns": [
            { from: "css/**/*.css" },
            { from: "images/*" },
            { from: "fonts/*" },
            { from: "data/**/*" },
            { from: "sitemap/*.txt" },
            { from: "favicon.ico" },
            { from: "robots.txt" },
          ]}),
    new FixStyleOnlyEntriesPlugin({
      silent: true,
    }),
    new WebpackShellPlugin({
      onBuildEnd: ["cp -r ../server/dist ../go/dist"],
    }),
  ],
};

module.exports = (env, argv) => {

  // If in development, disable optimization.minimize.
  // development and production are arguments.
  if (argv.mode === 'development') {
    config.optimization.minimize = false;
    config.optimization.splitChunks = false;
  }

  return config;
};
