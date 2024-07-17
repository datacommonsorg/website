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
 * Entrypoint for retrieval generation SXS eval page.
 */

import React from "react";
import ReactDOM from "react-dom";

import { App } from "./app";
import { SessionContextProvider } from "./context";

window.onload = () => {
  renderPage();
};

function renderPage(): void {
  let sheetIdA = document.getElementById("metadata").dataset.sheetIdA;
  let sheetIdB = document.getElementById("metadata").dataset.sheetIdB;
  const sessionId = document.getElementById("metadata").dataset.sessionId;

  if (!sheetIdA || !sheetIdB || !sessionId) {
    alert(
      "Missing URL parameter. Please ensure you have provided a valid sheetIdA, sheetIdB, and sessionId."
    );
    return;
  }

  // Put sheet IDs in lexicographical order so it doesn't matter what order
  // they are in the URL.
  if (sheetIdB < sheetIdA) {
    sheetIdB = [sheetIdA, (sheetIdA = sheetIdB)][0];
  }

  ReactDOM.render(
    React.createElement(
      SessionContextProvider,
      null,
      React.createElement(App, {
        sessionId,
        sheetIdA,
        sheetIdB,
      })
    ),
    document.getElementById("dc-eval-sxs")
  );
}
