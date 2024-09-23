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
import e from "express";
import { text } from "d3";

const icons = {'place': 'place', 'sv': 'analytics'};
const stop_words = ["in", "for", "from", "at"];

function useOutsideAlerter(ref, clearResults) {
  useEffect(() => {
    /**
     * Alert if clicked on outside of element
     */
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        clearResults();
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);
}

function AutoCompleteSuggestions({ allResults, inputText, onClick, hoveredIdx}): ReactElement {

  const matches = inputText.split(" ");

  return (
    <>
    <div className="search-results-place search-results-section">
      <div className="search-input-results-list" tabIndex={-1}>
      {!_.isEmpty(allResults) &&
        allResults.map((result, idx) => {
          return (<>
            <div className='search-input-result-section'>
              <div
                className={`search-input-result ${
                  idx === hoveredIdx
                    ? "search-input-result-highlighted"
                    : ""
                }`}
                key={"search-input-result-" + result.dcid}
                onClick={() => onClick(result)}>
                <span className="material-icons-outlined">{icons[result['type']]}</span>
                {getHighlightedJSX(result.dcid, result.name, matches)}
                {idx !== allResults.length-1 ? <hr></hr> : <></>}
                </div>
              </div>
            </>
          );
        })}
      </div>
    </div>
    </>
  );
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
    const placeAutocompleteService = useRef(null);
    const [inputText, setInputText] = useState('');
    const wrapperRef = useRef(null);
    const [hoveredIdx, setHoveredIdx] = useState(-1);
    const [results, setResults] = useState({ placeResults: [], svResults: [] });
    const [allResults, setAllResults] = useState([]);
    const latestQuery = useRef(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState('')
    const [baseInput, setBaseInput] = useState('')
  

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
    }))));
    setAllResults(allResultsSorted);
  }, [results, setResults]);
  

  useEffect(() => {
    onSearch(inputText);
  }, [selectedSuggestion, setSelectedSuggestion]);


  function onSelect(selectedName: string) : void {
    selectedName += ' ';
    var newInputText = latestQuery.current == null ?  selectedName : baseInput.replace(latestQuery.current, selectedName)
    onChange(newInputText);
    setResults({ placeResults: [], svResults: [] });
    setSelectedSuggestion(selectedName);
  }

  useEffect(() => {
    console.log("Base input is " + baseInput);
  }, [baseInput, setBaseInput]);

    function onInputChange(e: React.ChangeEvent<HTMLInputElement>) :void {
      setHoveredIdx(-1);
      const currentText = e.target.value;
      setBaseInput(currentText);

      if (_.isEmpty(currentText)) {
        setSelectedSuggestion('');
        setResults({ placeResults: [], svResults: [] });
        changeText(currentText);
        return;
      }
  
      var currentQuery = selectedSuggestion == '' ? currentText : currentText.replace(selectedSuggestion, '');
      latestQuery.current = currentQuery;
      if (placeAutocompleteService.current) {
          placeAutocompleteService.current.getPredictions(
            { input: currentQuery, types: ["(regions)"], offset: currentText.length },
            (predictions, status) =>
              onPlaceAutocompleteCompleted(currentQuery, predictions, status, /* allowRetry= */true)
          );
      }
      changeText(currentText);
    }

    function changeText(text: string) {
      setInputText(text);
      onChange(text);
    }

    const isHeaderBar = barType == 'header';
    useOutsideAlerter(wrapperRef, () => {setResults({ placeResults: [], svResults: [] });});

    function handleKeydownEvent(event: React.KeyboardEvent<HTMLDivElement>
    ): void {
      const regex = new RegExp("\\b(?:.(?!" + latestQuery.current + "))+$\\b", "i") ;
      
      let index = hoveredIdx;
      console.log("Key Down: " + index);
      switch(event.key) {
        case "Enter":
          if (hoveredIdx >= 0) {
            onClick(allResults[hoveredIdx])
          } else {
            onSearch();
          }
          event.preventDefault();
          break;
        case "ArrowUp":
          index = Math.max(hoveredIdx-1, -1);
          setHoveredIdx(index);
          event.preventDefault();
          if (index >= 0) {
            const strin = baseInput.replace(regex, '')  + allResults[index].name;
            changeText(strin);
          } else {
            changeText(baseInput);
          }
          break;
        case "ArrowDown":
          index = Math.min(hoveredIdx+1, allResults.length-1);
          setHoveredIdx(index);
          setHoveredIdx(index);
          event.preventDefault();
          const newString = baseInput.replace(regex, '')  + allResults[index].name;
          changeText(newString);
          break;
      }
    }

  return (
    <>
    <div className="search-box-section" ref={wrapperRef}>
      <div className={`search-bar${value ? " non-empty" : ""}`}>
        <InputGroup className="search-bar-content">
          { isHeaderBar && <span className="material-icons-outlined">search</span> }
          <Input
            id={inputId}
            invalid={invalid}
            placeholder={placeholder}
            value={inputText}
            onChange={onInputChange}
            onKeyDown={(event) => handleKeydownEvent(event)}
            className="pac-target-input search-input-text"
            autoComplete="one-time-code"
            autoFocus={shouldAutoFocus}></Input>
            <div onClick={onSearch} id="rich-search-button">
              { isHeaderBar && <span className="material-icons-outlined">arrow_forward</span> }
            </div>
        </InputGroup>
        </div>
        { enableAutoComplete && <AutoCompleteSuggestions inputText={inputText} allResults={allResults} hoveredIdx={hoveredIdx} onClick={onClick}/>}
      </div>
    </>
  );

  function onClick(result) {
    if (result.name.toLowerCase().includes(inputText.toLowerCase())) {
      if (result['type'] == 'place') {
        redirectAction(result.name, result.dcid, "");
      } else if (result['type'] == 'sv') {
        redirectAction(result.name, "", result.dcid);
      }
    } else {
      onSelect(result.name);
    }
  }

  function onPlaceAutocompleteCompleted(
    query: string,
    predictions: google.maps.places.AutocompletePrediction[],
    status: google.maps.places.PlacesServiceStatus,
    allowRetry: boolean
  ): void {
    if (allowRetry && _.isEmpty(predictions)) {
      const regex = new RegExp("\\b(?:" + stop_words.join('|') + "|\\s)+\\b", "i");
      var split = query.trim().split(regex);
      if (split.length == 1) {
        split = query.trim().split(' ');
      }

      if (split.length > 1) {
        const curr = split[split.length-1];
        latestQuery.current = curr;
        placeAutocompleteService.current.getPredictions(
          { input: curr, types: ["(regions)"] },
          (predictions, status) =>
            onPlaceAutocompleteCompleted(curr, predictions, status, /* allowRetry= */false)
        );
      }
    }
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

 

const REDIRECT_PREFIX = "/explore?";
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
        url = "/place/" + `${placeDcid}`;
    }
    if (svDcid) {
      url = `/tools/statvar#sv=${svDcid}`;
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
