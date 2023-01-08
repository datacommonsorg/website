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
 * Main component for NL interface.
 */

import React, { useState } from "react";
import { Container } from "reactstrap";

import { TextSearchBar } from "../../components/text_search_bar";
import { QueryResult } from "./query_result";

export function App(): JSX.Element {
  const [queries, setQueries] = useState<string[]>([]);

  const queryResults = queries.map((q, i) => (
    <QueryResult key={i} query={q}></QueryResult>
  ));
  return (
    <div id="dc-nl-interface">
      <div id="results-thread-container">
        {queryResults}
      </div>

      <div id="search-container">
        <Container>
        <div className="place-options-section">
          <TextSearchBar
            onSearch={(q) => {
              setQueries([...queries, q]);
            }}
            initialValue=""
            placeholder='For example "family earnings in california"'
          />
        </div>
        </Container>
      </div>
    </div>
  );
}
