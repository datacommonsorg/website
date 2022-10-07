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

import { ValueMap } from "../types";
import { processValueMapFile } from "./file_processing";

test("processValueMapFile", () => {
  const cases: {
    name: string;
    rows: string[][];
    expectedSkippedRows: number[];
    expectedValueMap: ValueMap;
  }[] = [
    {
      name: "empty rows",
      rows: [],
      expectedSkippedRows: [],
      expectedValueMap: {},
    },
    {
      name: "no skipped rows",
      rows: [
        ["test", "test1"],
        ["test2", "test3"],
      ],
      expectedSkippedRows: [],
      expectedValueMap: {
        test: "test1",
        test2: "test3",
      },
    },
    {
      name: "contains row with more than 2 values",
      rows: [
        ["test", "test1"],
        ["test1", "test2", "test3"],
      ],
      expectedSkippedRows: [1],
      expectedValueMap: {
        test: "test1",
      },
    },
    {
      name: "contains row with only 1 value",
      rows: [["test"], ["test1", "test2"]],
      expectedSkippedRows: [0],
      expectedValueMap: {
        test1: "test2",
      },
    },
  ];

  for (const c of cases) {
    const result = processValueMapFile(c.rows);
    try {
      expect(result.skippedRows).toEqual(c.expectedSkippedRows);
      expect(result.valueMap).toEqual(c.expectedValueMap);
    } catch (e) {
      console.log("test failed for: " + c.name);
      throw e;
    }
  }
});
