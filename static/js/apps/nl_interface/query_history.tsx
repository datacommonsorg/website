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

const MAX_QUERY_COUNT = 10;

interface QueryHistoryProps {
  // Callback function for history item clicks.
  onItemClick: (queries: string[]) => void;
}

export function QueryHistory(props: QueryHistoryProps): JSX.Element {
  const [history, setHistory] = useState<string[][] | null>();

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      {!_.isEmpty(history) && (
        <div className="container nl-history">
          <h3>Or try one of these recent queries:</h3>
          {history.map((queries, i) => {
            return (
              <div
                className="history-item"
                key={i}
                onClick={() => props.onItemClick(history[i])}
                title={queries.join(", ")}
              >
                {queries[0]}
                {queries.length > 1 ? ", ..." : ""}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  function fetchData(): void {
    axios.get(`/api/nl/history`).then((resp) => {
      const result = [];
      const seen = new Set();
      for (const item of resp.data) {
        const queryList = item["query_list"] || [];
        const processedQueryList = queryList.map((query) => _.unescape(query));
        if (
          processedQueryList === undefined ||
          processedQueryList.length === 0 ||
          seen.has(processedQueryList[0])
        ) {
          continue;
        }
        seen.add(processedQueryList[0]);
        result.push(processedQueryList);
        if (result.length == MAX_QUERY_COUNT) {
          break;
        }
      }
      setHistory(result);
    });
  }
}
