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
 * Componenet for the query history
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";

const MAX_QUERY_COUNT = 20;

export function QueryHistory(): JSX.Element {
  const [history, setHistory] = useState<string[] | null>();

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      {!_.isEmpty(history) && (
        <div className="container nl-history">
          <h1>Recent queries</h1>
          {history.map((query, i) => {
            return <div key={i}>{query}</div>;
          })}
        </div>
      )}
    </>
  );

  function fetchData(): void {
    axios.get(`/nl/history`).then((resp) => {
      const result = [];
      for (const item of resp.data) {
        const queryList = item["query_list"];
        if (
          queryList === undefined ||
          queryList.length === 0 ||
          result.includes(queryList[0])
        ) {
          continue;
        }
        result.push(queryList[0]);
        if (result.length == MAX_QUERY_COUNT) {
          break;
        }
      }
      setHistory(result);
    });
  }
}
