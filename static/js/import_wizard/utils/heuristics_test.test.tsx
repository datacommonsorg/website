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
import _ from "lodash";

import {
  Column,
  DCProperty,
  MappedThing,
  Mapping,
  MappingType,
  MappingVal,
  RowNumber,
} from "../types";
import * as dd from "./detect_date";
import { PlaceDetector } from "./detect_place";
import * as heuristics from "./heuristics";

test("countryDetection", () => {
  const pDet = new PlaceDetector();

  const cols = new Map<number, Array<string>>([
    [0, ["USA", "ITA"]], // This column should be detected as a Place (country).
    [1, ["fdf"]],
    [2, ["dfds"]],
  ]);
  const colCountry = { id: "a0", header: "a", columnIdx: 0 };
  const colOther1 = { id: "a0", header: "a", columnIdx: 1 };
  const colOther2 = { id: "a0", header: "a", columnIdx: 2 };

  const csv = {
    orderedColumns: [colCountry, colOther1, colOther2],
    columnValuesSampled: cols,
    rowsForDisplay: new Map<RowNumber, Array<string>>(),
  };

  const expected: Mapping = new Map<MappedThing, MappingVal>([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: colCountry,
        placeProperty: {
          dcid: "countryAlpha3Code",
          displayName: "Alpha 3 Code",
        },
        placeType: { dcid: "Country", displayName: "Country" },
      },
    ],
  ]);

  const got = heuristics.getPredictions(csv, pDet);
  expect(got).toStrictEqual(expected);
});

test("countryDetection-twocolumns", () => {
  const pDet = new PlaceDetector();

  const cols = new Map<number, Array<string>>([
    // One of the two columns below should be detected. They are both countries.
    [0, ["USA", "ITA"]],
    [1, ["USA"]],
    [2, ["dfds"]],
  ]);

  const colCountry = { id: "a0", header: "a", columnIdx: 0 };
  const colCountryOther = { id: "a0", header: "a", columnIdx: 1 };
  const colOther2 = { id: "a0", header: "a", columnIdx: 2 };

  const csv = {
    orderedColumns: [colCountry, colCountryOther, colOther2],
    columnValuesSampled: cols,
    rowsForDisplay: new Map<RowNumber, Array<string>>(),
  };

  const got = heuristics.getPredictions(csv, pDet).get(MappedThing.PLACE);
  expect(got.type).toStrictEqual(MappingType.COLUMN);
  expect(got.placeProperty).toStrictEqual({
    dcid: "countryAlpha3Code",
    displayName: "Alpha 3 Code",
  });
  expect(got.placeType).toStrictEqual({
    dcid: "Country",
    displayName: "Country",
  });
  expect(got.column.header).toStrictEqual("a");
});

test("countryDetectionOrder", () => {
  const pDet = new PlaceDetector();

  const colISO = "iso";
  const colAlpha3 = "alpha3";
  const colNumber = "number";
  // colName does not provide any help with choosing between numeric country
  // codes vs FIPS codes for US states. The default preference is given to
  // country detection.
  const colName = "name";
  const colISOMistake = "isoMistake";

  const colVals = new Map<string, Array<string>>([
    ["iso", ["US", "IT"]],
    ["alpha3", ["USA", "ITA"]],
    ["number", ["840", "380"]],
    ["name", ["United States", "italy "]],
    ["isoMistake", ["U", "ITA"]],
  ]);

  const cases: {
    name: string;
    orderedColNames: Array<string>;
    expectedCol: Column;
    expectedProp: DCProperty;
  }[] = [
    {
      name: "all-properties",
      orderedColNames: [colISO, colAlpha3, colNumber, colName],
      expectedCol: { id: colISO + 0, header: colISO, columnIdx: 0 },
      expectedProp: {
        dcid: "isoCode",
        displayName: "ISO Code",
      },
    },
    {
      name: "iso-missing",
      orderedColNames: [colNumber, colName, colAlpha3],
      expectedCol: { id: colAlpha3 + 2, header: colAlpha3, columnIdx: 2 },
      expectedProp: {
        dcid: "countryAlpha3Code",
        displayName: "Alpha 3 Code",
      },
    },
    {
      name: "iso-alpha3-missing",
      orderedColNames: [colNumber, colName],
      expectedCol: { id: colNumber + 0, header: colNumber, columnIdx: 0 },
      expectedProp: {
        dcid: "countryNumericCode",
        displayName: "Numeric Code",
      },
    },
    {
      name: "only-name",
      orderedColNames: [colName],
      expectedCol: { id: colName + 0, header: colName, columnIdx: 0 },
      expectedProp: {
        dcid: "name",
        displayName: "Name",
      },
    },
    {
      name: "none-found",
      orderedColNames: [],
      expectedCol: null,
      expectedProp: null,
    },
    {
      name: "all-properties-iso-with-typos",
      orderedColNames: [colISOMistake, colAlpha3, colNumber, colName],
      expectedCol: { id: colAlpha3 + 1, header: colAlpha3, columnIdx: 1 },
      expectedProp: {
        dcid: "countryAlpha3Code",
        displayName: "Alpha 3 Code",
      },
    },
  ];
  for (const c of cases) {
    const colValsSampled = new Map<number, Array<string>>();
    const orderedCols = new Array<Column>();
    for (let i = 0; i < c.orderedColNames.length; i++) {
      const cName = c.orderedColNames[i];
      colValsSampled.set(i, colVals.get(cName));

      orderedCols.push({ id: cName + i, header: cName, columnIdx: i });
    }

    const csv = {
      orderedColumns: orderedCols,
      columnValuesSampled: colValsSampled,
      rowsForDisplay: new Map<RowNumber, Array<string>>(),
    };
    const got = heuristics.getPredictions(csv, pDet);
    if (c.expectedProp == null) {
      expect(got.size).toBe(0);
      continue;
    }

    const expected = new Map<MappedThing, MappingVal>([
      [
        MappedThing.PLACE,
        {
          type: MappingType.COLUMN,
          column: c.expectedCol,
          placeProperty: c.expectedProp,
          placeType: { dcid: "Country", displayName: "Country" },
        },
      ],
    ]);
    expect(got).toStrictEqual(expected);
  }
});

