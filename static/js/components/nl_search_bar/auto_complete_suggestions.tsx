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

import React, { ReactElement, useEffect, useState } from "react";

import {
  GA_EVENT_AUTOCOMPLETE_TRIGGERED,
  GA_PARAM_QUERY,
  triggerGAEvent,
} from "../../shared/ga_events";
import { escapeRegExp, stripPatternFromQuery } from "../../shared/util";
import { ScatterPlot } from "../elements/icons/scatter_plot";
import { Search } from "../elements/icons/search";
import { AutoCompleteResult } from "./auto_complete_input";

const INITIAL_VISIBLE_RESULTS = 5;
const RESULTS_TO_LOAD = 20;

interface AutoCompleteSuggestionsPropType {
  allResults: AutoCompleteResult[];
  baseInput: string;
  baseInputLastQuery: string;
  onClick: (result: AutoCompleteResult, idx: number) => void;
  hoveredIdx: number;
}

export function AutoCompleteSuggestions(
  props: AutoCompleteSuggestionsPropType
): ReactElement {
  const [triggered, setTriggered] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_RESULTS);

  useEffect(() => {
    // Whenever the results change for a new query, reset the visible count.
    setVisibleCount(INITIAL_VISIBLE_RESULTS);
  }, [props.allResults]);

  function getIcon(result: AutoCompleteResult, baseInput: string): ReactElement {
    const isExactMatch =
      stripPatternFromQuery(baseInput, result.matchedQuery).trim() === "";
    if (result.matchType === "stat_var_search") {
      if (isExactMatch) {
        return <ScatterPlot />;
      }
    } else if (result.matchType === "location_search") {
      if (isExactMatch) {
        return <span className="material-icons-outlined">location_on</span>;
      }
    }
    return <Search />;
  }

  useEffect(() => {
    if (!triggered && props.allResults.length > 0) {
      setTriggered(true);
      triggerGAEvent(GA_EVENT_AUTOCOMPLETE_TRIGGERED, {
        [GA_PARAM_QUERY]: props.baseInput,
      });
    }
  }, [props.allResults]);

  const showLoadMore =
    props.allResults.length > visibleCount &&
    props.allResults.some((r) => r.matchType === "stat_var_search");

  return (
    <div
      className="autocomplete-search-input-results-list"
      tabIndex={-1}
    >
      {props.allResults
        .slice(0, visibleCount)
        .map((result: AutoCompleteResult, idx: number) => {
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
                  onClick={(): void => props.onClick(result, idx)}
                >
                  <span className="search-result-icon">
                    {getIcon(result, props.baseInput)}
                  </span>
                  <div className="query-result">
                    <span>
                      {(() => {
                        if (!result.matchedQuery) {
                          return (
                            <span className="query-suggestion">
                              {result.name}
                            </span>
                          );
                        }
                        const regex = new RegExp(
                          escapeRegExp(result.matchedQuery),
                          "i"
                        );
                        const fullText = props.baseInput.replace(
                          regex,
                          result.name
                        );
                        const parts = fullText.split(result.name);
                        return (
                          <>
                            {parts[0]}
                            <span className="query-suggestion">{result.name}</span>
                            {parts.length > 1 && parts[1]}
                          </>
                        );
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              {idx !== props.allResults.slice(0, visibleCount).length - 1 ? (
                <hr className="result-divider"></hr>
              ) : (
                <></>
              )}
            </div>
          );
        })}
      {showLoadMore && (
        <div
          className="search-input-result-section load-more-section"
          onClick={() => setVisibleCount(visibleCount + RESULTS_TO_LOAD)}
        >
          <div className="search-input-result">
            <span className="search-result-icon">
              <span className="material-icons-outlined">expand_more</span>
            </span>
            <div className="query-result">
              <span>Load More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}