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

import React, { useCallback, useEffect, useRef, useState } from "react";

import { useStoreActions, useStoreState } from "./app_state";
import { QueryResult } from "./query_result";
import { QuerySearch } from "./query_search";
import { QueryWelcome } from "./query_welcome";

const CHARACTER_INPUT_INTERVAL = 50;
const PROMPT_SEARCH_DELAY = 1000;

export function QueryContext(): JSX.Element {
  const config = useStoreState((s) => s.config);
  const {
    autoPlayAutoRunQuery,
    autoPlayAutoShowQueryDelay,
    autoPlayCurrentQueryIndex,
    autoPlayManuallyShowQuery,
    autoPlayDisableTypingAnimation,
    urlPrompts,
    currentNlQueryContextId,
  } = config;
  const [executingAutoPlayQueryIndex, setExecutingAutoPlayQueryIndex] =
    useState<number>(-1);
  const currentNlQueryContext = useStoreState(
    (s) => s.nlQueryContexts[currentNlQueryContextId]
  );
  const nlQueryHistory = useStoreState((s) => {
    if (!currentNlQueryContext) {
      return [];
    }
    return currentNlQueryContext.nlQueryIds.map(
      (nlQueryId) => s.nlQueries[nlQueryId]
    );
  });
  const currentNlQueries = useStoreState((s) =>
    (currentNlQueryContext?.nlQueryIds || []).map(
      (nlQueryId) => s.nlQueries[nlQueryId]
    )
  );
  const search = useStoreActions((a) => a.search);
  const [autoRunQuery, setAutoRunQuery] = useState("");

  // Timer used to input characters from a single prompt with
  // CHARACTER_INPUT_INTERVAL ms between each character.
  const inputIntervalTimer = useRef(null);
  // Timer used to wait NEXT_PROMPT_DELAY ms before inputting a new prompt.
  const nextPromptDelayTimer = useRef(null);
  // Timer used to wait PROMPT_SEARCH_DELAY ms before searching for an inputted
  // prompt.
  const searchDelayTimer = useRef(null);

  const inputNextPrompt = useCallback(
    (delayStart: boolean): void => {
      const prompt = urlPrompts[autoPlayCurrentQueryIndex];
      //const nextPromptDelay = 0;
      const promptSearchDelay = autoPlayDisableTypingAnimation
        ? 0
        : PROMPT_SEARCH_DELAY;
      const nextPromptDelay =
        delayStart &&
        !autoPlayDisableTypingAnimation &&
        !autoPlayManuallyShowQuery
          ? autoPlayAutoShowQueryDelay
          : 0;
      nextPromptDelayTimer.current = setTimeout(() => {
        // If delay is disabled, input the whole prompt at once
        let inputLength = autoPlayDisableTypingAnimation ? prompt.length : 1;
        inputIntervalTimer.current = setInterval(() => {
          if (inputLength <= prompt.length) {
            setAutoRunQuery(prompt.substring(0, inputLength));
          }
          if (inputLength === prompt.length) {
            clearInterval(inputIntervalTimer.current);
            // If on autoPlayAutoRunQuery, search for the current input after
            // PROMPT_SEARCH_DELAY ms.
            if (autoPlayAutoRunQuery) {
              searchDelayTimer.current = setTimeout(() => {
                setAutoRunQuery("");
                search({
                  config,
                  nlQueryContext: currentNlQueryContext,
                  nlQueryHistory,
                  query: prompt,
                });
              }, promptSearchDelay);
            }
            return;
          }
          inputLength++;
        }, CHARACTER_INPUT_INTERVAL);
      }, nextPromptDelay);
    },
    [
      autoPlayCurrentQueryIndex,
      autoPlayDisableTypingAnimation,
      autoPlayAutoShowQueryDelay,
      autoPlayAutoRunQuery,
      config,
      currentNlQueryContext,
      nlQueryHistory,
      urlPrompts,
      search,
      setAutoRunQuery,
    ]
  );

  useEffect(() => {
    // If there are url prompts that have not been searched, input the next
    // url prompt into the search box when the last query's data fetch has
    // completed.
    if (executingAutoPlayQueryIndex === autoPlayCurrentQueryIndex) {
      return;
    }
    if (autoPlayCurrentQueryIndex < urlPrompts.length) {
      // delay inputting the prompt if it's not the first query.
      setExecutingAutoPlayQueryIndex(autoPlayCurrentQueryIndex);
      inputNextPrompt(
        autoPlayCurrentQueryIndex !== 0 &&
          !autoPlayManuallyShowQuery /* delayStart */ // TODO
      );
    }
  }, [
    autoPlayCurrentQueryIndex,
    autoPlayManuallyShowQuery,
    executingAutoPlayQueryIndex,
    urlPrompts,
    inputNextPrompt,
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // When component unmounts, clear all timers
      clearInterval(inputIntervalTimer.current);
      clearTimeout(searchDelayTimer.current);
      clearTimeout(nextPromptDelayTimer.current);
    };
  }, [inputIntervalTimer, searchDelayTimer, nextPromptDelayTimer]);

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
          <QuerySearch query={autoRunQuery} />
        </div>
      </div>
    </>
  );
}
