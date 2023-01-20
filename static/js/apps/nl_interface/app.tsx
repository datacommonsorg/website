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

import React, { useEffect, useState } from "react";
import { isNLInterfaceNext } from "../../utils/nl_interface_utils";

import { QueryResult } from "./query_result";
import { QuerySearch } from "./query_search";

export function App(): JSX.Element {
  const [queries, setQueries] = useState<string[]>([]);
  const [contextList, setContextList] = useState<any[]>([]);

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
    if (isNLInterfaceNext()) {
      // The context list is handled entirely by the server.
      setContextList(context);
      return;
    }
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

  function getContext(i: number) {
    if (isNLInterfaceNext()) {
      return contextList;
    } else {
      return contextList.slice(0, i);
    }
  }

  const queryResults = queries.map((q, i) => (
    <QueryResult
      key={i}
      queryIdx={i}
      query={q}
      contextHistory={getContext(i)}
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
        }}
      />
    </div>
  );
}
