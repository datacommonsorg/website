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
import { Button, Container, FormGroup, Input, Label } from "reactstrap";

import { TextSearchBar } from "../../components/text_search_bar";

export const NL_INDEX_SMALL = "small";
export const NL_INDEX = "idx";
export const NL_LLM = "llm";
const NL_INDEX_MEDIUM = "medium";

interface QuerySearchPropType {
  queries: string[];
  onQuerySearched: (query: string) => void;
  indexType: string;
  setIndexType: (idx: string) => void;
  useLLM: boolean;
  setUseLLM: (v: boolean) => void;
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
        <div className="nl-options-row">
          <div className="nl-options-label">Detection:</div>
          <div className="nl-options-input-radio">
            <FormGroup>
              <Label>
                <Input
                  checked={!props.useLLM}
                  id="nl-heuristics"
                  type="radio"
                  value={0}
                  onChange={(e) => {
                    props.setUseLLM(false);
                  }}
                />
                Heuristics Based
              </Label>
              <Label>
                <Input
                  checked={props.useLLM}
                  id="nl-llm"
                  type="radio"
                  value={1}
                  onChange={(e) => {
                    props.setUseLLM(true);
                  }}
                />
                LLM Based (experimental)
              </Label>
            </FormGroup>
          </div>
          <div className="nl-options-label">Embeddings:</div>
          <div className="nl-options-input-radio">
            <FormGroup>
              <Label>
                <Input
                  checked={props.indexType === NL_INDEX_SMALL}
                  id="nl-small-index"
                  type="radio"
                  value={NL_INDEX_SMALL}
                  onChange={(e) => {
                    props.setIndexType(NL_INDEX_SMALL);
                  }}
                />
                Small-1K
              </Label>
              <Label>
                <Input
                  checked={props.indexType === NL_INDEX_MEDIUM}
                  id="nl-medium-index"
                  type="radio"
                  value={NL_INDEX_MEDIUM}
                  onChange={(e) => {
                    props.setIndexType(NL_INDEX_MEDIUM);
                  }}
                />
                Medium-5K (experimental)
              </Label>
            </FormGroup>
          </div>
        </div>
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
