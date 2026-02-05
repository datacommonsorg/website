/**
 * Copyright 2025 Google LLC
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
 * One.org: Entry point for the base template. This file will render two apps: one for the header and one for the footer.
 */

import React from "react";
import ReactDOM from "react-dom";

import { HeaderApp } from "./header_app";

window.addEventListener("load", async (): Promise<void> => {
  const metadataContainer = document.getElementById("metadata-base");

  await renderPage(metadataContainer);
});

async function renderPage(metadataContainer: HTMLElement): Promise<void> {
  const primarySiteWebRoot = metadataContainer.dataset.primarySiteWebRoot;
  const searchBarHashMode =
    metadataContainer.dataset.searchBarHashMode.toLowerCase() === "true";

  ReactDOM.render(
    React.createElement(HeaderApp, {
      searchBarHashMode,
      primarySiteWebRoot,
    }),
    document.getElementById("main-header")
  );
}
