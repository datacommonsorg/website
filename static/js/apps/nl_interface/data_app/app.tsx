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
 * Main component for the data version of the NL interface.
 */

import React, { useEffect, useRef, useState } from "react";

import { getUrlToken } from "../../../tools/stat_var/util";
import { QueryResult } from "../query_result";
import { QuerySearch } from "../query_search";

export function App(): JSX.Element {
  const [queries, setQueries] = useState<string[]>([]);
  const [contextList, setContextList] = useState<any[]>([]);
  const autoRun = useRef(!!getUrlToken("a"));
  const indexType = useRef(getUrlToken("idx"));
  const useLLM = useRef(!!getUrlToken("llm"));
  const urlPrompts = useRef(getUrlPrompts());

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
      // Assume one url prompt at a time
      return [urlPromptsVal];
    }
    return [];
  }

  function inputNextPrompt(): void {
    const prompt = urlPrompts.current.shift();
    if (!prompt) {
      return;
    }
    let inputLength = 1;
    while (inputLength <= prompt.length) {
      updateSearchInput(prompt.substring(0, inputLength));
      if (inputLength === prompt.length) {
        if (autoRun.current) {
          executeSearch();
        }
        return;
      }
      inputLength++;
    }
  }

  useEffect(() => {
    // If there are prompts in the url, automatically input the first prompt
    // into the search box.
    // If autoRun is enabled, runs every prompt (';' separated) from the url.
    // TODO: Do this by going through state/props instead of directly
    // manipulating the DOM.
    if (urlPrompts.current.length) {
      inputNextPrompt();
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

  const queryResults = queries.map((q, i) => {
    return (
      <QueryResult
        key={i}
        queryIdx={i}
        query={q}
        indexType={indexType.current}
        useLLM={useLLM.current}
        contextHistory={getContextHistory(i)}
        addContextCallback={addContext}
        showData={true}
      ></QueryResult>
    );
  });

  const isStartState =
    false; /* Temporarily remove query history: queries.length === 0; */

  return (
    <>
      <div id="results-thread-container">{queryResults}</div>
      <div
        id={`search-section-container${isStartState ? "-center" : "-bottom"}`}
      >
        <QuerySearch
          queries={queries}
          onQuerySearched={(q) => {
            setQueries([...queries, q]);
            // If there are prompts from the url, input the next one
            if (urlPrompts.current.length) {
              inputNextPrompt();
            }
          }}
        />
      </div>
    </>
  );
}
