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

window.onload = () => {
  renderPage();
};

function renderPage(): void {
  const sheetIdLeft = document.getElementById("metadata").dataset.sheetIdLeft;
  const sheetIdRight = document.getElementById("metadata").dataset.sheetIdRight;
  const queryId = document.getElementById("metadata").dataset.queryId;

  if (!sheetIdLeft || !sheetIdRight || !queryId) {
    alert(
      "Missing URL parameter. Please ensure you have provided a valid sheetIdLeft, sheetIdRight, and queryId."
    );
    return;
  }

  ReactDOM.render(
    React.createElement(App, {
      queryId: Number(queryId),
      sheetIdLeft,
      sheetIdRight,
    }),
    document.getElementById("dc-eval-retrieval-generation")
  );
}
