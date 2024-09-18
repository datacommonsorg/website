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
import React, { ReactElement, useState, useRef, useEffect } from "react";
import { Input } from "reactstrap";
import {
    getHighlightedJSX,
    getStatVarSearchResults,
  } from "../../utils/search_utils";
import { NamedNode, NamedPlace } from "../../shared/types";
import { getPlaceDcids } from "../../utils/place_utils";
  
const stop_words = [ 
  'in', 'to', 'from', 'the'
]; 

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
}): ReactElement {
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState({ placeResults: [], svResults: [] });
    const latestQuery = useRef(null);
    const placeAutocompleteService = useRef(null);
    const [hoveredIdx, setHoveredIdx] = useState(0);
    const [inputText, setInputText] = useState('');
    const [selectedSuggestion, setSelectedSuggestion] = useState('')

    useEffect(() => {
        setInputText(value)
      }, []);

    useEffect(() => {
        if (enableAutoComplete && google.maps) {
          placeAutocompleteService.current =
            new google.maps.places.AutocompleteService();
        }
      }, [enableAutoComplete]);

    function onSelect(selectedName: string) : void {
        selectedName += ' ';
        var newInputText = latestQuery.current == null ?  selectedName : inputText.replace(latestQuery.current, ' ' + selectedName)
        setInputText(newInputText);
        onChange(newInputText);
        setSelectedSuggestion(selectedName);
        setShowResults(false);
        setResults({ placeResults: [], svResults: [] });
    }

    function onInputChange(e: React.ChangeEvent<HTMLInputElement>) :void {
        const currentText = e.target.value;
        onChange(currentText);
        setInputText(currentText);

        if (currentText == '') {
            setSelectedSuggestion('');
        }

        if (!enableAutoComplete) {
            return;
        }

        
        setShowResults(true);
        var currentQuery = selectedSuggestion == '' ? currentText : currentText.replace(selectedSuggestion, '');
        console.log("Now running query " + currentQuery + "because " + selectedSuggestion);
        latestQuery.current = currentQuery;
        if (placeAutocompleteService.current) {
            placeAutocompleteService.current.getPredictions(
              { input: currentQuery, types: ["(regions)"] },
              (predictions, status) =>
                onPlaceAutocompleteCompleted(currentQuery, predictions, status)
            );
          }
      }

    const matches = inputText.split(" ");

  return (
    <>
        <Input
            id={inputId}
            invalid={invalid}
            placeholder={placeholder}
            value={inputText}
            onChange={onInputChange}
            onKeyDown={(e): void => e.key === "Enter" && onSearch()}
            className="pac-target-input search-input-text"
            autoFocus={shouldAutoFocus}
        ></Input>
        { enableAutoComplete && showResults && (
            <div className="search-results-place search-results-section">
            <div className="search-input-results-list" tabIndex={-1}>
            {/* <div
              className={`search-input-result ${
                0 === hoveredIdx ? "search-input-result-highlighted" : ""
              }`}
              onClick={() => redirectAction(inputText, "", "")}
              key={"search-input-result-0"}
            >
              {inputText}
            </div> */}
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
                    onClick={() => selectedSuggestion == '' ? redirectAction(result.name, result.dcid, "") : onSelect(result.name)}
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
                    onClick={() => onSelect(result.name)}
                    key={"search-input-result-" + result.dcid}
                  >
                    {getHighlightedJSX(result.dcid, result.name, matches)}
                  </div>
                );
              })}
          </div>
          </div>
        )}
    </>
  );

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
};


const REDIRECT_PREFIX = "/explore?";
function redirectAction(
    query: string,
    placeDcid: string,
    svDcid: string
  ): void {
    console.log("on shit " + placeDcid);
    let url = REDIRECT_PREFIX;
    if (query) {
      url += `q=${query}`;
    }
    if (placeDcid) {
        url = "/place/" + `${placeDcid}`;
    }
    if (svDcid) {
      url += `&svDcid=${svDcid}`;
    }
    window.open(url, "_self");
  }

const NUM_SV_RESULTS = 5;
function getSvResultsPromise(query: string): Promise<NamedNode[]> {
    return getStatVarSearchResults(query, [], true).then((data) => {
      return data.statVars.slice(
        0,
        Math.min(NUM_SV_RESULTS, data.statVars.length)
      );
    });
  }

export default AutoCompleteInput;
