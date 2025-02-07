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
 * Standard version of the auto-complete capable NL Search bar.
 */

import axios from "axios";
import _ from "lodash";
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input, InputGroup } from "reactstrap";

import {
  GA_EVENT_AUTOCOMPLETE_SELECTION,
  GA_EVENT_AUTOCOMPLETE_SELECTION_REDIRECTS_TO_PLACE,
  GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX,
  triggerGAEvent,
} from "../../shared/ga_events";
import { stripPatternFromQuery } from "../../shared/util";
import {
  useInsideClickAlerter,
  useOutsideClickAlerter,
} from "../../utils/click_alerter";
import { ArrowForward } from "../elements/icons/arrow_forward";
import { Search } from "../elements/icons/search";
import { AutoCompleteSuggestions } from "./auto_complete_suggestions";

const DEBOUNCE_INTERVAL_MS = 100;
const PLACE_EXPLORER_PREFIX = "/place/";
const LOCATION_SEARCH = "location_search";

export interface AutoCompleteResult {
  dcid: string;
  matchType: string;
  matchedQuery: string;
  name: string;
}

interface AutoCompleteInputPropType {
  enableAutoComplete?: boolean;
  value: string;
  invalid: boolean;
  placeholder: string;
  inputId: string;
  onChange: (query: string) => void;
  onSearch: () => void;
  feedbackLink: string;
  shouldAutoFocus: boolean;
  barType: string;
}

function convertJSONToAutoCompleteResults(
  json: object[]
): AutoCompleteResult[] {
  return json.map((json) => ({
    dcid: json["dcid"],
    matchType: json["match_type"],
    matchedQuery: json["matched_query"],
    name: json["name"],
  }));
}

