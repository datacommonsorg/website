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

/**
 * Standard version of the suggested results for the auto-complete capable NL Search bar.
 */

import React, { ReactElement } from "react";

import { stripPatternFromQuery } from "../../shared/util";
import { AutoCompleteResult } from "./auto_complete_input";

interface AutoCompleteSuggestionsPropType {
  allResults: AutoCompleteResult[];
  baseInput: string;
  onClick: (result: AutoCompleteResult) => void;
  hoveredIdx: number;
}

export function AutoCompleteSuggestions(
  props: AutoCompleteSuggestionsPropType
): ReactElement {
  function getIcon(query: string, matched_query: string): string {
    if (query == matched_query) {
      return "location_on";
    }
    return "search";
  }

  return (
    <div className="search-results-place search-results-section">
      <div className="search-input-results-list" tabIndex={-1}>
        {props.allResults.map((result: AutoCompleteResult, idx: number) => {
          return (
            <div key={idx}>
              <div
                className={`search-input-result-section  ${
                  idx === props.hoveredIdx
                    ? "search-input-result-section-highlighted"
                    : ""
                }`}
              >
                <div
                  className="search-input-result"
                  key={"search-input-result-" + result.dcid}
                  onClick={() => props.onClick(result)}
                >
                  <span className="material-icons-outlined search-result-icon">
                    {getIcon(props.baseInput, result.matched_query)}
                  </span>
                  <div className="query-result">
                    <span>
                      {stripPatternFromQuery(
                        props.baseInput,
                        result.matched_query
                      )}
                      <span className="query-suggestion">{result.name}</span>
                    </span>
                  </div>
                </div>
              </div>
              {idx !== props.allResults.length - 1 ? (
                <hr className="result-divider"></hr>
              ) : (
                <></>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
