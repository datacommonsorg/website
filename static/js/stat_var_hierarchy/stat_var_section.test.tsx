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
import React from "react";

import { StatVarInfo } from "../shared/types";
import { StatVarSection } from "./stat_var_section";

Enzyme.configure({ adapter: new Adapter() });
test("getPrefix", () => {
  const emptySvInfo = {
    id: "",
    specializedEntity: "",
    displayName: "",
    hasData: true,
  };
  const wrapper = shallow(
    <StatVarSection
      path={[]}
      data={[]}
      pathToSelection={[]}
      entities={[]}
      highlightedStatVar={null}
    />
  );
  const cases: {
    svList: StatVarInfo[];
    wantPrefix: string;
  }[] = [
    {
      svList: [],
      wantPrefix: "",
    },
    {
      svList: [{ ...emptySvInfo, displayName: "test" }],
      wantPrefix: "",
    },
    {
      svList: [
        { ...emptySvInfo, displayName: "test" },
        { ...emptySvInfo, displayName: "abc" },
      ],
      wantPrefix: "",
    },
    {
      svList: [
        { ...emptySvInfo, displayName: "test" },
        { ...emptySvInfo, displayName: "test123" },
      ],
      wantPrefix: "",
    },
    {
      svList: [
        { ...emptySvInfo, displayName: "test abc" },
        { ...emptySvInfo, displayName: "tester 123" },
      ],
      wantPrefix: "",
    },
    {
      svList: [
        { ...emptySvInfo, displayName: "test abc" },
        { ...emptySvInfo, displayName: "test 123" },
      ],
      wantPrefix: "test",
    },
  ];
  for (const c of cases) {
    const resultPrefix = wrapper.instance().getPrefix(c.svList);
    try {
      expect(resultPrefix).toEqual(c.wantPrefix);
    } catch (e) {
      const svNames = c.svList.map((sv) => sv.displayName);
      console.log(
        `Got different prefix string than expected for list of sv: ${svNames}>`
      );
      throw e;
    }
  }
});
