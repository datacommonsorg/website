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
    console.log("Base input:", props.baseInput);
    console.log("Result name:", props.allResults);
    if (!triggered && props.allResults.length > 0) {
      setTriggered(true);
      triggerGAEvent(GA_EVENT_AUTOCOMPLETE_TRIGGERED, {
        [GA_PARAM_QUERY]: props.baseInput,
      });
    }
  }, [props.allResults]);

  return (
    <div className="autocomplete-search-input-results-list" tabIndex={-1}>
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
                onClick={(): void => props.onClick(result, idx)}
              >
                <span className="search-result-icon">
                  {getIcon(result, props.baseInputLastQuery)}
                </span>
                <div className="query-result">
                  <span>
                    {(() => {
                      if (!result.matchedQuery) {
                        return (
                          <span className="query-suggestion">{result.name}</span>
                        );
                      }
                      const regex = new RegExp(
                        escapeRegExp(result.matchedQuery),
                        "i"
                      );
                      const fullText = props.baseInput.replace(regex, result.name);
                      const parts = fullText.split(result.name);
                      console.log("Matched Query:", result.matchedQuery);
                      // console.log("Parts:", parts);
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
            {idx !== props.allResults.length - 1 ? (
              <hr className="result-divider"></hr>
            ) : (
              <></>
            )}
          </div>
        );
      })}
    </div>
  );
}
