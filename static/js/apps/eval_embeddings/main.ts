/**
 * Copyright 2024 Google LLC
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

/**
 * Entrypoint for NL Eval page.
 */

import React from "react";
import ReactDOM from "react-dom";

import { App } from "./app";

const EVAL_INDEXES = new Set(["base_uae_mem", "medium_ft", "base_mistral_mem"]);

window.onload = () => {
  renderPage();
};

function renderPage(): void {
  const evalGolden = JSON.parse(
    document.getElementById("metadata").dataset.evalGolden
  );
  const serverConfig = JSON.parse(
    document.getElementById("metadata").dataset.serverConfig
  );
  const index2model = {};
  for (const indexName in serverConfig["indexes"]) {
    if (EVAL_INDEXES.has(indexName)) {
      index2model[indexName] = serverConfig["indexes"][indexName]["model"];
    }
  }
  ReactDOM.render(
    React.createElement(App, {
      evalGolden,
      index2model,
    }),
    document.getElementById("dc-eval-embeddings")
  );
}
