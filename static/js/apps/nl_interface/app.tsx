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
import { Container } from "reactstrap";

import { TextSearchBar } from "../../components/text_search_bar";
import { QueryResult } from "./query_result";

export function App(): JSX.Element {
  const [queries, setQueries] = useState<string[]>([]);
  const [contextHistory, setContextList] = useState<any[]>([]);

  useEffect(() => {
    // Scroll to the last query.
    // HACK: use refs / callback to the last element.
    const timer = setTimeout(() => {
      console.log(`scrolling to top: ${queries[queries.length - 1]}`);
      const queryDivs = document.getElementsByClassName("nl-query");
      if (queryDivs.length > 1) {
        queryDivs[queryDivs.length - 1].scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "start",
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [queries]);

  function addContext(context: any, idx: number) {
    // Always assume we are appending context for the latest query.
    if (idx !== queries.length - 1) {
      console.error(
        "setting context for wrong length: idx:%i != queries:%i",
        idx,
        queries.length
      );
      return;
    }
    const newList = [...contextHistory];
    newList.push(context);
    setContextList(newList);
  }

  const queryResults = queries.map((q, i) => (
    <QueryResult
      key={i}
      queryIdx={i}
      query={q}
      contextHistory={contextHistory.slice(0, i)}
      addContextCallback={addContext}
    ></QueryResult>
  ));

  return (
    <div id="dc-nl-interface">
      <div id="results-thread-container">{queryResults}</div>

      <div id="search-container">
        <Container>
          <div className="place-options-section">
            <TextSearchBar
              onSearch={(q) => {
                setQueries([...queries, q]);
              }}
              initialValue=""
              placeholder='For example "family earnings in california"'
              shouldAutoFocus={true}
              clearValueOnSearch={true}
            />
          </div>
        </Container>
      </div>
    </div>
  );
}
