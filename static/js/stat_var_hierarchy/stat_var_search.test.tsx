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

import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import Enzyme, { shallow } from "enzyme";
import _ from "lodash";
import React from "react";

import { StatVarHierarchySearch } from "./stat_var_search";

Enzyme.configure({ adapter: new Adapter() });
test("getResultCountString", () => {
  const wrapper = shallow(
    <StatVarHierarchySearch entities={[]} onSelectionChange={_.noop} />
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
