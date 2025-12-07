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
/** @jsxImportSource @emotion/react */

import { css } from "@emotion/react";
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
  DISABLE_FEATURE_URL_PARAM,
  ENABLE_FEATURE_URL_PARAM,
  ENABLE_STAT_VAR_AUTOCOMPLETE,
} from "../../shared/feature_flags/util";
import {
  GA_EVENT_AUTOCOMPLETE_SELECTION,
  GA_EVENT_AUTOCOMPLETE_SELECTION_REDIRECTS_TO_PLACE,
  GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX,
  GA_PARAM_DYNAMIC_PLACEHOLDER,
  GA_PARAM_QUERY_AT_SELECTION,
  GA_PARAM_SELECTION_TEXT,
  GA_PARAM_SELECTION_TYPE,
  triggerGAEvent,
} from "../../shared/ga_events";
import { useQueryStore } from "../../shared/stores/query_store_hook";
import {
  extractFlagsToPropagate,
  getStatVarInfo,
  redirect,
  replaceQueryWithSelection,
  stripPatternFromQuery,
} from "../../shared/util";
import theme from "../../theme/theme";
import {
  useInsideClickAlerter,
  useOutsideClickAlerter,
} from "../../utils/click_alerter";
import { Button } from "../elements/button/button";
import { ArrowForward } from "../elements/icons/arrow_forward";
import { Search } from "../elements/icons/search";
import { AutoCompleteSuggestions } from "./auto_complete_suggestions";
import {
  enableDynamicPlacehoder,
  placeholderMessages,
} from "./dynamic_placeholder_helper";

const DEBOUNCE_INTERVAL_MS = 100;
const PLACE_EXPLORER_PREFIX = "/place/";
const LOCATION_SEARCH = "location_search";
const STAT_VAR_SEARCH = "stat_var_search";

export interface AutoCompleteResult {
  dcid: string;
  matchType: string;
  matchedQuery: string;
  name: string;
  hasPlace?: boolean;
  fullText?: string;
  placeDcid?: string;
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
  enableStatVarAutocomplete?: boolean;
}

