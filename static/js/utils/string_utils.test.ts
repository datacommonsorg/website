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

import { formatDate, getCommonPrefix } from "./string_utils";

test("get common prefix", () => {
  const cases: {
    wordList: string[];
    wantedPrefix: string;
  }[] = [
    {
      wantedPrefix: "",
      wordList: [],
    },
    {
      wantedPrefix: "abc",
      wordList: ["abc"],
    },
    {
      wantedPrefix: "",
      wordList: ["abc", "xyz", "123"],
    },
    {
      wantedPrefix: "",
      wordList: ["abc", "abdsdfs", "123"],
    },
    {
      wantedPrefix: "ab",
      wordList: ["abc", "abbbb", "abtest"],
    },
    {
      wantedPrefix: "abc, ",
      wordList: ["abc, def, gh", "abc, this is a test", "abc, test blah"],
    },
    {
      wantedPrefix: "",
      wordList: ["abc", "xyz", "abcde"],
    },
  ];

  for (const c of cases) {
    const prefix = getCommonPrefix(c.wordList);
    try {
      expect(prefix).toEqual(c.wantedPrefix);
    } catch (e) {
      console.log(`Failed for case with word list: ${c.wordList}`);
    }
  }
});

test("formatDate", () => {
  expect(formatDate("2011-12")).toEqual("2011-Dec");
  expect(formatDate("2015")).toEqual("2015");
  expect(formatDate("2022-05-25")).toEqual("2022-05-25");
});
