/**
 * Copyright 2023 Google LLC
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
 * Entrypoint file for sustainability explorer.
 */

import "../../i18n/compiled-lang/en/units.json";

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../../i18n/i18n";
import { initSearchAutocomplete } from "../../shared/place_autocomplete";
import { loadSubjectPageMetadataFromPage } from "../../utils/subject_page_utils";
import { App } from "./app";

window.onload = () => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      renderPage();
    }
  );
  initSearchAutocomplete("/sustainability");
};

function renderPage(): void {
  const metadata = loadSubjectPageMetadataFromPage();

  ReactDOM.render(
    React.createElement(App, {
      metadata,
    }),
    document.getElementById("body")
  );
}