function convertJSONToAutoCompleteResults(
  json: object[]
): AutoCompleteResult[] {
  return json.map((json) => ({
    dcid: json["dcid"],
    matchType: json["match_type"],
    matchedQuery: json["matched_query"],
    name: json["name"],
    hasPlace: json["has_place"] || false,
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
  const [hasLocation, setHasLocation] = useState(false);
  const [statVarInfo, setStatVarInfo] = useState({});
  const [processedResults, setProcessedResults] = useState([]);

  const isHeaderBar = props.barType == "header";

  const { placeholder } = useQueryStore();

  useEffect(() => {
    const handleScroll = (): void => {
      setLastScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [setLastScrollY]);

  useEffect(() => {
    if (!inputText && props.enableDynamicPlaceholders) {
      enableDynamicPlacehoder(
        setSampleQuestionText,
        setDynamicPlaceholdersEnabled,
        setDynamicPlaceholdersDone
      );
    }
  }, [
    inputText,
    props.enableDynamicPlaceholders,
    setSampleQuestionText,
    setDynamicPlaceholdersEnabled,
    setDynamicPlaceholdersDone,
  ]);

  useEffect(() => {
    if (_.isEmpty(results)) {
      setProcessedResults([]);
      return;
    }

    const newProcessedResults = results.map((result) => {
      const selection = replaceQueryWithSelection(
        baseInput,
        result,
        hasLocation,
        statVarInfo
      );
      return {
        ...result,
        fullText: selection.query,
        placeDcid: selection.placeDcid,
      };
    });
    setProcessedResults(newProcessedResults);
  }, [results, statVarInfo, baseInput, hasLocation]);

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
      !_.isEmpty(currentText) &&
      !_.isEmpty(lastAutoCompleteSelection) &&
      currentText.trim().endsWith(lastAutoCompleteSelection);

    let lastSelection = lastAutoCompleteSelection;
    if (selectionApplied) {
      return;
    }

    if (_.isEmpty(currentText)) {
      setResults([]);
      setLastAutoCompleteSelection("");
      setHasLocation(false);
      setHoveredIdx(-1);
      return;
    } else if (!currentText.includes(lastAutoCompleteSelection)) {
      lastSelection = "";
      setLastAutoCompleteSelection(lastSelection);
      setHasLocation(false);
    }

    let queryForAutoComplete = currentText;

    if (!_.isEmpty(lastSelection)) {
      const splitQuery = currentText.split(lastSelection);
      if (splitQuery.length > 1) {
        queryForAutoComplete = splitQuery[splitQuery.length - 1].trim();
      }
    }

    sendDebouncedAutoCompleteRequest(queryForAutoComplete, hasLocation);
  }

  const triggerAutoCompleteRequest = useCallback(
    async (query: string, hasLocation?: boolean) => {
      setLastScrollYOnTrigger(window.scrollY);
      if (controller.current) {
        controller.current.abort();
      }
      controller.current = new AbortController();

      const urlParams = extractFlagsToPropagate(window.location.href);
      urlParams.set("query", query);
      // Force the backend to use the stat var autocomplete model if the feature is enabled.
      if (props.enableStatVarAutocomplete) {
        urlParams.set(ENABLE_FEATURE_URL_PARAM, ENABLE_STAT_VAR_AUTOCOMPLETE);
      } else {
        urlParams.set(DISABLE_FEATURE_URL_PARAM, ENABLE_STAT_VAR_AUTOCOMPLETE);
      }
      if (hasLocation) {
        urlParams.set("has_location", "true");
      }
      const url = `/api/autocomplete?${urlParams.toString()}`;

      try {
        const response = await axios.get(url, {
          signal: controller.current.signal,
        });
        const newResults = convertJSONToAutoCompleteResults(
          response.data.predictions || []
        );
        setResults(newResults);
        setBaseInputLastQuery(query);
        const statVarDcids = newResults
          .filter((result) => result.matchType === STAT_VAR_SEARCH)
          .map((result) => result.dcid);
        const dcidsToFetch = statVarDcids.filter((dcid) => !statVarInfo[dcid]);
        if (dcidsToFetch.length > 0) {
          getStatVarInfo(dcidsToFetch).then((resp) => {
            setStatVarInfo((prev) => ({ ...prev, ...resp.data }));
          });
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.log("Error fetching autocomplete suggestions: " + err);
        }
      }
    },
    [statVarInfo]
  );

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
          selectResult(processedResults[hoveredIdx], hoveredIdx);
        } else {
          executeQuery();
        }
        setResults([]);
        break;
      case "ArrowUp":
        event.preventDefault();
        processArrowKey(Math.max(hoveredIdx - 1, -1));
        break;
      case "ArrowDown":
        event.preventDefault();
        processArrowKey(Math.min(hoveredIdx + 1, results.length - 1));
        break;
      default:
        // Handle alphanumeric, space and backspace keys
        if (
          hoveredIdx >= 0 &&
          (/[a-zA-Z0-9]/.test(event.key) ||
            event.key === " " ||
            event.key === "Backspace" ||
            event.key === "Delete")
        ) {
          selectResult(processedResults[hoveredIdx], hoveredIdx, true);
        }
    }
  }

  function processArrowKey(selectedIndex: number): void {
    setHoveredIdx(selectedIndex);
    const textDisplayed =
      selectedIndex >= 0 ? processedResults[selectedIndex].fullText : baseInput;
    changeText(textDisplayed);
  }

  function selectResult(
    result: AutoCompleteResult,
    idx: number,
    skipRedirection?: boolean
  ): void {
    setResults([]);
    setHoveredIdx(-1);
    setLastAutoCompleteSelection(result.fullText);
    triggerGAEvent(GA_EVENT_AUTOCOMPLETE_SELECTION, {
      [GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX]: String(idx),
      [GA_PARAM_SELECTION_TYPE]: result.matchType,
      [GA_PARAM_SELECTION_TEXT]: result.name,
      [GA_PARAM_QUERY_AT_SELECTION]: baseInput,
    });

    const selectedProcessedResult = processedResults[idx];
    const queryText = selectedProcessedResult.fullText;
    // TODO(gmechali): Reconsider whether to use the selectedProcessedResult.placeDcid.
    const urlParams = extractFlagsToPropagate(window.location.href);
    if (props.enableAutoComplete) {
      urlParams.set(ENABLE_FEATURE_URL_PARAM, ENABLE_STAT_VAR_AUTOCOMPLETE);
    }

    if (result?.matchType == LOCATION_SEARCH) {
      setHasLocation(true);

      if (
        stripPatternFromQuery(baseInput, result.matchedQuery).trim() === "" &&
        result.dcid
      ) {
        triggerGAEvent(GA_EVENT_AUTOCOMPLETE_SELECTION_REDIRECTS_TO_PLACE, {
          [GA_PARAM_AUTOCOMPLETE_SELECTION_INDEX]: String(idx),
          [GA_PARAM_DYNAMIC_PLACEHOLDER]: String(enableDynamicPlacehoder),
        });

        const overrideParams = new URLSearchParams();
        overrideParams.set("q", result.name);
        if (props.enableStatVarAutocomplete) {
          overrideParams.set(
            ENABLE_FEATURE_URL_PARAM,
            ENABLE_STAT_VAR_AUTOCOMPLETE
          );
        }
        const destinationUrl = PLACE_EXPLORER_PREFIX + `${result.dcid}`;
        if (!skipRedirection) {
          redirect(window.location.href, destinationUrl, overrideParams);
        }
      }
    } else if (result?.matchType === STAT_VAR_SEARCH) {
      setHasLocation(
        hasLocation || result.placeDcid != null || result.hasPlace
      );
    }

    changeText(queryText);
    if (!skipRedirection) {
      setTriggerSearch(queryText);
    }
    setResults([]);
  }

  return (
    <>
      <div
        ref={wrapperRef}
        css={css`
          display: flex;
          flex-direction: column;
          border: 1px solid
            ${inputActive
              ? theme.search.active.border
              : theme.search.base.border};
          width: 100%;
          background-color: ${inputActive
            ? theme.search.active.background
            : theme.search.base.background};
          border-radius: ${theme.search.radius};
        `}
      >
        <InputGroup
          css={css`
            margin: 0;
            padding: 0;
            border: 0;
            display: flex;
            align-items: center;
            gap: ${theme.spacing.md}px;
            padding: 0 ${theme.spacing.lg}px;
          `}
        >
          <div
            css={css`
              ${theme.typography.text.lg}
              line-height: 1rem;
              margin: 0;
              padding: 0;
              color: ${inputActive
                ? theme.search.active.icon
                : theme.search.base.icon};
            `}
          >
            <Search />
          </div>
          <Input
            id={props.inputId}
            invalid={props.invalid}
            placeholder={placeholderText}
            aria-label={placeholderText}
            value={inputText}
            onChange={onInputChange}
            onKeyDown={(event): void => handleKeydownEvent(event)}
            autoComplete="one-time-code"
            autoFocus={props.shouldAutoFocus}
            css={css`
              && {
                // Reset default input styles
                margin: 0;
                padding: 0;
                border: none;
                background-image: none;
                background-color: transparent;
                box-shadow: none;
                cursor: default;
                // Custom styles
                ${theme.typography.family.text}
                ${theme.typography.text.md}
                line-height: 1rem;
                height: ${theme.search.height};
                background-color: ${inputActive
                  ? theme.search.active.background
                  : theme.search.base.background};
                color: ${inputActive
                  ? theme.search.active.text
                  : theme.search.base.text};
              }
              &&:focus,
              &&:active {
                border: none;
                box-shadow: none !important; // Override CSS Important
                outline: none;
              }
            `}
          />
          <Button
            variant="naked"
            size="lg"
            onClick={executeQuery}
            id="rich-search-button"
            css={css`
              && {
                color: ${props.value
                  ? inputActive
                    ? theme.search.active.button
                    : theme.search.base.button
                  : theme.search.base.button};
              }
            `}
          >
            <ArrowForward />
          </Button>
        </InputGroup>

        {props.enableAutoComplete && !_.isEmpty(results) && (
          <AutoCompleteSuggestions
            baseInput={baseInput}
            baseInputLastQuery={baseInputLastQuery}
            allResults={processedResults}
            hoveredIdx={hoveredIdx}
            onClick={selectResult}
            hasLocation={hasLocation}
          />
        )}
      </div>
    </>
  );
}
