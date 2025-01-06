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

import * as dd from "./detect_date";

test("dateDetectionBasics", () => {
  const got = dd.detectColumnHeaderDate("2020-10-01");
  expect(got).toBe(true);
});

test("dateHeaderDetectionBasics", () => {
  const cases: {
    name: string;
    input: string;
    expected: boolean;
  }[] = [
    // true cases.
    {
      name: "YYYY-MM-DD",
      input: "2020-10-01",
      expected: true,
    },
    {
      name: "YYYY",
      input: "2022",
      expected: true,
    },
    {
      name: "YYYY-MM",
      input: "2022-08",
      expected: true,
    },
    {
      name: "MM-DD",
      input: "12-31",
      expected: true,
    },
    {
      name: "text",
      input: "March 20, 2020",
      expected: true,
    },
    // false cases.
    {
      name: "YYYYMMDD",
      input: "20201001",
      expected: false,
    },
    {
      name: "YYYY-DD",
      input: "2020-20",
      expected: false,
    },
    {
      name: "text incorrect",
      input: "M 12, 2020",
      expected: false,
    },
  ];
  for (const c of cases) {
    const got = dd.detectColumnHeaderDate(c.input);
    expect(got).toBe(c.expected);
  }
});

test("dateColumnDetection", () => {
  const cases: {
    name: string;
    input: Array<string>;
    expected: boolean;
  }[] = [
    {
      name: "100-percent",
      input: ["2020-10-01", "2022-11", "1999"],
      expected: true,
    },
    {
      name: "greater-90-percent",
      input: [
        "2022",
        "2021",
        "2020",
        "2019",
        "2018",
        "2017",
        "2016",
        "2015",
        "2014",
        "2013",
        "2012",
        "2011",
        "2010",
        "2009",
        "2008",
        "blah",
      ],
      expected: true,
    },
    {
      name: "less-90-percent",
      input: [
        "2022",
        "2021",
        "2020",
        "2019",
        "2018",
        "2017",
        "2016",
        "2015",
        "2014",
        "2013",
        "2012",
        "2011",
        "2010",
        "blah",
        "blah",
        "blah",
      ],
      expected: false,
    },
    {
      name: "0-percent",
      input: [],
      expected: false,
    },
  ];
  for (const c of cases) {
    const got = dd.detectColumnWithDates("", c.input);
    expect(got).toBe(c.expected);
  }
});
