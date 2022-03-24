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

import { getHighlightedJSX } from "./search_utils";

test("getHighlightedJSX", () => {
  const cases: {
    s: string;
    matches: string[];
    wantElementContent: string[];
    wantHighlightedElements: Set<number>;
  }[] = [
    {
      matches: ["match"],
      s: "test",
      wantElementContent: ["test"],
      wantHighlightedElements: new Set(),
    },
    {
      matches: ["match"],
      s: "test match test",
      wantElementContent: ["test ", "match", " test"],
      wantHighlightedElements: new Set([1]),
    },
    {
      matches: ["match"],
      s: "test match match test",
      wantElementContent: ["test ", "match", " ", "match", " test"],
      wantHighlightedElements: new Set([1, 3]),
    },
    {
      matches: ["match1", "match2"],
      s: "test match1match2 test test",
      wantElementContent: ["test ", "match1", "", "match2", " test test"],
      wantHighlightedElements: new Set([1, 3]),
    },
    {
      matches: ["match"],
      s: "test match123 test",
      wantElementContent: ["test ", "match", "123 test"],
      wantHighlightedElements: new Set([1]),
    },
    {
      matches: ["match1", "match2"],
      s: "test match1 matchABC test",
      wantElementContent: ["test ", "match1", " matchABC test"],
      wantHighlightedElements: new Set([1]),
    },
    {
      matches: ["match1)", "match2"],
      s: "test match1) matchABC test",
      wantElementContent: ["test ", "match1)", " matchABC test"],
      wantHighlightedElements: new Set([1]),
    },
  ];
  for (const c of cases) {
    const result = getHighlightedJSX("", c.s, c.matches);
    const resultElements = result.props.children;
    try {
      expect(resultElements.length).toEqual(c.wantElementContent.length);
      let numHighlighted = 0;
      for (let i = 0; i < resultElements.length; i++) {
        if (c.wantHighlightedElements.has(i)) {
          expect(resultElements[i].type).toEqual("b");
          const elementContent = resultElements[i].props.children;
          expect(elementContent).toEqual(c.wantElementContent[i]);
          numHighlighted++;
        } else {
          expect(resultElements[i]).toEqual(c.wantElementContent[i]);
        }
      }
      expect(numHighlighted).toEqual(c.wantHighlightedElements.size);
    } catch (e) {
      console.log(`Failed for case with string: ${c.s}`);
      throw e;
    }
  }
});
