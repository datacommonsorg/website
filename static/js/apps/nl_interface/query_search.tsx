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
 * Component for search section of the NL interface.
 */

import _ from "lodash";
import React, { useState } from "react";
import { Button, Container } from "reactstrap";

import { TextSearchBar } from "../../components/text_search_bar";
import { NLOptions } from "./nl_options";

interface QuerySearchPropType {
  queries: string[];
  onQuerySearched: (query: string) => void;
  indexType: string;
  setIndexType: (idx: string) => void;
  detector: string;
  setDetector: (v: string) => void;
  placeDetector: string;
  setPlaceDetector: (v: string) => void;
}

export function QuerySearch(props: QuerySearchPropType): JSX.Element {
  const [showHistory, setShowHistory] = useState(false);
  const placeholderQuery =
    document.getElementById("metadata").dataset.placeholderQuery ||
    "family earnings in california";

  const queryHistory = getQueryHistory(props.queries);
  return (
    <div
      id="search-container"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setShowHistory(false);
        }
      }}
    >
      <Container tabIndex={-1}>
        <div className="search-section">
          <div className="search-box-section">
            {showHistory && (
              <div className="search-history-container">
                {_.isEmpty(queryHistory) && (
                  <div className="search-history-message">No past queries</div>
                )}
                {queryHistory.map((query, i) => {
                  return (
                    <div
                      key={`search-history-${i}`}
                      className="search-history-entry"
                      onClick={() => {
                        setShowHistory(false);
                        props.onQuerySearched(query);
                      }}
                    >
                      {query}
                    </div>
                  );
                })}
              </div>
            )}
            <TextSearchBar
              inputId="query-search-input"
              onSearch={(q) => {
                setShowHistory(false);
                props.onQuerySearched(q);
              }}
              initialValue=""
              placeholder={
                _.isEmpty(props.queries)
                  ? `For example "${placeholderQuery}"`
                  : ""
              }
              shouldAutoFocus={true}
              clearValueOnSearch={true}
            />
          </div>
          <Button
            onClick={() => setShowHistory(!showHistory)}
            className="history-button"
          >
            <span className="material-icons">history</span>
          </Button>
        </div>
        <NLOptions
          indexType={props.indexType}
          setIndexType={props.setIndexType}
          detector={props.detector}
          setDetector={props.setDetector}
          placeDetector={props.placeDetector}
          setPlaceDetector={props.setPlaceDetector}
        />
      </Container>
    </div>
  );
}

/**
 * Gets the list of queries to show in the history with duplicate queries removed.
 * @param queries full list of queries
 */
function getQueryHistory(queries: string[]): string[] {
  const queryHistory = [];
  const seenQueries = new Set();
  for (let i = queries.length - 1; i >= 0; i--) {
    const query = queries[i];
    if (seenQueries.has(query)) {
      continue;
    }
    queryHistory.push(query);
    seenQueries.add(query);
  }
  queryHistory.reverse();
  return queryHistory;
}
