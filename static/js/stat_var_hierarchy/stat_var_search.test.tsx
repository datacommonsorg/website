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

import Enzyme, { shallow } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import _ from "lodash";
import React from "react";

import { StatVarHierarchySearch } from "./stat_var_search";

Enzyme.configure({ adapter: new Adapter() });

test("getHighlightedJSX", () => {
  const wrapper = shallow(
    <StatVarHierarchySearch places={[]} onSelectionChange={_.noop} />
  );
  const cases: {
    s: string;
    matches: string[];
    wantElementContent: string[];
    wantHighlightedElements: Set<number>;
  }[] = [
    {
      s: "test",
      matches: ["match"],
      wantElementContent: ["test"],
      wantHighlightedElements: new Set(),
    },
    {
      s: "test match test",
      matches: ["match"],
      wantElementContent: ["test ", "match", " test"],
      wantHighlightedElements: new Set([1]),
    },
    {
      s: "test match match test",
      matches: ["match"],
      wantElementContent: ["test ", "match", " ", "match", " test"],
      wantHighlightedElements: new Set([1, 3]),
    },
    {
      s: "test match1match2 test test",
      matches: ["match1", "match2"],
      wantElementContent: ["test ", "match1", "", "match2", " test test"],
      wantHighlightedElements: new Set([1, 3]),
    },
    {
      s: "test match123 test",
      matches: ["match"],
      wantElementContent: ["test ", "match", "123 test"],
      wantHighlightedElements: new Set([1]),
    },
    {
      s: "test match1 matchABC test",
      matches: ["match1", "match2"],
      wantElementContent: ["test ", "match1", " matchABC test"],
      wantHighlightedElements: new Set([1]),
    },
    {
      s: "test match1) matchABC test",
      matches: ["match1)", "match2"],
      wantElementContent: ["test ", "match1)", " matchABC test"],
      wantHighlightedElements: new Set([1]),
    },
  ];
  for (const c of cases) {
    const highlightedResult = wrapper
      .instance()
      .getHighlightedJSX("test", c.s, c.matches);
    const resultElements = highlightedResult.props.children;
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

test("getResultCountString", () => {
  const wrapper = shallow(
    <StatVarHierarchySearch places={[]} onSelectionChange={_.noop} />
  );
  const cases: {
    numSv: number;
    numSvg: number;
    wantString: string;
  }[] = [
    {
      numSv: 3,
      numSvg: 2,
      wantString: "Matches 2 groups and 3 statistical variables",
    },
    {
      numSv: 1,
      numSvg: 2,
      wantString: "Matches 2 groups and 1 statistical variable",
    },
    {
      numSv: 3,
      numSvg: 1,
      wantString: "Matches 1 group and 3 statistical variables",
    },
    {
      numSv: 3,
      numSvg: 0,
      wantString: "Matches 3 statistical variables",
    },
    {
      numSv: 1,
      numSvg: 0,
      wantString: "Matches 1 statistical variable",
    },
    {
      numSv: 0,
      numSvg: 3,
      wantString: "Matches 3 groups",
    },
    {
      numSv: 0,
      numSvg: 1,
      wantString: "Matches 1 group",
    },
  ];
  for (const c of cases) {
    const resultCountString = wrapper
      .instance()
      .getResultCountString(c.numSvg, c.numSv);
    try {
      expect(resultCountString).toEqual(c.wantString);
    } catch (e) {
      console.log(
        `Got different result count string than expected for <numSvg: ${c.numSvg}, numSv: ${c.numSv}>`
      );
      throw e;
    }
  }
});
