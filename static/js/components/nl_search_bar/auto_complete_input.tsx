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

import { triggerAsyncId } from "async_hooks";
import _, { replace } from "lodash";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Input, InputGroup } from "reactstrap";

import { NamedPlace } from "../../shared/types";
import { OutsideClickAlerter } from "../../utils/outside_click_alerter";
import { getPlaceDcids } from "../../utils/place_utils";
import { getHighlightedJSX } from "../../utils/search_utils";

// Material Icons used for the result sv type.
const icons = { place: "place" };

// Stop words used to split the query for location autocomplete.
const stop_words = ["in", "for", "from", "at"];

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
          {!_.isEmpty(allResults) &&
            allResults.map((result, idx) => {
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
                      onClick={() => onClick(result)}
                    >
                      <span className="material-icons-outlined">
                        {icons[result["type"]]}
                      </span>
                      {getHighlightedJSX(result.dcid, result.name, matches)}
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

  const isHeaderBar = barType == "header";

  useEffect(() => {
    if (google.maps) {
      placeAutocompleteService.current =
        new google.maps.places.AutocompleteService();
    }
  }, []);

  useEffect(() => {
    const allResultsSorted = results.placeResults.map((result, idx) => {
      result["type"] = "place";
      return result;
    });
    // TODO(gmechali): Add SV type results.
    setAllResults(allResultsSorted);
  }, [results, setResults]);

  useEffect(() => {
    onSearch();
  }, [triggerSearch, setTriggerSearch]);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setHoveredIdx(-1);

    const currentText = e.target.value;
    changeText(currentText);
    setBaseInput(currentText);

    if (_.isEmpty(currentText)) {
      // Reset all suggestion results.
      setResults({ placeResults: [], svResults: [] });
      return;
    }

    // Trigger new query for location autocomplete.
    if (placeAutocompleteService.current) {
      latestQuery.current = currentText;
      placeAutocompleteService.current.getPredictions(
        {
          input: latestQuery.current,
          types: ["(regions)"],
          offset: currentText.length,
        },
        (predictions, status) =>
          onPlaceAutocompleteCompleted(
            currentText,
            predictions,
            status,
            /* allowRetry= */ true
          )
      );
    }
  }

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
        ? replaceQueryWithSelection(allResults[selectedIndex].name)
        : baseInput;
    changeText(textDisplayed);
  }

  return (
    <>
      <div className="search-box-section" ref={wrapperRef}>
        <div className={`search-bar${value ? " non-empty" : ""}`}>
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
        {enableAutoComplete && (
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
      const newString = replaceQueryWithSelection(result.name);
      changeText(newString);
      setTriggerSearch(newString);
    }
  }

  function replaceQueryWithSelection(resultName: string): string {
    const regex = new RegExp(
      "\\b(?:.(?!" + latestQuery.current + "))+$\\b",
      "i"
    );
    return baseInput.replace(regex, "") + resultName;
  }

  function onPlaceAutocompleteCompleted(
    query: string,
    predictions: google.maps.places.AutocompletePrediction[],
    status: google.maps.places.PlacesServiceStatus,
    allowRetry: boolean
  ): void {
    // If the callback has no responses from the entire query, try again with a subquery.
    if (allowRetry && _.isEmpty(predictions)) {
      // Try running the query by taking the last segment from splitting on stop words.
      // e.g.: Poverty level in Burkina Fas --> runs the query with "Burkina Fas"
      const regex = new RegExp(
        "\\b(?:" + stop_words.join("|") + "|\\s)+\\b",
        "i"
      );
      let split = query.trim().split(regex);

      // If there were no stop words, just re-try the last word.
      if (split.length == 1) {
        split = query.trim().split(" ");
      }

      if (split.length > 1) {
        const curr = split[split.length - 1];
        latestQuery.current = curr;
        placeAutocompleteService.current.getPredictions(
          { input: curr, types: ["(regions)"] },
          (predictions, status) =>
            onPlaceAutocompleteCompleted(
              curr,
              predictions,
              status,
              /* allowRetry= */ false
            )
        );
      }
    }
    let namedPlacePromise: Promise<NamedPlace[]> = Promise.resolve([]);
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      const placeIds = predictions.map((prediction) => prediction.place_id);
      namedPlacePromise = getPlaceDcids(placeIds).then((dcids) => {
        return predictions
          .map((prediction) => {
            // TODO(gmechali): Put these place DCIDs in the context of the request.
            if (prediction.place_id in dcids) {
              return {
                dcid: dcids[prediction.place_id],
                name: prediction.description,
              };
            }
          })
          .filter((place) => !_.isEmpty(place));
      });
    }
    Promise.all([namedPlacePromise])
      .then(([placeResults]) => {
        if (query !== latestQuery.current) {
          return;
        }
        setResults({ placeResults, svResults: [] });
      })
      .catch(() => {
        if (query !== latestQuery.current) {
          return;
        }
        setResults({ placeResults: [], svResults: [] });
      });
  }
}

export default AutoCompleteInput;
