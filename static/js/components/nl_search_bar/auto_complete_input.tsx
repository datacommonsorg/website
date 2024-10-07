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

import { stripPatternFromQuery } from "../../shared/util";
import {
  useInsideClickAlerter,
  useOutsideClickAlerter,
} from "../../utils/click_alerter";
import { AutoCompleteSuggestions } from "./auto_complete_suggestions";

const DEBOUNCE_INTERVAL_MS = 100;
const PLACE_EXPLORER_PREFIX = "/place/";
const LOCATION_SEARCH = "location_search";

export interface AutoCompleteResult {
  dcid: string;
  match_type: string;
  matched_query: string;
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

export function AutoCompleteInput(
  props: AutoCompleteInputPropType
): ReactElement {
  const wrapperRef = useRef(null);
  const [baseInput, setBaseInput] = useState("");
  const [inputText, setInputText] = useState("");
  // TODO(gmechali): Implement stat var search.
  const [results, setResults] = useState({ placeResults: [], svResults: [] });
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [triggerSearch, setTriggerSearch] = useState("");
  const [inputActive, setInputActive] = useState(false);

  const isHeaderBar = props.barType == "header";
  let lang = "";

  useEffect(() => {
    // One time initialization of event listener to clear suggested results on scroll.
    // It allows the user to navigate through the page without being annoyed by the results.
    window.addEventListener("scroll", () => {
      if (results.placeResults) {
        setResults({ placeResults: [], svResults: [] });
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    lang = urlParams.has("hl") ? urlParams.get("hl") : "en";
  }, []);

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
    props.onSearch();
  }, [triggerSearch, setTriggerSearch]);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const currentText = e.target.value;
    changeText(currentText);
    setBaseInput(currentText);

    if (!props.enableAutoComplete) return;

    const selectionApplied =
      hoveredIdx >= 0 &&
      results.placeResults.length >= hoveredIdx &&
      currentText.trim().endsWith(results.placeResults[hoveredIdx].name);
    setHoveredIdx(-1);

    if (_.isEmpty(currentText) || selectionApplied) {
      // Reset all suggestion results.
      setResults({ placeResults: [], svResults: [] });
      return;
    }

    sendDebouncedAutoCompleteRequest(currentText);
  }

  const triggerAutoCompleteRequest = useCallback(async (query: string) => {
    await axios
      .get(`/api/autocomplete?query=${query}&hl=${lang}`, {})
      .then((response) => {
        setResults({
          placeResults: response["data"]["predictions"],
          svResults: [],
        });
      })
      .catch((err) => {
        console.log("Error fetching autocomplete suggestions: " + err);
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
          selectResult(results.placeResults[hoveredIdx]);
        } else {
          props.onSearch();
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
    return stripPatternFromQuery(query, result.matched_query) + result.name;
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

  function selectResult(result: AutoCompleteResult): void {
    if (
      result["match_type"] == LOCATION_SEARCH &&
      stripPatternFromQuery(baseInput, result.matched_query).trim() === ""
    ) {
      // If this is a location result, and the matched_query matches the base input
      // then that means there are no other parts of the query, so it's a place only
      // redirection.
      if (result.dcid) {
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
              <span className="material-icons-outlined">search</span>
            )}
            <Input
              id={props.inputId}
              invalid={props.invalid}
              placeholder={props.placeholder}
              value={inputText}
              onChange={onInputChange}
              onKeyDown={(event) => handleKeydownEvent(event)}
              className="pac-target-input search-input-text"
              autoComplete="one-time-code"
              autoFocus={props.shouldAutoFocus}
            ></Input>
            <div onClick={props.onSearch} id="rich-search-button">
              {isHeaderBar && (
                <span className="material-icons-outlined">arrow_forward</span>
              )}
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
