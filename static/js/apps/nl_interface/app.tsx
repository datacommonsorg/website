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
 * Main component for NL interface.
 */

import React, { useEffect, useRef, useState } from "react";

import {
  NL_DETECTOR_VALS,
  NL_INDEX_VALS,
  NL_PLACE_DETECTOR_VALS,
  NL_URL_PARAMS,
} from "../../constants/app/nl_interface_constants";
import { getUrlToken, getUrlTokenOrDefault } from "../../utils/url_utils";
import { QueryHistory } from "./query_history";
import { QueryResult } from "./query_result";
import { QuerySearch } from "./query_search";
import { QueryWelcome } from "./query_welcome";
import { Sidebar } from "./sidebar";

const CHARACTER_INPUT_INTERVAL = 50;
const PROMPT_SEARCH_DELAY = 1000;
const NEXT_PROMPT_DELAY = 5000;

export function App(): JSX.Element {
  const [queries, setQueries] = useState<string[]>([]);
  const [contextList, setContextList] = useState<any[]>([]);
  // If autoRun is enabled, runs every prompt (';' separated) from the url.
  const autoRun = useRef(!!getUrlToken("a"));
  const demoMode = useRef(!!getUrlToken("enable_demo"));
  const delayDisabled = useRef(!!getUrlToken("d"));
  const [indexType, setIndexType] = useState(
    getUrlTokenOrDefault(NL_URL_PARAMS.IDX, NL_INDEX_VALS.SMALL)
  );
  const [detector, setDetector] = useState(
    getUrlTokenOrDefault(NL_URL_PARAMS.DETECTOR, NL_DETECTOR_VALS.HEURISTIC)
  );
  const [placeDetector, setPlaceDetector] = useState(
    getUrlTokenOrDefault(
      NL_URL_PARAMS.PLACE_DETECTOR,
      NL_PLACE_DETECTOR_VALS.NER
    )
  );
  const urlPrompts = useRef(getUrlPrompts());
  // Timer used to input characters from a single prompt with
  // CHARACTER_INPUT_INTERVAL ms between each character.
  const inputIntervalTimer = useRef(null);
  // Timer used to wait NEXT_PROMPT_DELAY ms before inputting a new prompt.
  const nextPromptDelayTimer = useRef(null);
  // Timer used to wait PROMPT_SEARCH_DELAY ms before searching for an inputted
  // prompt.
  const searchDelayTimer = useRef(null);

  // Updates the query search input box value.
  function updateSearchInput(input: string) {
    (document.getElementById("query-search-input") as HTMLInputElement).value =
      input;
  }

  // Searches for the query in the query search box.
  function executeSearch(): void {
    (
      document.getElementById("rich-search-button") as HTMLButtonElement
    ).click();
  }

  function getUrlPrompts(): string[] {
    const urlPromptsVal = getUrlToken("q");
    if (urlPromptsVal) {
      return urlPromptsVal.split(";");
    }
    return [];
  }

  function inputNextPrompt(delayStart: boolean): void {
    const prompt = urlPrompts.current.shift();
    if (!prompt) {
      return;
    }
    const nextPromptDelay =
      delayStart && !delayDisabled.current ? NEXT_PROMPT_DELAY : 0;
    const promptSearchDelay = delayDisabled.current ? 0 : PROMPT_SEARCH_DELAY;
    nextPromptDelayTimer.current = setTimeout(() => {
      // If delay is disabled, input the whole prompt at once
      let inputLength = delayDisabled.current ? prompt.length : 1;
      inputIntervalTimer.current = setInterval(() => {
        if (inputLength <= prompt.length) {
          updateSearchInput(prompt.substring(0, inputLength));
        }
        if (inputLength === prompt.length) {
          clearInterval(inputIntervalTimer.current);
          // If on autorun, search for the current input after
          // PROMPT_SEARCH_DELAY ms.
          if (autoRun.current) {
            searchDelayTimer.current = setTimeout(() => {
              executeSearch();
            }, promptSearchDelay);
          }
          return;
        }
        inputLength++;
      }, CHARACTER_INPUT_INTERVAL);
    }, nextPromptDelay);
  }

  useEffect(() => {
    // If there are url prompts that have not been searched, input the next
    // url prompt into the search box when the last query's data fetch has
    // completed.
    // TODO: Do this by going through state/props instead of directly
    // manipulating the DOM.
    if (urlPrompts.current.length && queries.length === contextList.length) {
      // delay inputting the prompt if it's not the first query.
      inputNextPrompt(queries.length > 0 /* delayStart */);
    }
    return () => {
      // When component unmounts, clear all timers
      clearInterval(inputIntervalTimer.current);
      clearTimeout(searchDelayTimer.current);
      clearTimeout(nextPromptDelayTimer.current);
    };
  }, [queries, contextList]);

  useEffect(() => {
    // Scroll to the last query.
    // HACK: use refs / callback to the last element.
    const timer = setTimeout(() => {
      const queryDivs = document.getElementsByClassName("nl-query");
      if (queryDivs.length > 1) {
        queryDivs[queryDivs.length - 1].scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "start",
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [queries]);

  function addContext(context: any, idx: number) {
    // Always assume we are appending context for the latest query.
    if (idx !== queries.length - 1) {
      console.error(
        "setting context for wrong length: idx:%i != queries:%i",
        idx,
        queries.length
      );
      return;
    }
    const newList = [...contextList];
    newList.push(context);
    setContextList(newList);
  }

  function getContextHistory(i: number): any {
    if (i > 0 && i - 1 < contextList.length) {
      return contextList[i - 1];
    } else {
      return [];
    }
  }

  function onQueryItemClick(queries: string[]) {
    urlPrompts.current.unshift(...queries);
    autoRun.current = true;
    delayDisabled.current = true;
    inputNextPrompt(false /* delayStart */);
  }

  const queryResults = queries.map((q, i) => {
    return (
      <QueryResult
        key={i}
        queryIdx={i}
        query={q}
        indexType={indexType}
        detector={detector}
        placeDetector={placeDetector}
        contextHistory={getContextHistory(i)}
        addContextCallback={addContext}
        showData={false}
        demoMode={demoMode.current}
      ></QueryResult>
    );
  });

  const isStartState =
    false; /* Temporarily remove query history: queries.length === 0; */

  return (
    <>
      <Sidebar queries={queries} onQueryItemClick={onQueryItemClick} />
      <div className="context-container">
        <div className="context-body" id="results-thread-container">
          <QueryWelcome onQueryItemClick={onQueryItemClick} />
          {queryResults}
        </div>
        <div
          className="context-search"
          id={`search-section-container${isStartState ? "-center" : "-bottom"}`}
        >
          <QuerySearch
            queries={queries}
            onQuerySearched={(q) => {
              setQueries([...queries, q]);
            }}
            indexType={indexType}
            detector={detector}
            placeDetector={placeDetector}
            setIndexType={setIndexType}
            setDetector={setDetector}
            setPlaceDetector={setPlaceDetector}
          />
          {isStartState && <QueryHistory onItemClick={onQueryItemClick} />}
        </div>
      </div>
    </>
  );
}
