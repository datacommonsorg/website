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

import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { getUrlToken } from "../../tools/stat_var/util";
import { QueryResult } from "./query_result";
import { QuerySearch } from "./query_search";

const CHARACTER_INPUT_INTERVAL = 50;
const PROMPT_SEARCH_DELAY = 1000;
const NEXT_PROMPT_DELAY = 5000;

export function App(): JSX.Element {
  const [queries, setQueries] = useState<string[]>([]);
  const [contextList, setContextList] = useState<any[]>([]);
  const urlPrompts = useRef(getUrlPrompts());
  const autoRun = useRef(getUrlToken("a"));

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
    let pause = delayStart;
    let inputLength = 1;
    setTimeout(() => {
      pause = false;
    }, NEXT_PROMPT_DELAY);
    const inputTimer = setInterval(() => {
      if (pause) {
        return;
      }
      if (inputLength <= prompt.length) {
        updateSearchInput(prompt.substring(0, inputLength));
      }
      if (inputLength === prompt.length) {
        clearInterval(inputTimer);
        return;
      }
      inputLength++;
    }, CHARACTER_INPUT_INTERVAL);
  }

  useEffect(() => {
    if (!autoRun.current) {
      // TODO (chejennifer): See if there's a way to clean up the query input
      // functions & share the code for autorun vs. not
      inputNextPrompt(false);
    }
  }, []);

  useEffect(() => {
    // Runs each prompt (';' separated) 10s apart.
    // TODO: Do this by going through state/props instead of directly
    // manipulating the DOM.
    if (autoRun.current) {
      if (urlPrompts.current.length) {
        let prompt = urlPrompts.current.shift();
        let inputLength = 1;
        let pauseQueryInput = false;
        const inputTimer = setInterval(() => {
          if (!prompt) {
            clearInterval(inputTimer);
            return;
          }
          if (pauseQueryInput) {
            return;
          }
          if (inputLength <= prompt.length) {
            updateSearchInput(prompt.substring(0, inputLength));
          }
          if (inputLength === prompt.length) {
            pauseQueryInput = true;
            setTimeout(() => {
              // Search for the current input after PROMPT_SEARCH_DELAY ms.
              executeSearch();
              setTimeout(() => {
                // Start typing the input for the next prompt after
                // NEXT_PROMPT_DELAY ms.
                pauseQueryInput = false;
                prompt = urlPrompts.current.shift();
                inputLength = 1;
              }, NEXT_PROMPT_DELAY);
            }, PROMPT_SEARCH_DELAY);
          }
          inputLength++;
        }, CHARACTER_INPUT_INTERVAL);
        return () => clearInterval(inputTimer);
      }
    }
  }, []);

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

  const queryResults = queries.map((q, i) => (
    <QueryResult
      key={i}
      queryIdx={i}
      query={q}
      contextHistory={getContextHistory(i)}
      addContextCallback={addContext}
    ></QueryResult>
  ));

  return (
    <div id="dc-nl-interface">
      <div id="results-thread-container">{queryResults}</div>

      <QuerySearch
        queries={queries}
        onQuerySearched={(q) => {
          setQueries([...queries, q]);
          if (!autoRun.current) {
            inputNextPrompt(true);
          }
        }}
      />
    </div>
  );
}
