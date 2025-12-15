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
/** @jsxImportSource @emotion/react */

import { css } from "@emotion/react";
import React, { ReactElement, useEffect, useState } from "react";

import {
  GA_EVENT_AUTOCOMPLETE_LOAD_MORE,
  GA_EVENT_AUTOCOMPLETE_TRIGGERED,
  GA_PARAM_QUERY,
  triggerGAEvent,
} from "../../shared/ga_events";
import { stripPatternFromQuery } from "../../shared/util";
import theme from "../../theme/theme";
import { KeyboardArrowDown } from "../elements/icons/keyboard_arrow_down";
import { Location } from "../elements/icons/location";
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
  hasLocation: boolean;
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

  function getIcon(
    result: AutoCompleteResult,
    baseInput: string
  ): ReactElement {
    const isExactMatch =
      stripPatternFromQuery(baseInput, result.matchedQuery).trim() === "";
    if (result.matchType === "stat_var_search") {
      if (isExactMatch) {
        return <Search />;
      }
    } else if (result.matchType === "location_search") {
      if (isExactMatch) {
        return <Location />;
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
  }, [props.allResults, props.baseInput, triggered]);

  const showLoadMore =
    props.allResults.length > visibleCount &&
    props.allResults.some((r) => r.matchType === "stat_var_search");

  return (
    <div
      tabIndex={-1}
      css={css`
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        overflow-y: auto;
        overfow-x: hidden;
      `}
    >
      {props.allResults
        .slice(0, visibleCount)
        .map((result: AutoCompleteResult, idx: number) => {
          const fullText = result.fullText;
          const parts = fullText.split(result.name);
          return (
            <div
              data-testid="search-input-result-section"
              key={"search-input-result-" + result.dcid}
              onClick={(): void => props.onClick(result, idx)}
              css={css`
                && {
                  margin: 0;
                  padding: 0;
                  border: 0;
                  display: flex;
                  align-items: center;
                  gap: ${theme.spacing.md}px;
                  padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
                  cursor: pointer;
                  border-top: 1px solid ${theme.searchSuggestions.border};
                  background-color: ${idx === props.hoveredIdx
                    ? theme.searchSuggestions.hover.background
                    : theme.searchSuggestions.base.background};
                  span {
                    color: ${theme.searchSuggestions.base.text};
                  }
                }
                &&:hover {
                  background-color: ${idx === props.hoveredIdx
                    ? theme.searchSuggestions.hover.background
                    : theme.searchSuggestions.base.background};
                  div {
                    color: ${theme.searchSuggestions.hover.icon};
                  }
                }
              `}
            >
              <div
                css={css`
                  ${theme.typography.text.lg}
                  line-height: 1rem;
                  color: ${theme.searchSuggestions.base.icon};
                `}
              >
                {getIcon(result, props.baseInput)}
              </div>
              <span
                data-testid="query-result"
                css={css`
                  ${theme.typography.family.text}
                  ${theme.typography.text.md}
                  line-height: 1rem;
                  color: ${theme.searchSuggestions.base.text};
                `}
              >
                {parts[0]}
                {result.name}
                {parts.length > 1 && parts[1]}
              </span>
            </div>
          );
        })}
      {showLoadMore && (
        <div
          className="search-input-result-section load-more-section"
          onClick={(): void => {
            triggerGAEvent(GA_EVENT_AUTOCOMPLETE_LOAD_MORE, {
              [GA_PARAM_QUERY]: props.baseInput,
            });
            setVisibleCount(visibleCount + RESULTS_TO_LOAD);
          }}
        >
          <div
            css={css`
              && {
                margin: 0;
                padding: 0;
                border: 0;
                display: flex;
                align-items: center;
                gap: ${theme.spacing.md}px;
                padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
                cursor: pointer;
                border-top: 1px solid ${theme.searchSuggestions.border};
                background-color: ${theme.searchSuggestions.more.background};
                color: ${theme.searchSuggestions.more.text};
              }
              &&:hover {
                background-color: ${theme.searchSuggestions.hover.background};
              }
            `}
          >
            <div
              css={css`
                ${theme.typography.text.lg}
                line-height: 1rem;
              `}
            >
              <KeyboardArrowDown />
            </div>
            <span
              data-testid="query-result"
              css={css`
                ${theme.typography.family.text}
                ${theme.typography.text.md}
                  line-height: 1rem;
              `}
            >
              Load More Results
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
