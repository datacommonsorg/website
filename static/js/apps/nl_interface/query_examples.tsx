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
 * Component for a list of example queries
 */

import axios from "axios";
import Papa from "papaparse";
import React, { useEffect, useState } from "react";

import { getUrlToken } from "../../utils/url_utils";

interface QueryExamplesPropType {
  // Callback function for exmple item clicks.
  onItemClick: (queries: string[]) => void;
}

export function QueryExamples(props: QueryExamplesPropType): JSX.Element {
  const [csvData, setCsvData] = useState<Array<Array<string>>>();

  function fetchData(): void {
    axios.get("/data/nl/topics.csv").then((resp) => {
      Papa.parse(resp.data, {
        complete: (result) => {
          setCsvData(result["data"]);
        },
        worker: true,
      });
    });
  }

  useEffect(() => {
    fetchData();
  }, []);

  const topic = getUrlToken("topic");
  if (!topic) {
    return null;
  }
  const examples = [];
  if (csvData) {
    for (let row of csvData.slice(1)) {
      row = row.map((x) => x.trim().toLowerCase());
      if (row[1] && row[0] === topic && row[2] === "yes") {
        examples.push(row[1]);
      }
    }
  }
  return (
    <div className="container nl-examples">
      <h3>Try one of these queries</h3>
      <div className="examples-container">
        {examples.map((query, i) => {
          return (
            <div
              className="example-item"
              key={i}
              onClick={() => props.onItemClick([query])}
              title={query}
            >
              {query}
            </div>
          );
        })}
      </div>
    </div>
  );
}
