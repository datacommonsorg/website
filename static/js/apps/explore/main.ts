/**
 * Copyright 2022 Google LLC
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
 * Entrypoint for DC Explore.
 */

import queryString from "query-string";
import React from "react";
import ReactDOM from "react-dom";

import { URL_HASH_PARAMS } from "../../constants/app/explore_constants";
import { loadLocaleData } from "../../i18n/i18n";
import { App } from "./app";

window.addEventListener("load", (): void => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      renderPage();
    }
  );
});

function renderPage(): void {
  const metadataContainer = document.getElementById("metadata-base");

  const hashParams = queryString.parse(window.location.hash);
  //if there is no metadataContainer, we do not hide the searchbar (as we are in a base where the flags
  //are not prepared)
  const hideHeaderSearchBar =
    !metadataContainer ||
    metadataContainer.dataset.hideHeaderSearchBar?.toLowerCase() === "true";

  // use demo mode when there are autoplay queries in the url hash
  const isDemo = !!hashParams[URL_HASH_PARAMS.AUTO_PLAY_QUERY];
  ReactDOM.render(
    React.createElement(App, { isDemo, hideHeaderSearchBar }),
    document.getElementById("dc-explore")
  );
}
