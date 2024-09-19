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
import { Input, InputGroup } from "reactstrap";
import {
    getHighlightedJSX,
    getStatVarSearchResults,
  } from "../../utils/search_utils";
import { NamedNode, NamedPlace } from "../../shared/types";
import { getPlaceDcids } from "../../utils/place_utils";

const icons = {'place': 'place', 'sv': 'analytics'};

function AutoCompleteSuggestions({ inputText, setInputText, onChange}): ReactElement {
  const placeAutocompleteService = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(0);
  const [results, setResults] = useState({ placeResults: [], svResults: [] });
  const [selectedSuggestion, setSelectedSuggestion] = useState('')
  const [allResults, setAllResults] = useState([]);
  const latestQuery = useRef(null);

  function onSelect(selectedName: string) : void {
    selectedName += ' ';
    var newInputText = latestQuery.current == null ?  selectedName : inputText.replace(latestQuery.current, ' ' + selectedName)
    setInputText(newInputText);  
    setSelectedSuggestion(selectedName);
    setResults({ placeResults: [], svResults: [] });
    onChange(newInputText);
  }
  const matches = inputText.split(" ");

  useEffect(() => {
    if (google.maps) {
      placeAutocompleteService.current =
        new google.maps.places.AutocompleteService();
    }
  }, []);

  useEffect(() => {
    const allResultsSorted = ((results.placeResults.map((result, idx) => {
      result['type'] = 'place';
      return result;
    }).concat(results.svResults.map((result, idx) => {
      result['type']='sv';
      return result;
    }))).sort(function(a, b){return a.name.localeCompare(b.name);}));
    setAllResults(allResultsSorted);
  }, [results, setResults]);

  useEffect(() => {
    if (_.isEmpty(inputText)) {
      setSelectedSuggestion('');
      setResults({ placeResults: [], svResults: [] });
      return;
    }

    var currentQuery = selectedSuggestion == '' ? inputText : inputText.replace(selectedSuggestion, '');
    latestQuery.current = currentQuery;
    if (placeAutocompleteService.current) {
        placeAutocompleteService.current.getPredictions(
          { input: currentQuery, types: ["(regions)"] },
          (predictions, status) =>
            onPlaceAutocompleteCompleted(currentQuery, predictions, status)
        );
      }
  }, [inputText]);
  
  function onClick(result) {
    if (_.isEmpty(selectedSuggestion)) {
      if (result['type'] == 'place') {
        redirectAction(result.name, result.dcid, "");
      } else if (result['type'] == 'sv') {
        redirectAction(result.name, "", result.dcid);
      }
    } else {
      onSelect(result.name);
    }
  }

  return (
    <>
    <div className="search-results-place search-results-section">
      <div className="search-input-results-list" tabIndex={-1}>
      {!_.isEmpty(allResults) &&
        allResults.map((result, idx) => {
          return (
            <div className='search-input-result-section'>
              <div
                className={`search-input-result ${
                  idx + 1 === hoveredIdx
                    ? "search-input-result-highlighted"
                    : ""
                }`}
                key={"search-input-result-" + result.dcid}
                onClick={() => onClick(result)}>
                <span className="material-icons-outlined">{icons[result['type']]}</span>
                {getHighlightedJSX(result.dcid, result.name, matches)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
    Promise.all([namedPlacePromise]) //, getSvResultsPromise(query)])
      .then(([placeResults]) => { // , svResults
        if (query !== latestQuery.current) {
          return;
        }
        if (_.isEmpty(placeResults)) {
          setResults({ placeResults: [], svResults: [] });
        } else {
          setResults({ placeResults, svResults: [] });
        }
      })
      .catch(() => {
        if (query !== latestQuery.current) {
          return;
        }
        setResults({ placeResults: [], svResults: [] });
      });
  }
};

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
    const [inputText, setInputText] = useState('');

    function onInputChange(e: React.ChangeEvent<HTMLInputElement>) :void {
        const currentText = e.target.value;
        setInputText(currentText);
        onChange(currentText);
      }

    const isHeaderBar = barType == 'header';

  return (
    <>
    <div className="search-box-section">
      <div className={`search-bar${value ? " non-empty" : ""}`}>
        <InputGroup className="search-bar-content">
          { isHeaderBar && <span className="material-icons-outlined">search</span> }
          <Input
            id={inputId}
            invalid={invalid}
            placeholder={placeholder}
            value={inputText}
            onChange={onInputChange}
            onKeyDown={(e): void => e.key === "Enter" && onSearch()}
            className="pac-target-input search-input-text"
            autoComplete="new-password"
            autoFocus={shouldAutoFocus}></Input>
            <div onClick={onSearch} id="rich-search-button">
              { isHeaderBar && <span className="material-icons-outlined">arrow_forward</span> }
            </div>
        </InputGroup>
        </div>
        { enableAutoComplete && <AutoCompleteSuggestions inputText={inputText} setInputText={setInputText} onChange={onChange}/>}
      </div>
    </>
  );
}

 

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
      url = `/tools/statvar#sv=${svDcid}`;
    }
    window.open(url, "_");
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
