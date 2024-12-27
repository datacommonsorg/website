/**
 * Copyright 2022 Google LLC
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
 * Input box with autocomplete for Search Page.
 */

import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { NamedNode, NamedPlace } from "../shared/types";
import { getPlaceDcids } from "../utils/place_utils";
import {
  getHighlightedJSX,
  getStatVarSearchResults,
} from "../utils/search_utils";

interface SearchInputPropType {
  query: string;
}
const NUM_SV_RESULTS = 5;
const DELAY_MS = 200;
const REDIRECT_PREFIX = "/search?";

export function SearchInput(props: SearchInputPropType): JSX.Element {
  const delayTimer = useRef(null);
  const placeAutocompleteService = useRef(null);
  // Most recent query entered by user
  const latestQuery = useRef(null);
  // The result index that user has hovered
  const [hoveredIdx, setHoveredIdx] = useState(0);
  // The results that match the current query
  const [results, setResults] = useState({ placeResults: [], svResults: [] });
  // The text user has entered in the input box
  const [inputText, setInputText] = useState(props.query);
  // Whether autocomplete results should be shown
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (google.maps) {
      placeAutocompleteService.current =
        new google.maps.places.AutocompleteService();
    }
  }, []);

  const matches = inputText.split(" ");
  return (
    <>
      <div
        className="search-input-section"
        onBlur={(event): void => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setShowResults(false);
          }
        }}
        onKeyDown={(event): void => handleKeydownEvent(event)}
      >
        <div className="search-input-wrapper">
          <form
            onSubmit={(event): void => {
              event.preventDefault();
              redirectAction(inputText, "", "");
            }}
            tabIndex={-1}
          >
            <input
              className="search-input-box"
              type="text"
              value={inputText}
              onChange={(event): void => onInputChanged(event.target.value)}
              placeholder="Search for places, variables, and more on Data Commons"
            />
          </form>
          {!_.isEmpty(inputText) && (
            <span
              className="material-icons-outlined search-input-box-clear"
              onClick={(): void => onInputChanged("")}
            >
              clear
            </span>
          )}{" "}
        </div>
        {showResults && (
          <div className="search-input-results-list" tabIndex={-1}>
            <div
              className={`search-input-result ${
                0 === hoveredIdx ? "search-input-result-highlighted" : ""
              }`}
              onClick={(): void => redirectAction(inputText, "", "")}
              key={"search-input-result-0"}
            >
              {inputText}
            </div>
            {!_.isEmpty(results.placeResults) &&
              results.placeResults.map((result, idx) => {
                return (
                  <div
                    className={`search-input-result ${
                      idx + 1 === hoveredIdx
                        ? "search-input-result-highlighted"
                        : ""
                    }`}
                    key={"search-input-result-" + result.dcid}
                    onClick={(): void =>
                      redirectAction(result.name, result.dcid, "")
                    }
                  >
                    {getHighlightedJSX(result.dcid, result.name, matches)}
                  </div>
                );
              })}
            {!_.isEmpty(results.svResults) &&
              results.svResults.map((result, idx) => {
                return (
                  <div
                    className={`search-input-result ${
                      idx + 1 + results.placeResults.length === hoveredIdx
                        ? "search-input-result-highlighted"
                        : ""
                    }`}
                    onClick={(): void =>
                      redirectAction(result.name, "", result.dcid)
                    }
                    key={"search-input-result-" + result.dcid}
                  >
                    {getHighlightedJSX(result.dcid, result.name, matches)}
                  </div>
                );
              })}
          </div>
        )}
      </div>
      <span
        className="search-input-search-button"
        onClick={(): void => redirectAction(inputText, "", "")}
      >
        <img src="/images/icon-search.svg" />
      </span>
    </>
  );

  function onInputChanged(input: string): void {
    setInputText(input);
    if (input === "") {
      setShowResults(false);
      setResults({ placeResults: [], svResults: [] });
      return;
    }
    setHoveredIdx(0);
    setShowResults(true);
    clearTimeout(delayTimer.current);
    delayTimer.current = setTimeout(() => search(input), DELAY_MS);
  }

  function search(query: string): void {
    latestQuery.current = query;
    if (placeAutocompleteService.current) {
      placeAutocompleteService.current.getPredictions(
        { input: query, types: ["(regions)"] },
        (predictions, status) =>
          onPlaceAutocompleteCompleted(query, predictions, status)
      );
    } else {
      getSvResultsPromise(query)
        .then((results) => {
          if (query !== latestQuery.current) {
            return;
          }
          setResults({ placeResults: [], svResults: results });
        })
        .catch(() => {
          if (query !== latestQuery.current) {
            return;
          }
          setShowResults(false);
          setResults({ placeResults: [], svResults: [] });
        });
    }
  }

  function onPlaceAutocompleteCompleted(
    query: string,
    predictions: google.maps.places.AutocompletePrediction[],
    status: google.maps.places.PlacesServiceStatus
  ): void {
    let namedPlacePromise: Promise<NamedPlace[]> = Promise.resolve([]);
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      const placeIds = predictions.map((prediction) => prediction.place_id);
      namedPlacePromise = getPlaceDcids(placeIds).then((dcids) => {
        return predictions
          .map((prediction) => {
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
    Promise.all([namedPlacePromise, getSvResultsPromise(query)])
      .then(([placeResults, svResults]) => {
        if (query !== latestQuery.current) {
          return;
        }
        if (_.isEmpty(placeResults) && _.isEmpty(svResults)) {
          setShowResults(false);
          setResults({ placeResults: [], svResults: [] });
        } else {
          setResults({ placeResults, svResults });
        }
      })
      .catch(() => {
        if (query !== latestQuery.current) {
          return;
        }
        setShowResults(false);
        setResults({ placeResults: [], svResults: [] });
      });
  }

  function handleKeydownEvent(
    event: React.KeyboardEvent<HTMLDivElement>
  ): void {
    if (!showResults) {
      return;
    }
    const numResults =
      results.placeResults.length + results.svResults.length + 1;
    if (event.key === "ArrowDown") {
      setHoveredIdx((curr) => (curr + 1) % numResults);
    } else if (event.key === "ArrowUp") {
      setHoveredIdx((curr) => {
        const newIdx = curr - 1;
        if (newIdx < 0) {
          return Math.abs(newIdx + numResults) % numResults;
        } else {
          return newIdx % numResults;
        }
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (hoveredIdx === 0) {
        redirectAction(inputText, "", "");
      } else if (hoveredIdx < results.placeResults.length + 1) {
        const result = results.placeResults[hoveredIdx - 1];
        redirectAction(result.name, result.dcid, "");
      } else {
        const result =
          results.svResults[hoveredIdx - (results.placeResults.length + 1)];
        redirectAction(result.name, "", result.dcid);
      }
    }
  }
}

function redirectAction(
  query: string,
  placeDcid: string,
  svDcid: string
): void {
  let url = REDIRECT_PREFIX;
  if (query) {
    url += `q=${query}`;
  }
  if (placeDcid) {
    url += `&placeDcid=${placeDcid}`;
  }
  if (svDcid) {
    url += `&svDcid=${svDcid}`;
  }
  window.open(url, "_self");
}

function getSvResultsPromise(query: string): Promise<NamedNode[]> {
  return getStatVarSearchResults(query, [], true).then((data) => {
    return data.statVars.slice(
      0,
      Math.min(NUM_SV_RESULTS, data.statVars.length)
    );
  });
}
