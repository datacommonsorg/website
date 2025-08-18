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

import { intl } from "../../i18n/i18n";
import {
  GA_EVENT_AUTOCOMPLETE_SELECTION,
  GA_EVENT_AUTOCOMPLETE_SELECTION_REDIRECTS_TO_PLACE,
  GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX,
  GA_PARAM_DYNAMIC_PLACEHOLDER,
  triggerGAEvent,
} from "../../shared/ga_events";
import { useQueryStore } from "../../shared/stores/query_store_hook";
import {
  extractFlagsToPropagate,
  redirect,
  replaceQueryWithSelection,
  stripPatternFromQuery,
} from "../../shared/util";
import {
  useInsideClickAlerter,
  useOutsideClickAlerter,
} from "../../utils/click_alerter";
import { ArrowForward } from "../elements/icons/arrow_forward";
import { Search } from "../elements/icons/search";
import { AutoCompleteSuggestions } from "./auto_complete_suggestions";
import {
  enableDynamicPlacehoder,
  placeholderMessages,
} from "./dynamic_placeholder_helper";

const DEBOUNCE_INTERVAL_MS = 100;
const PLACE_EXPLORER_PREFIX = "/place/";
const STAT_VAR_EXPLORER_PREFIX = "/tools/statvar#sv=";
const LOCATION_SEARCH = "location_search";
const STAT_VAR_SEARCH = "stat_var_search";

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
  inputId: string;
  onChange: (query: string) => void;
  onSearch: (dynamicPlaceholdersEnabled: boolean) => void;
  feedbackLink: string;
  shouldAutoFocus: boolean;
  barType: string;
  enableDynamicPlaceholders?: boolean;
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
  const [baseInputLastQuery, setBaseInputLastQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState<AutoCompleteResult[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [triggerSearch, setTriggerSearch] = useState("");
  const [inputActive, setInputActive] = useState(false);
  const [dynamicPlaceholdersDone, setDynamicPlaceholdersDone] = useState(false);
  const [dynamicPlaceholdersEnabled, setDynamicPlaceholdersEnabled] =
    useState(false);
  const [sampleQuestionText, setSampleQuestionText] = useState("");
  const [lastAutoCompleteSelection, setLastAutoCompleteSelection] =
    useState("");
  const [lastScrollYOnTrigger, setLastScrollYOnTrigger] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isHeaderBar = props.barType == "header";

  const { placeholder } = useQueryStore();

  useEffect(() => {
    window.addEventListener("scroll", () => {
      setLastScrollY(window.scrollY);
    });

    if (!inputText && props.enableDynamicPlaceholders) {
      enableDynamicPlacehoder(
        setSampleQuestionText,
        setDynamicPlaceholdersEnabled,
        setDynamicPlaceholdersDone
      );
    }
  }, []);

  const placeholderText =
    !inputActive && dynamicPlaceholdersEnabled && !dynamicPlaceholdersDone
      ? intl.formatMessage(placeholderMessages.exploreDataPlaceholder, {
          sampleQuestion: sampleQuestionText,
        })
      : placeholder;

  useEffect(() => {
    if (
      results.length > 0 &&
      Math.abs(lastScrollY - lastScrollYOnTrigger) > window.outerHeight * 0.15
    ) {
      setResults([]);
    }
  }, [lastScrollY, lastScrollYOnTrigger, results]);

  useEffect(() => {
    if (props.value != inputText) {
      changeText(props.value);
    }
  }, [props.value]);

  useOutsideClickAlerter(wrapperRef, () => {
    setResults([]);
    setInputActive(false);
  });

  useInsideClickAlerter(wrapperRef, () => {
    setInputActive(true);
  });

  useEffect(() => {
    executeQuery();
  }, [triggerSearch, setTriggerSearch]);

  function executeQuery(): void {
    setResults([]);
    setHoveredIdx(-1);
    controller.current.abort();
    props.onSearch(dynamicPlaceholdersEnabled);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const currentText = e.target.value;
    changeText(currentText);
    setBaseInput(currentText);

    if (!props.enableAutoComplete) return;

    const selectionApplied =
      hoveredIdx >= 0 &&
      hoveredIdx < results.length &&
      currentText.trim().endsWith(results[hoveredIdx].name);

    let lastSelection = lastAutoCompleteSelection;
    if (selectionApplied) {
      triggerGAEvent(GA_EVENT_AUTOCOMPLETE_SELECTION, {
        [GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX]: String(hoveredIdx),
      });
      setResults([]);
      setHoveredIdx(-1);
      setLastAutoCompleteSelection(results[hoveredIdx].name);
      return;
    } else if (_.isEmpty(currentText)) {
      setResults([]);
      setLastAutoCompleteSelection("");
      setHoveredIdx(-1);
      return;
    } else if (!currentText.includes(lastAutoCompleteSelection)) {
      lastSelection = "";
      setLastAutoCompleteSelection(lastSelection);
    }

    let queryForAutoComplete = currentText;
    const locationTriggers = [" in ", " near ", " from ", " at "];
    const separators = [" vs ", " versus ", " and ", " by "];
    let queryFound = false;

    // First, check for location triggers, as they are most specific
    for (const trigger of locationTriggers) {
      const lastIndex = queryForAutoComplete
        .toLowerCase()
        .lastIndexOf(trigger.toLowerCase());
      if (lastIndex !== -1) {
        queryForAutoComplete = queryForAutoComplete.substring(
          lastIndex + trigger.length
        );
        queryFound = true;
        break;
      }
    }

    // If no location trigger, check for general separators
    if (!queryFound) {
      for (const sep of separators) {
        const lastIndex = queryForAutoComplete
          .toLowerCase()
          .lastIndexOf(sep.toLowerCase());
        if (lastIndex !== -1) {
          queryForAutoComplete = queryForAutoComplete.substring(
            lastIndex + sep.length
          );
          queryFound = true;
          break;
        }
      }
    }

    if (!queryFound && !_.isEmpty(lastSelection)) {
      const splitQuery = currentText.split(lastSelection);
      if (splitQuery.length > 1) {
        queryForAutoComplete = splitQuery[splitQuery.length - 1].trim();
      }
    }

    sendDebouncedAutoCompleteRequest(queryForAutoComplete);
  }

  const triggerAutoCompleteRequest = useCallback(async (query: string) => {
    setLastScrollYOnTrigger(window.scrollY);
    if (controller.current) {
      controller.current.abort();
    }
    controller.current = new AbortController();

    const urlParams = extractFlagsToPropagate(window.location.href);
    urlParams.set("query", query);
    const url = `/api/autocomplete?${urlParams.toString()}`;

    await axios
      .get(url, {
        signal: controller.current.signal,
      })
      .then((response) => {
        if (controller.current.signal.aborted) {
          return;
        }
        setResults(
          convertJSONToAutoCompleteResults(response.data.predictions || [])
        );
        setBaseInputLastQuery(query);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          console.log("Error fetching autocomplete suggestions: " + err);
        }
      });
  }, []);

  const sendDebouncedAutoCompleteRequest = useMemo(() => {
    return _.debounce(triggerAutoCompleteRequest, DEBOUNCE_INTERVAL_MS);
  }, [triggerAutoCompleteRequest]);

  function changeText(text: string): void {
    setInputText(text);
    props.onChange(text);
  }

  function handleKeydownEvent(
    event: React.KeyboardEvent<HTMLDivElement>
  ): void {
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        if (hoveredIdx >= 0) {
          selectResult(results[hoveredIdx], hoveredIdx);
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
        processArrowKey(Math.min(hoveredIdx + 1, results.length - 1));
        break;
    }
  }

  function processArrowKey(selectedIndex: number): void {
    setHoveredIdx(selectedIndex);
    const textDisplayed =
      selectedIndex >= 0
        ? replaceQueryWithSelection(baseInput, results[selectedIndex])
        : baseInput;
    changeText(textDisplayed);
  }

  function selectResult(result: AutoCompleteResult, idx: number): void {
    triggerGAEvent(GA_EVENT_AUTOCOMPLETE_SELECTION, {
      [GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX]: String(idx),
    });

    if (
      result.matchType === STAT_VAR_SEARCH &&
      stripPatternFromQuery(baseInput, result.matchedQuery).trim() === ""
    ) {
      if (result.dcid) {
        window.location.href = STAT_VAR_EXPLORER_PREFIX + result.dcid;
        return;
      }
    }

    if (
      result.matchType == LOCATION_SEARCH &&
      stripPatternFromQuery(baseInput, result.matchedQuery).trim() === ""
    ) {
      if (result.dcid) {
        triggerGAEvent(GA_EVENT_AUTOCOMPLETE_SELECTION_REDIRECTS_TO_PLACE, {
          [GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX]: String(idx),
          [GA_PARAM_DYNAMIC_PLACEHOLDER]: String(enableDynamicPlacehoder),
        });

        const overrideParams = new URLSearchParams();
        overrideParams.set("q", result.name);
        const destinationUrl = PLACE_EXPLORER_PREFIX + `${result.dcid}`;
        return redirect(window.location.href, destinationUrl, overrideParams);
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
          results.length == 0 ? "radiused" : "unradiused"
        } ${inputActive ? "search-box-section-active" : ""}`}
        ref={wrapperRef}
      >
        <div
          className={`search-bar${props.value ? " non-empty" : ""} ${
            results.length == 0 ? "radiused" : "unradiused"
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
              placeholder={placeholderText}
              aria-label={placeholderText}
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
        {props.enableAutoComplete && !_.isEmpty(results) && (
          <AutoCompleteSuggestions
            baseInput={baseInput}
            baseInputLastQuery={baseInputLastQuery}
            allResults={results}
            hoveredIdx={hoveredIdx}
            onClick={selectResult}
          />
        )}
      </div>
    </>
  );
}
