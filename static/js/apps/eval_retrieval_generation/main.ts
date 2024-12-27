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
 * Entrypoint for retrieval generation eval page.
 */

import React from "react";
import ReactDOM from "react-dom";

import { App } from "./app";
import { SessionContextProvider } from "./context";

window.addEventListener("load", (): void => {
  renderPage();
});

function renderPage(): void {
  const sheetId = document.getElementById("metadata").dataset.sheetId;
  ReactDOM.render(
    React.createElement(
      SessionContextProvider,
      null,
      React.createElement(App, {
        sheetId,
      })
    ),
    document.getElementById("dc-eval-retrieval-generation")
  );
}
