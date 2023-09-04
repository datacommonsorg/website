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
 * Main component for homnepage.
 */
import "../../../library";

import React from "react";

import { NlSearchBar } from "../../components/nl_search_bar";

/**
 * Application container
 */
export function App(): JSX.Element {
  return (
    <NlSearchBar
      inputId="query-search-input"
      onSearch={(q) => {
        window.location.href = `/explore#q=${encodeURIComponent(q)}`;
      }}
      placeholder={"Enter a question to explore"}
      initialValue={""}
      shouldAutoFocus={false}
    />
  );
}