export function AutoCompleteInput(
  props: AutoCompleteInputPropType
): ReactElement {
  const wrapperRef = useRef(null);
  const controller = useRef(new AbortController());
  const [baseInput, setBaseInput] = useState("");
  const [inputText, setInputText] = useState("");
  // TODO(gmechali): Implement stat var search.
  const [results, setResults] = useState({ placeResults: [], svResults: [] });
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [triggerSearch, setTriggerSearch] = useState("");
  const [inputActive, setInputActive] = useState(false);
  const [lastAutoCompleteSelection, setLastAutoCompleteSelection] =
    useState("");
  // Used to reduce sensitivity to scrolling for autocomplete result dismissal.
  // Tracks the last scrollY value at time of autocomplete request.
  const [lastScrollYOnTrigger, setLastScrollYOnTrigger] = useState(0);
  // Tracks the last scrollY value for current height offsett.
  const [lastScrollY, setLastScrollY] = useState(0);

  const isHeaderBar = props.barType == "header";
  let lang = "";

  useEffect(() => {
    // One time initialization of event listener to clear suggested results on scroll.
    window.addEventListener("scroll", () => {
      setLastScrollY(window.scrollY);
    });

    const urlParams = new URLSearchParams(window.location.search);
    lang = urlParams.has("hl") ? urlParams.get("hl") : "en";
  }, []);

  // Whenever any of the scrollY states change, recompute to see if we need to hide the results.
  // We only hide the results when the user has scrolled past 15% of the window height since the autocomplete request.
  // It allows the user to navigate through the page without being annoyed by the results,
  // and to scroll through the results without them disappearing.
  useEffect(() => {
    if (
      results.placeResults.length > 0 &&
      Math.abs(lastScrollY - lastScrollYOnTrigger) > window.outerHeight * 0.15
    ) {
      setResults({ placeResults: [], svResults: [] });
    }
  }, [lastScrollY, lastScrollYOnTrigger]);

  useEffect(() => {
    // For the first load when q= param is set, we want to ensure the
    // props.value is propagated if it doesn't match input text.
    // Afterwards, the onInputchange method is responsible for updating
    // the text.
    if (props.value != inputText) {
      changeText(props.value);
    }
  }, [props.value]);

  // Clear suggested results when click registered outside of component.
  useOutsideClickAlerter(wrapperRef, () => {
    setResults({ placeResults: [], svResults: [] });
    setInputActive(false);
  });

  useInsideClickAlerter(wrapperRef, () => {
    setInputActive(true);
  });

  useEffect(() => {
    // TriggerSearch state used to ensure onSearch only called after text updated.
    executeQuery();
  }, [triggerSearch, setTriggerSearch]);

  function executeQuery(): void {
    setResults({ placeResults: [], svResults: [] });
    setHoveredIdx(-1);
    controller.current.abort(); // Ensure autocomplete responses can't come back.
    props.onSearch();
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const currentText = e.target.value;
    changeText(currentText);
    setBaseInput(currentText);

    if (!props.enableAutoComplete) return;

    const selectionApplied =
      hoveredIdx >= 0 &&
      hoveredIdx < results.placeResults.length &&
      currentText.trim().endsWith(results.placeResults[hoveredIdx].name);

    let lastSelection = lastAutoCompleteSelection;
    if (selectionApplied) {
      // Trigger Google Analytics event to track the index of the selected autocomplete result.
      triggerGAEvent(GA_EVENT_AUTOCOMPLETE_SELECTION, {
        [GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX]: String(hoveredIdx),
      });

      // Reset all suggestion results.
      setResults({ placeResults: [], svResults: [] });
      setHoveredIdx(-1);
      // Set the autocomplete selection.
      setLastAutoCompleteSelection(results.placeResults[hoveredIdx].name);
      return;
    } else if (_.isEmpty(currentText)) {
      // Reset all suggestion results.
      setResults({ placeResults: [], svResults: [] });
      setLastAutoCompleteSelection("");
      setHoveredIdx(-1);
      return;
    } else if (!currentText.includes(lastAutoCompleteSelection)) {
      // If the user backspaces into the last selection, reset it.
      lastSelection = "";
      setLastAutoCompleteSelection(lastSelection);
      // fall through
    }

    let queryForAutoComplete = currentText;
    if (!_.isEmpty(lastSelection)) {
      // if the last selection is still present, only send what comes after to autocomplete.
      const splitQuery = queryForAutoComplete.split(lastSelection);
      if (splitQuery.length == 2) {
        queryForAutoComplete = splitQuery[1].trim();
      }
    }

    sendDebouncedAutoCompleteRequest(queryForAutoComplete);
  }

  const triggerAutoCompleteRequest = useCallback(async (query: string) => {
    setLastScrollYOnTrigger(window.scrollY);
    // Abort the previous request
    if (controller.current) {
      controller.current.abort();
    }

    // Create a new AbortController for the current request
    controller.current = new AbortController();

    await axios
      .get(`/api/autocomplete?query=${query}&hl=${lang}`, {
        signal: controller.current.signal,
      })
      .then((response) => {
        if (!controller.current.signal.aborted) {
          setResults({
            placeResults: convertJSONToAutoCompleteResults(
              response["data"]["predictions"]
            ),
            svResults: [],
          });
        }
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          console.log("Error fetching autocomplete suggestions: " + err);
        }
      });
  }, []);

  // memoize the debounce call with useMemo
  const sendDebouncedAutoCompleteRequest = useMemo(() => {
    return _.debounce(triggerAutoCompleteRequest, DEBOUNCE_INTERVAL_MS);
  }, []);

  function changeText(text: string): void {
    // Update text in Input without triggering search.
    setInputText(text);
    props.onChange(text);
  }

  function handleKeydownEvent(
    event: React.KeyboardEvent<HTMLDivElement>
  ): void {
    // Navigate through the suggested results.
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        if (hoveredIdx >= 0) {
          selectResult(results.placeResults[hoveredIdx], hoveredIdx);
        } else {
          executeQuery();
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        processArrowKey(Math.max(hoveredIdx - 1, -1));
        break;
      case "ArrowDown":
        event.preventDefault();
        processArrowKey(
          Math.min(hoveredIdx + 1, results.placeResults.length - 1)
        );
        break;
    }
  }

  function replaceQueryWithSelection(
    query: string,
    result: AutoCompleteResult
  ): string {
    return stripPatternFromQuery(query, result.matchedQuery) + result.name;
  }

  function processArrowKey(selectedIndex: number): void {
    setHoveredIdx(selectedIndex);
    const textDisplayed =
      selectedIndex >= 0
        ? replaceQueryWithSelection(
            baseInput,
            results.placeResults[selectedIndex]
          )
        : baseInput;
    changeText(textDisplayed);
  }

  function selectResult(result: AutoCompleteResult, idx: number): void {
    // Trigger Google Analytics event to track the index of the selected autocomplete result.
    triggerGAEvent(GA_EVENT_AUTOCOMPLETE_SELECTION, {
      [GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX]: String(idx),
    });

    if (
      result.matchType == LOCATION_SEARCH &&
      stripPatternFromQuery(baseInput, result.matchedQuery).trim() === ""
    ) {
      // If this is a location result, and the matchedQuery matches the base input
      // then that means there are no other parts of the query, so it's a place only
      // redirection.
      if (result.dcid) {
        triggerGAEvent(GA_EVENT_AUTOCOMPLETE_SELECTION_REDIRECTS_TO_PLACE, {
          [GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX]: String(idx),
        });

        const url = PLACE_EXPLORER_PREFIX + `${result.dcid}`;
        window.open(url, "_self");
        return;
      }
    }

    const newString = replaceQueryWithSelection(baseInput, result);
    changeText(newString);
    setTriggerSearch(newString);
  }

  return (
    <>
      <div
        className={`search-box-section ${
          results.placeResults.length == 0 ? "radiused" : "unradiused"
        } ${inputActive ? "search-box-section-active" : ""}`}
        ref={wrapperRef}
      >
        <div
          className={`search-bar${props.value ? " non-empty" : ""} ${
            results.placeResults.length == 0 ? "radiused" : "unradiused"
          }`}
        >
          <InputGroup className="search-bar-content">
            {isHeaderBar && (
              <span className="search-bar-icon">
                <Search />
              </span>
            )}
            <Input
              id={props.inputId}
              invalid={props.invalid}
              placeholder={props.placeholder}
              aria-label={props.placeholder}
              value={inputText}
              onChange={onInputChange}
              onKeyDown={(event): void => handleKeydownEvent(event)}
              className="pac-target-input search-input-text"
              autoComplete="one-time-code"
              autoFocus={props.shouldAutoFocus}
            ></Input>
            <div onClick={executeQuery} id="rich-search-button">
              {isHeaderBar && <ArrowForward />}
            </div>
          </InputGroup>
        </div>
        {props.enableAutoComplete && !_.isEmpty(results.placeResults) && (
          <AutoCompleteSuggestions
            baseInput={baseInput}
            allResults={results.placeResults}
            hoveredIdx={hoveredIdx}
            onClick={selectResult}
          />
        )}
      </div>
    </>
  );
}
