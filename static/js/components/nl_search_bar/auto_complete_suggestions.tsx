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

import styled from "@emotion/styled";
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

// Styled Components

const AutoCompleteSuggestionsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  overflow: hidden;
  .SuggestionsResults {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }
`;

type SuggestionRowProps = {
  $hovered: boolean;
};

const SuggestionRow = styled("div", {
  shouldForwardProp: (prop) => prop !== "$hovered",
})<SuggestionRowProps>`
  && {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.md}px;
    padding: ${theme.spacing.md}px ${theme.spacing.lg}px;
    cursor: pointer;
    border-top: 1px solid ${theme.searchSuggestions.border};
    background-color: ${({ $hovered }): string =>
      $hovered
        ? theme.searchSuggestions.hover.background
        : theme.searchSuggestions.base.background};
    span {
      color: ${theme.searchSuggestions.base.text};
    }
  }
  &&:hover {
    background-color: ${theme.searchSuggestions.hover.background};
    div {
      color: ${theme.searchSuggestions.hover.icon};
    }
  }
  .SuggestionIconwrapper {
    ${theme.typography.text.lg}
    line-height: 1rem;
    color: ${theme.searchSuggestions.base.icon};
  }
  & > span {
    ${theme.typography.family.text}
    ${theme.typography.text.md}
    line-height: 1rem;
    color: ${theme.searchSuggestions.base.text};
  }
`;

const LoadMoreWrapper = styled.div`
  && {
    margin: 0;
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
  & > .loadMoreIconWrapper {
    ${theme.typography.text.lg}
    line-height: 1rem;
  }
  & > span {
    ${theme.typography.family.text}
    ${theme.typography.text.md}
    line-height: 1rem;
  }
`;

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
  const showLoadMoreEligible = props.allResults.some(
    (r) => r.matchType === "stat_var_search"
  );
  const calculatedInitalVisibleResults = showLoadMoreEligible
    ? INITIAL_VISIBLE_RESULTS - 1
    : INITIAL_VISIBLE_RESULTS;
  const [triggered, setTriggered] = useState(false);
  const [visibleCount, setVisibleCount] = useState(
    calculatedInitalVisibleResults
  );
  const showLoadMore =
    props.allResults.length > visibleCount && showLoadMoreEligible;

  useEffect(() => {
    // Whenever the results change for a new query, reset the visible count.
    setVisibleCount(calculatedInitalVisibleResults);
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

  return (
    <AutoCompleteSuggestionsWrapper tabIndex={-1}>
      <div className="SuggestionsResults">
        {props.allResults
          .slice(0, visibleCount)
          .map((result: AutoCompleteResult, idx: number) => {
            const fullText = result.fullText;
            const parts = fullText.split(result.name);
            return (
              <SuggestionRow
                data-testid="search-input-result-section"
                key={"search-input-result-" + result.dcid}
                onClick={(): void => props.onClick(result, idx)}
                $hovered={idx === props.hoveredIdx}
              >
                <div className="SuggestionIconwrapper">
                  {getIcon(result, props.baseInput)}
                </div>
                <span data-testid="query-result">
                  {parts[0]}
                  {result.name}
                  {parts.length > 1 && parts[1]}
                </span>
              </SuggestionRow>
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
            <LoadMoreWrapper>
              <div className="loadMoreIconWrapper">
                <KeyboardArrowDown />
              </div>
              <span data-testid="query-result">Load More Results</span>
            </LoadMoreWrapper>
          </div>
        )}
      </div>
    </AutoCompleteSuggestionsWrapper>
  );
}
