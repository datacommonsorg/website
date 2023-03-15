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

import {
  formatString,
  getStatVarName,
  ReplacementStrings,
} from "../tile_utils";

test("formatString", () => {
  const cases: {
    s: string;
    rs: ReplacementStrings;
    expected: string;
  }[] = [
    {
      s: "test abc",
      rs: {
        place: "country/USA",
        date: "2020",
      },
      expected: "test abc",
    },
    {
      s: "test ${abc}",
      rs: {
        place: "country/USA",
        date: "2020",
      },
      expected: "test ${abc}",
    },
    {
      s: "test ${place}",
      rs: {
        place: "",
        date: "2020",
      },
      expected: "test ",
    },
    {
      s: "test ${place} ${date}",
      rs: {
        place: "country/USA",
        date: "2020",
      },
      expected: "test country/USA 2020",
    },
  ];

  for (const c of cases) {
    const formattedString = formatString(c.s, c.rs);
    try {
      expect(formattedString).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case with string: ${c.s}`);
      throw e;
    }
  }
});

test("getStatVarName", () => {
  const svSpec = {
    statVar: "sv_1",
    denom: "Count_Person",
    unit: "%",
    scaling: 100,
    log: false,
    name: "Test Sv 1",
  };
  const svSpecNoName = {
    statVar: "sv_2",
    denom: "",
    unit: "",
    scaling: 1,
    log: false,
  };
  const cases: {
    svDcid: string;
    isPC: boolean;
    expected: string;
  }[] = [
    {
      svDcid: svSpec.statVar,
      isPC: false,
      expected: svSpec.name,
    },
    {
      svDcid: svSpec.statVar,
      isPC: true,
      expected: svSpec.name,
    },
    {
      svDcid: svSpecNoName.statVar,
      isPC: false,
      expected: svSpecNoName.statVar,
    },
    {
      svDcid: svSpecNoName.statVar,
      isPC: true,
      expected: `${svSpecNoName.statVar} Per Capita`,
    },
    {
      svDcid: "dcidWithNoSpec",
      isPC: false,
      expected: "dcidWithNoSpec",
    },
    {
      svDcid: "dcidWithNoSpec",
      isPC: true,
      expected: "dcidWithNoSpec Per Capita",
    },
  ];

  for (const c of cases) {
    const statVarName = getStatVarName(
      c.svDcid,
      [svSpec, svSpecNoName],
      c.isPC
    );
    try {
      expect(statVarName).toEqual(c.expected);
    } catch (e) {
      console.log(
        `Failed for case with svDcid: ${c.svDcid} and isPC: ${c.isPC}`
      );
      throw e;
    }
  }
});
