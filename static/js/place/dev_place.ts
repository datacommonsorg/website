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

import React from "react";
import ReactDOM from "react-dom";

import { NlSearchBar } from "../components/nl_search_bar";
import { intl } from "../i18n/i18n";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_PLACE_PAGE,
  triggerGAEvent,
} from "../shared/ga_events";

window.addEventListener("load", (): void => {
  renderPage();
});

/**
 * Handler for NL search bar
 * @param q search query entered by user
 */
function onSearch(q: string): void {
  triggerGAEvent(GA_EVENT_NL_SEARCH, {
    [GA_PARAM_QUERY]: q,
    [GA_PARAM_SOURCE]: GA_VALUE_SEARCH_SOURCE_PLACE_PAGE,
  });
  window.location.href = `/explore#q=${encodeURIComponent(q)}`;
}

function renderPage(): void {
  // Render NL search bar
  ReactDOM.render(
    React.createElement(NlSearchBar, {
      initialValue: "",
      inputId: "query-search-input",
      onSearch,
      placeholder: intl.formatMessage({
        defaultMessage: "Enter a question to explore",
        description:
          "Text inviting user to search for data using a question in natural language",
        id: "nl-search-bar-placeholder-text",
      }),
      shouldAutoFocus: false,
    }),
    document.getElementById("nl-search-bar")
  );
}
