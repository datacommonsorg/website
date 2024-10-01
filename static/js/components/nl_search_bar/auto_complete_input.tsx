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
import {
  formatNumber,
  intl,
  LocalizedLink,
  localizeSearchParams,
} from "../../i18n/i18n";
import { Input, InputGroup } from "reactstrap";

import useOutsideClickAlerter from "../../utils/outside_click_alerter";
import { url } from "inspector";

const DEBOUNCE_INTERVAL_MS = 100;
const PLACE_EXPLORER_PREFIX = "/place/";
const LOCATION_SEARCH = "location_search";

function replaceQueryWithSelection(query, result): string {
  const regex = new RegExp(
    "(?:.(?!" + result.matched_query + "))+([,;\\s])?$",
    "i"
  );
  return query.replace(regex, "") + result.name;
}

function redirectAction(placeDcid: string): boolean {
  if (!placeDcid) {
    return false;
  }

  const url = PLACE_EXPLORER_PREFIX + `${placeDcid}`;
  window.open(url, "_self");
  return true;
}

interface AutoCompleteSuggestionsPropType {
  allResults: any[];
  inputText: string;
  onClick: (result: any) => void;
  hoveredIdx: number;
}

function AutoCompleteSuggestions(
  props: AutoCompleteSuggestionsPropType
): ReactElement {
  return (
    <div className="search-results-place search-results-section">
      <div className="search-input-results-list" tabIndex={-1}>
        {props.allResults.map((result: any, idx: number) => {
          return (
            <>
              <div className="search-input-result-section">
                <div
                  className={`search-input-result ${
                    idx === props.hoveredIdx
                      ? "search-input-result-highlighted"
                      : ""
                  }`}
                  key={"search-input-result-" + result.dcid}
                  onClick={() => props.onClick(result)}
                >
                  <span className="material-icons-outlined">search</span>
                  <p className="autosuggest-query">
                    {replaceQueryWithSelection(props.inputText, result)}
                  </p>
                </div>
                {idx !== props.allResults.length - 1 ? <hr></hr> : <></>}
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
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

  const isHeaderBar = props.barType == "header";
  let lang = '';

  useEffect(() => {
    // One time initialization of event listener to clear suggested results on scroll.
    // It allows the user to navigate through the page without being annoyed by the results.
    window.addEventListener("scroll", () => {
      if (results.placeResults) {
        setResults({ placeResults: [], svResults: [] });
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    lang = urlParams.has('hl') ? urlParams.get('hl') : 'en';
  }, []);

  // Clear suggested results when click registered outside of component.
  useOutsideClickAlerter(wrapperRef, () => {
    setResults({ placeResults: [], svResults: [] });
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

    SendDebouncedAutoCompleteRequest(currentText);
  }

  const triggerAutoCompleteRequest = useCallback(async (query: string) => {
    await axios
      .post(`/api/autocomplete?query=${query}&hl=${lang}`, {})
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
  const SendDebouncedAutoCompleteRequest = useMemo(() => {
    return _.debounce(triggerAutoCompleteRequest, DEBOUNCE_INTERVAL_MS);
  }, []);

  function changeText(text: string) {
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
          onClick(results.placeResults[hoveredIdx]);
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

  function processArrowKey(selectedIndex: number) {
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

  return (
    <>
      <div
        className={`search-box-section ${
          results.placeResults.length == 0 ? "radiused" : "unradiused"
        }`}
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
            inputText={inputText}
            allResults={results.placeResults}
            hoveredIdx={hoveredIdx}
            onClick={onClick}
          />
        )}
      </div>
    </>
  );

  function onClick(result: any) {
    if (
      result["match_type"] == LOCATION_SEARCH &&
      result.name.toLowerCase().includes(inputText.toLowerCase())
    ) {
      if (redirectAction(result.dcid)) {
        return;
      }
    }

    const newString = replaceQueryWithSelection(baseInput, result);
    changeText(newString);
    setTriggerSearch(newString);
  }
}

export default AutoCompleteInput;
