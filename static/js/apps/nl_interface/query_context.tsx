/**
 * Copyright 2023 Google LLC
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
 * NL Query context panel
 */

import React, { useEffect, useRef } from "react";

import { useStoreState } from "./app_state";
import { QueryResult } from "./query_result";
import { QuerySearch } from "./query_search";
import { QueryWelcome } from "./query_welcome";

const CHARACTER_INPUT_INTERVAL = 50;
const PROMPT_SEARCH_DELAY = 1000;
const NEXT_PROMPT_DELAY = 5000;

interface QueryContextProps {}
export function QueryContext(props: QueryContextProps): JSX.Element {
  const currentNlQueryContextId = useStoreState(
    (s) => s.config.currentNlQueryContextId
  );
  const prevCurrentNlQueryContextId = useRef<string>(currentNlQueryContextId);
  const currentNlQueryContext = useStoreState(
    (s) => s.nlQueryContexts[currentNlQueryContextId]
  );
  const currentNlQueries = useStoreState((s) =>
    (currentNlQueryContext?.nlQueryIds || []).map(
      (nlQueryId) => s.nlQueries[nlQueryId]
    )
  );
  const latestNlQuery =
    currentNlQueries.length > 0
      ? currentNlQueries[currentNlQueries.length - 1]
      : null;

  // If autoRun is enabled, runs every prompt (';' separated) from the url.
  const autoRun = useStoreState((s) => s.config.autoRun);
  const delayDisabled = useStoreState((s) => s.config.delayDisabled);
  const urlPrompts = useStoreState((s) => s.config.urlPrompts);

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

  function inputNextPrompt(delayStart: boolean): void {
    const prompt = urlPrompts.shift();
    if (!prompt) {
      return;
    }
    const nextPromptDelay =
      delayStart && !delayDisabled ? NEXT_PROMPT_DELAY : 0;
    const promptSearchDelay = delayDisabled ? 0 : PROMPT_SEARCH_DELAY;
    nextPromptDelayTimer.current = setTimeout(() => {
      // If delay is disabled, input the whole prompt at once
      let inputLength = delayDisabled ? prompt.length : 1;
      inputIntervalTimer.current = setInterval(() => {
        if (inputLength <= prompt.length) {
          updateSearchInput(prompt.substring(0, inputLength));
        }
        if (inputLength === prompt.length) {
          clearInterval(inputIntervalTimer.current);
          // If on autorun, search for the current input after
          // PROMPT_SEARCH_DELAY ms.
          if (autoRun) {
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
    if (urlPrompts.length && (!latestNlQuery || !latestNlQuery.isLoading)) {
      // delay inputting the prompt if it's not the first query.
      inputNextPrompt(latestNlQuery !== null /* delayStart */);
    }
    return () => {
      // When component unmounts, clear all timers
      clearInterval(inputIntervalTimer.current);
      clearTimeout(searchDelayTimer.current);
      clearTimeout(nextPromptDelayTimer.current);
    };
  }, [latestNlQuery, urlPrompts]);

  return (
    <>
      <div className="context-container">
        <div className="context-body" id="results-thread-container">
          <QueryWelcome />
          {currentNlQueries.map((q, i) => (
            <QueryResult key={i} queryIdx={i} nlQueryId={q.id}></QueryResult>
          ))}
        </div>
        <div
          className="context-search"
          id={`search-section-container-bottom"}`}
        >
          <QuerySearch />
        </div>
      </div>
    </>
  );
}