test("dateDetection-headers", () => {
  const pDet = new PlaceDetector();

  const cols = new Map<number, Array<string>>([
    [0, []],
    [1, []],
    [2, []],
  ]);
  const dateCol1 = { id: "2020-100", header: "2020-10", columnIdx: 0 };
  const dateCol2 = { id: "2020-111", header: "2020-11", columnIdx: 1 };
  const colOther2 = { id: "a0", header: "a", columnIdx: 2 };

  const csv = {
    orderedColumns: [dateCol1, dateCol2, colOther2],
    columnValuesSampled: cols,
    rowsForDisplay: new Map<RowNumber, Array<string>>(),
  };

  const expected: Mapping = new Map<MappedThing, MappingVal>([
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [dateCol1, dateCol2],
      },
    ],
  ]);

  const got = heuristics.getPredictions(csv, pDet);
  expect(got).toStrictEqual(expected);
});

test("dateDetection-columns", () => {
  const pDet = new PlaceDetector();

  const cols = new Map<number, Array<string>>([
    [0, ["2020-10", "2021-10", "2022-10"]],
    [1, ["random", "random", "random"]],
    [2, ["1", "2", "3"]],
  ]);
  const dateCol = { id: "a0", header: "a", columnIdx: 0 };
  const colOther1 = { id: "b1", header: "b", columnIdx: 1 };
  const colOther2 = { id: "c2", header: "c", columnIdx: 2 };

  const csv = {
    orderedColumns: [dateCol, colOther1, colOther2],
    columnValuesSampled: cols,
    rowsForDisplay: new Map<RowNumber, Array<string>>(),
  };

  const expected: Mapping = new Map<MappedThing, MappingVal>([
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN,
        column: dateCol,
      },
    ],
  ]);

  const got = heuristics.getPredictions(csv, pDet);
  expect(got).toStrictEqual(expected);
});

test("dateDetection-headers-columns", () => {
  const pDet = new PlaceDetector();

  // Column at index 2 is a date column but preference is given to column
  // headers.
  const cols = new Map<number, Array<string>>([
    [0, ["1", "2", "3"]],
    [1, ["random", "random", "random"]],
    [2, ["2020-10", "2021-10", "2022-10"]],
  ]);
  const dateColHeader1 = { id: "2022-100", header: "2022-10", columnIdx: 0 };
  const dateColHeader2 = { id: "20211", header: "2021-10", columnIdx: 1 };
  const dateCol = { id: "c2", header: "c", columnIdx: 2 };

  const csv = {
    orderedColumns: [dateColHeader1, dateColHeader2, dateCol],
    columnValuesSampled: cols,
    rowsForDisplay: new Map<RowNumber, Array<string>>(),
  };

  const expected: Mapping = new Map<MappedThing, MappingVal>([
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [dateColHeader1, dateColHeader2],
      },
    ],
  ]);

  const got = heuristics.getPredictions(csv, pDet);
  expect(got).toStrictEqual(expected);
});

test("comboDetection-date-and-place", () => {
  const pDet = new PlaceDetector();

  // Column at index 2 is a date column but preference is given to column
  // headers.
  // There are also three place columns: one each which correspond to country
  // and state unambiguously while the third one could be either country or
  // state. For the ambiguous column, the header name "state" is provided which
  // will give preference to "State" detection for that column. Therefore, there
  // are two State columns and one Country column detected. In picking one Place
  // column, preference is given to State over Country and within States, the
  // preference is given to fips52AlphaCode over the FIPS (numeric) codes.
  const cols = new Map<number, Array<string>>([
    [0, ["1", "2", "3"]],
    [1, ["random", "random", "random"]],
    [2, ["2020-10", "2021-10", "2022-10"]],
    [3, ["US", "IT", "ES"]],
    [4, ["WY", "FL", "NJ"]],
    [5, ["36", "40", "50"]], // numeric country code OR FIPS state code.
  ]);
  const dateColHeader1 = { id: "2022-100", header: "2022-10", columnIdx: 0 };
  const dateColHeader2 = { id: "20211", header: "2021-10", columnIdx: 1 };
  const dateCol = { id: "c2", header: "c", columnIdx: 2 };
  const countryCol = { id: "d3", header: "d", columnIdx: 3 };
  const stateCol = { id: "e4", header: "e", columnIdx: 4 };
  const stateNumericCol = { id: "state5", header: "state", columnIdx: 5 };

  const csv = {
    orderedColumns: [
      dateColHeader1,
      dateColHeader2,
      dateCol,
      countryCol,
      stateCol,
      stateNumericCol,
    ],
    columnValuesSampled: cols,
    rowsForDisplay: new Map<RowNumber, Array<string>>(),
  };

  const expected: Mapping = new Map<MappedThing, MappingVal>([
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [dateColHeader1, dateColHeader2],
      },
    ],
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: stateCol,
        placeProperty: {
          dcid: "fips52AlphaCode",
          displayName: "US State Alpha Code",
        },
        placeType: { dcid: "State", displayName: "State" },
      },
    ],
  ]);

  const got = heuristics.getPredictions(csv, pDet);
  expect(got).toStrictEqual(expected);
});
