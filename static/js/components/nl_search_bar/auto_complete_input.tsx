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
 * Standard version of the NL Search Component - used as a stand-alone component in the body of a page.
 */

import _ from "lodash";
import React, { ReactElement, useEffect, useRef, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { Input, InputGroup } from "reactstrap";

import { OutsideClickAlerter } from "../../utils/outside_click_alerter";

const DEBOUNCE_INTERVAL_MS = 100;

// Material Icons used for the result sv type.
const icons = { place: "place" };

const EXPLORE_PREFIX = "/explore?";
const PLACE_EXPLORER_PREFIX = "/place/";
const SV_EXPLORER_PREFIX = "/tools/statvar";

function redirectAction(
  query: string,
  placeDcid: string,
  svDcid: string
): void {
  let url = "";
  if (query) {
    url += EXPLORE_PREFIX + `q=${query}`;
  }
  if (placeDcid) {
    url = PLACE_EXPLORER_PREFIX + `${placeDcid}`;
  }
  if (svDcid) {
    url = SV_EXPLORER_PREFIX + `#sv=${svDcid}`;
  }
  window.open(url, "_self");
}

function AutoCompleteSuggestions({
  allResults,
  inputText,
  onClick,
  hoveredIdx,
}): ReactElement {
  const matches = inputText.split(" ");

  return (
    <>
      <div className="search-results-place search-results-section">
        <div className="search-input-results-list" tabIndex={-1}>
          {allResults.map((result, idx) => {
              return (
                <>
                  <div className="search-input-result-section">
                    <div
                      className={`search-input-result ${
                        idx === hoveredIdx
                          ? "search-input-result-highlighted"
                          : ""
                      }`}
                      key={"search-input-result-" + result.dcid}
                      onClick={() => onClick(result)}>
                      <span className="material-icons-outlined">
                        {icons[result["type"]]}
                      </span>
                      {result.name} 
                      {idx !== allResults.length - 1 ? <hr></hr> : <></>}
                    </div>
                  </div>
                </>
              );
            })}
        </div>
      </div>
    </>
  );
}
// 91 replace '' with dcid.

export function AutoCompleteInput({
  enableAutoComplete,
  value,
  invalid,
  placeholder,
  inputId,
  onChange,
  onSearch,
  feedbackLink,
  shouldAutoFocus,
  barType,
}): ReactElement {
  const wrapperRef = useRef(null);
  const placeAutocompleteService = useRef(null);
  const latestQuery = useRef(null);
  const [baseInput, setBaseInput] = useState("");
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState({ placeResults: [], svResults: [] });
  const [allResults, setAllResults] = useState([]);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [triggerSearch, setTriggerSearch] = useState("");
  const [matchingPlaceQuery, setMatchingPlaceQuery] = useState("");

  const isHeaderBar = barType == "header";

  useEffect(() => {
    if (google.maps) {
      placeAutocompleteService.current =
        new google.maps.places.AutocompleteService();
    }

    window.addEventListener('scroll', () => {
      if (results.placeResults) {
        setResults({placeResults: [], svResults: []});
      }
    });
  }, []);

  useEffect(() => {
    const allResultsSorted = results.placeResults
    setAllResults(allResultsSorted);
  }, [results, setResults]);

  useEffect(() => {
    onSearch();
  }, [triggerSearch, setTriggerSearch]);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const currentText = e.target.value;
    changeText(currentText);
    setBaseInput(currentText);

    const selectionApplied = hoveredIdx >= 0 && allResults.length >= hoveredIdx && currentText.trim().endsWith(allResults[hoveredIdx].name);
    setHoveredIdx(-1);

    if (_.isEmpty(currentText) || selectionApplied) {
      // Reset all suggestion results.
      setResults({ placeResults: [], svResults: [] });
      return;
    }

    debouncedSendRequest(currentText);
  }

  // memoize the callback with useCallback
  // we need it since it's a dependency in useMemo below
  const triggerAutoCompleteRequest = useCallback(async (query: string) => {
    const resp = await axios.post(
      `/api/autocomplete/autocomplete?query=${query}`,
      {}
    ).then((response) => {
      setResults( {placeResults: response["data"]["place_results"]["places"], svResults: []});
      console.log(JSON.stringify(response));
      setMatchingPlaceQuery(response["data"]["place_results"]["matching_place_query"])
    })
  }, []);

  // memoize the debounce call with useMemo
  const debouncedSendRequest = useMemo(() => {
    return _.debounce(triggerAutoCompleteRequest, DEBOUNCE_INTERVAL_MS);
  }, []);

  function changeText(text: string) {
    setInputText(text);
    onChange(text);
  }

  // For all clicks outside of the input component, empty out results.
  OutsideClickAlerter(wrapperRef, () => {
    setResults({ placeResults: [], svResults: [] });
  });

  function handleKeydownEvent(
    event: React.KeyboardEvent<HTMLDivElement>
  ): void {
    switch (event.key) {
      case "Enter":
        if (hoveredIdx >= 0) {
          onClick(allResults[hoveredIdx]);
        } else {
          onSearch();
        }
        event.preventDefault();
        break;
      case "ArrowUp":
        event.preventDefault();
        processArrowKey(Math.max(hoveredIdx - 1, -1));
        break;
      case "ArrowDown":
        event.preventDefault();
        processArrowKey(Math.min(hoveredIdx + 1, allResults.length - 1));
        break;
    }
  }

  function processArrowKey(selectedIndex: number) {
    setHoveredIdx(selectedIndex);
    const textDisplayed =
      selectedIndex >= 0
        ? replaceQueryWithSelection(allResults[selectedIndex])
        : baseInput;
    changeText(textDisplayed);
  }

  return (
    <>
      <div className={`search-box-section ${results.placeResults.length == 0 ? "radiused" : "unradiused" }`} ref={wrapperRef}>
        <div className={`search-bar${value ? " non-empty" : ""} ${results.placeResults.length == 0 ? "radiused" : "unradiused" }`}>
          <InputGroup className="search-bar-content">
            {isHeaderBar && (
              <span className="material-icons-outlined">search</span>
            )}
            <Input
              id={inputId}
              invalid={invalid}
              placeholder={placeholder}
              value={inputText}
              onChange={onInputChange}
              onKeyDown={(event) => handleKeydownEvent(event)}
              className="pac-target-input search-input-text"
              autoComplete="one-time-code"
              autoFocus={shouldAutoFocus}
            ></Input>
            <div onClick={onSearch} id="rich-search-button">
              {isHeaderBar && (
                <span className="material-icons-outlined">arrow_forward</span>
              )}
            </div>
          </InputGroup>
        </div>
        {enableAutoComplete && !_.isEmpty(allResults) && (
          <AutoCompleteSuggestions
            inputText={inputText}
            allResults={allResults}
            hoveredIdx={hoveredIdx}
            onClick={onClick}
          />
        )}
      </div>
    </>
  );

  function onClick(result) {
    if (result.name.toLowerCase().includes(inputText.toLowerCase())) {
      if (result["type"] == "place") {
        redirectAction(result.name, result.dcid, "");
      } else if (result["type"] == "sv") {
        redirectAction(result.name, "", result.dcid);
      }
    } else {
      const newString = replaceQueryWithSelection(result);
      changeText(newString);
      setTriggerSearch(newString);
    }
  }

  function replaceQueryWithSelection(result): string {
    console.log("Reaplceing " + result.matched_query);
    const regex = new RegExp(
      "(?:.(?!" + result.matched_query + "))+\\s?$",
      "i"
    );
    return baseInput.replace(regex, "") + result.name;
  }
}

export default AutoCompleteInput;
