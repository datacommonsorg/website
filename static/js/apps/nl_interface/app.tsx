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

import React, { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { Container } from "reactstrap";

import { TextSearchBar } from "../../components/text_search_bar";
import { QueryResult } from "./query_result";

const buildOptions = [
  {
    value: "combined_all",
    text: "---- Choose an Embeddings Build option (default: Combined All) -------",
  },
  { value: "demographics300", text: "Demographics only (300 SVs)" },
  {
    value: "demographics300-withpalmalternatives",
    text: "Demographics only (300 SVs) with PaLM Alternatives",
  },
  { value: "uncurated3000", text: "Uncurated 3000 SVs" },
  { value: "combined_all", text: "Combined All of the Above (Default)" },
];

export function App(): JSX.Element {
  const [queries, setQueries] = useState<string[]>([]);
  const [selectedBuild, setSelectedBuild] = useState(buildOptions[0].value);

  const handleEmbeddingsBuildChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const build = event.target.value;
    setSelectedBuild(build);
    const params = new URLSearchParams(window.location.search);
    params.set("build", build);
  };

  const queryResults = queries.map((q, i) => <QueryResult key={i} query={q} build_option={selectedBuild}></QueryResult>);
  return (
    <div id="dc-nl-interface">
      <div id="build-selector">
        <div id="embeddings-build-options">
          <select
            value={selectedBuild}
            onChange={handleEmbeddingsBuildChange}
          >
            {buildOptions.map((option, idx) => (
              <option key={idx} value={option.value}>
                {option.text}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Container id="results-thread-container" fluid={true}>
        { queryResults }
      </Container>

      <Container id="query-container" fluid={true}>
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
  );
}