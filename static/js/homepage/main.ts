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
 * Entrypoint file for homepage.
 */

import React from "react";
import ReactDOM from "react-dom";

import { NlSearchBar } from "../components/nl_search_bar";
import { Carousel } from "./carousel";

window.onload = () => {
  renderPage();
};

function renderPage(): void {
  const partnerItems = JSON.parse(
    document.getElementById("partners-container").dataset.items
  );
  // Render the search bar
  ReactDOM.render(
    React.createElement(NlSearchBar, {
      inputId: "homepage-search-input",
      placeholder: "You can ask something like “family earning in california”",
    }),
    document.getElementById("search-container")
  );
  // Render the carousel for the partners section
  ReactDOM.render(
    React.createElement(Carousel, {
      items: partnerItems,
    }),
    document.getElementById("partners-container")
  );
}
