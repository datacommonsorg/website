/**
 * Copyright 2021 Google LLC
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

import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";

import { AllResults } from "./all_results";
import { SearchInput } from "./search_input";

window.addEventListener("load", (): void => {
  const searchParams = new URLSearchParams(location.search);
  const query = document.getElementById("search-input-container").dataset.query;
  const selectedPlace = searchParams.get("placeDcid") || "";
  const selectedStatVar = searchParams.get("svDcid") || "";
  ReactDOM.render(
    React.createElement(SearchInput, { query }),
    document.getElementById("search-input-container")
  );
  if (!_.isEmpty(query)) {
    ReactDOM.render(
      React.createElement(AllResults, {
        query,
        selectedPlace,
        selectedStatVar,
      }),
      document.getElementById("search-results-container")
    );
  }
});
