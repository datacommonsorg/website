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
  CsvData,
  MappedThing,
  Mapping,
  MappingType,
  RowNumber,
  RowObservations,
} from "../types";
import { generateRowObservations, observationToString } from "./obs_generation";

function rowObsToStrList(
  rowObs: RowObservations
): Map<RowNumber, Array<string>> {
  const res = new Map<RowNumber, Array<string>>();
  for (const idx of Array.from(rowObs.keys())) {
    const strList = new Array<string>();
    for (const obs of rowObs.get(idx)) {
      strList.push(observationToString(obs));
    }
    res.set(idx, strList);
  }
  return res;
}

test("GenerateRowObservations_SingleValueColumn", () => {
  const inMappings: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "iso", header: "iso", columnIdx: 0 },
        placeProperty: { dcid: "isoCode", displayName: "isoCode" },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 1 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN,
        column: { id: "date", header: "date", columnIdx: 2 },
      },
    ],
    [
      MappedThing.VALUE,
      {
        type: MappingType.COLUMN,
        column: { id: "val", header: "val", columnIdx: 3 },
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.FILE_CONSTANT,
        fileConstant: "USDollar",
      },
    ],
  ]);
  const inCsvData: CsvData = {
    orderedColumns: [
      { id: "iso", header: "iso", columnIdx: 0 },
      { id: "indicators", header: "indicators", columnIdx: 1 },
      { id: "date", header: "date", columnIdx: 2 },
      { id: "val", header: "val", columnIdx: 3 },
    ],
    columnValuesSampled: null,
    rowsForDisplay: new Map([
      [2, ["USA", "Count_Person", "2022", "329000000"]],
      [3, ["IND", "Count_Goat", "2021", ""]],
      [1000, ["CHN", "Count_Dog", "2022", "100000001"]],
    ]),
    headerRow: 1,
    firstDataRow: 2,
    lastDataRow: 1000,
    lastFileRow: 1000,
  };
  // NOTE: Row 2 only has no entry because value is empty.
  const expected: Map<RowNumber, Array<string>> = new Map([
    [2, ["Value of Count_Person for USA in 2022 is 329000000 USDollar"]],
    [1000, ["Value of Count_Dog for CHN in 2022 is 100000001 USDollar"]],
  ]);
  const actual = rowObsToStrList(
    generateRowObservations(inMappings, inCsvData, {})
  );
  expect(Array.from(actual.keys())).toEqual(Array.from(expected.keys()));
  expect(Array.from(actual.values())).toEqual(Array.from(expected.values()));
});

test("GenerateRowObservations_SingleValueColumn_UnitInColumn", () => {
  const inMappings: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "iso", header: "iso", columnIdx: 0 },
        placeProperty: { dcid: "isoCode", displayName: "isoCode" },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 1 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN,
        column: { id: "date", header: "date", columnIdx: 2 },
      },
    ],
    [
      MappedThing.VALUE,
      {
        type: MappingType.COLUMN,
        column: { id: "val", header: "val", columnIdx: 3 },
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.COLUMN_CONSTANT,
        columnConstants: { 3: "USDollar" },
      },
    ],
  ]);
  const inCsvData: CsvData = {
    orderedColumns: [
      { id: "iso", header: "iso", columnIdx: 0 },
      { id: "indicators", header: "indicators", columnIdx: 1 },
      { id: "date", header: "date", columnIdx: 2 },
      { id: "val", header: "val", columnIdx: 3 },
    ],
    columnValuesSampled: null,
    rowsForDisplay: new Map([
      [2, ["USA", "Count_Person", "2022", "329000000"]],
      [3, ["IND", "Count_Goat", "2021", ""]],
      [1000, ["CHN", "Count_Dog", "2022", "100000001"]],
    ]),
    headerRow: 2,
    firstDataRow: 3,
    lastDataRow: 1000,
    lastFileRow: 1000,
  };
  // NOTE: Row 2 only has no entry because value is empty.
  const expected: Map<RowNumber, Array<string>> = new Map([
    [2, ["Value of Count_Person for USA in 2022 is 329000000 USDollar"]],
    [1000, ["Value of Count_Dog for CHN in 2022 is 100000001 USDollar"]],
  ]);
  const actual = rowObsToStrList(
    generateRowObservations(inMappings, inCsvData, {})
  );
  expect(Array.from(actual.keys())).toEqual(Array.from(expected.keys()));
  expect(Array.from(actual.values())).toEqual(Array.from(expected.values()));
});

test("GenerateRowObservations_SingleValueColumn_ValueMap", () => {
  const inMappings: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "iso", header: "iso", columnIdx: 0 },
        placeProperty: { dcid: "isoCode", displayName: "isoCode" },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 1 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN,
        column: { id: "date", header: "date", columnIdx: 2 },
      },
    ],
    [
      MappedThing.VALUE,
      {
        type: MappingType.COLUMN,
        column: { id: "val", header: "val", columnIdx: 3 },
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.FILE_CONSTANT,
        fileConstant: "USDollar",
      },
    ],
  ]);
  const inCsvData: CsvData = {
    orderedColumns: [
      { id: "iso", header: "iso", columnIdx: 0 },
      { id: "indicators", header: "indicators", columnIdx: 1 },
      { id: "date", header: "date", columnIdx: 2 },
      { id: "val", header: "val", columnIdx: 3 },
    ],
    columnValuesSampled: null,
    rowsForDisplay: new Map([
      [2, ["USA", "Count_Person", "2022", "329000000"]],
      [3, ["IND", "Count_Goat", "2021", ""]],
      [1000, ["CHN", "Count_Dog", "2022", "100000001"]],
    ]),
    headerRow: 1,
    firstDataRow: 2,
    lastDataRow: 1000,
    lastFileRow: 1000,
  };

  /* eslint-disable camelcase */
  const valueMap = {
    USA: "CAN",
    Count_Person: "Count_Person_Female",
  };
  /* eslint-enable camelcase */

  // NOTE: Row 2 only has no entry because value is empty.
  const expected: Map<RowNumber, Array<string>> = new Map([
    [2, ["Value of Count_Person_Female for CAN in 2022 is 329000000 USDollar"]],
    [1000, ["Value of Count_Dog for CHN in 2022 is 100000001 USDollar"]],
  ]);
  const actual = rowObsToStrList(
    generateRowObservations(inMappings, inCsvData, valueMap)
  );
  expect(Array.from(actual.keys())).toEqual(Array.from(expected.keys()));
  expect(Array.from(actual.values())).toEqual(Array.from(expected.values()));
});

test("GenerateRowObservations_DateValuesInHeader", () => {
  const inMappings: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "id", header: "id", columnIdx: 0 },
        placeProperty: { dcid: "dcid", displayName: "dcid" },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 1 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [
          { id: "2018", header: "2018", columnIdx: 2 },
          { id: "2019", header: "2019", columnIdx: 3 },
        ],
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.FILE_CONSTANT,
        fileConstant: "USDollar",
      },
    ],
  ]);
  const inCsvData: CsvData = {
    orderedColumns: [
      { id: "id", header: "id", columnIdx: 0 },
      { id: "indicators", header: "indicators", columnIdx: 1 },
      { id: "2018", header: "2019", columnIdx: 2 },
      { id: "2019", header: "2019", columnIdx: 3 },
    ],
    columnValuesSampled: null,
    rowsForDisplay: new Map([
      [2, ["USA", "Count_Person", "300000000", "329000000"]],
      [3, ["IND", "Count_Goat", "2000000", ""]],
      [1000, ["CHN", "Count_Dog", "100000001", "110000000"]],
    ]),
    headerRow: 1,
    firstDataRow: 2,
    lastDataRow: 1000,
    lastFileRow: 1000,
  };
  // NOTE: Row 2 only has one entry because the value is empty.
  const expected: Map<RowNumber, Array<string>> = new Map([
    [
      2,
      [
        "Value of Count_Person for USA in 2018 is 300000000 USDollar",
        "Value of Count_Person for USA in 2019 is 329000000 USDollar",
      ],
    ],
    [3, ["Value of Count_Goat for IND in 2018 is 2000000 USDollar"]],
    [
      1000,
      [
        "Value of Count_Dog for CHN in 2018 is 100000001 USDollar",
        "Value of Count_Dog for CHN in 2019 is 110000000 USDollar",
      ],
    ],
  ]);
  const actual = rowObsToStrList(
    generateRowObservations(inMappings, inCsvData, {})
  );
  expect(Array.from(actual.keys())).toEqual(Array.from(expected.keys()));
  expect(Array.from(actual.values())).toEqual(Array.from(expected.values()));
});

test("GenerateRowObservations_DateValuesInHeader_ValueMap", () => {
  const inMappings: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "id", header: "id", columnIdx: 0 },
        placeProperty: { dcid: "dcid", displayName: "dcid" },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 1 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [
          { id: "2018", header: "2018", columnIdx: 2 },
          { id: "2019", header: "2019", columnIdx: 3 },
        ],
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.FILE_CONSTANT,
        fileConstant: "USDollar",
      },
    ],
  ]);
  const inCsvData: CsvData = {
    orderedColumns: [
      { id: "id", header: "id", columnIdx: 0 },
      { id: "indicators", header: "indicators", columnIdx: 1 },
      { id: "2018", header: "2019", columnIdx: 2 },
      { id: "2018", header: "2019", columnIdx: 3 },
    ],
    columnValuesSampled: null,
    rowsForDisplay: new Map([
      [2, ["USA", "Count_Person", "300000000", "329000000"]],
      [3, ["IND", "Count_Goat", "2000000", ""]],
      [1000, ["CHN", "Count_Dog", "100000001", "110000000"]],
    ]),
    headerRow: 1,
    firstDataRow: 2,
    lastDataRow: 1000,
    lastFileRow: 1000,
  };
  const valueMap = {
    USA: "CAN",
  };
  // NOTE: Row 2 only has one entry because the value is empty.
  const expected: Map<RowNumber, Array<string>> = new Map([
    [
      2,
      [
        "Value of Count_Person for CAN in 2018 is 300000000 USDollar",
        "Value of Count_Person for CAN in 2019 is 329000000 USDollar",
      ],
    ],
    [3, ["Value of Count_Goat for IND in 2018 is 2000000 USDollar"]],
    [
      1000,
      [
        "Value of Count_Dog for CHN in 2018 is 100000001 USDollar",
        "Value of Count_Dog for CHN in 2019 is 110000000 USDollar",
      ],
    ],
  ]);
  const actual = rowObsToStrList(
    generateRowObservations(inMappings, inCsvData, valueMap)
  );
  expect(Array.from(actual.keys())).toEqual(Array.from(expected.keys()));
  expect(Array.from(actual.values())).toEqual(Array.from(expected.values()));
});

test("GenerateRowObservations_DateValuesInHeader_UnitsInColumns", () => {
  const inMappings: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "id", header: "id", columnIdx: 0 },
        placeProperty: { dcid: "dcid", displayName: "dcid" },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 1 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [
          { id: "2018", header: "2018", columnIdx: 2 },
          { id: "2019", header: "2019", columnIdx: 3 },
        ],
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.COLUMN_CONSTANT,
        columnConstants: {
          2: "USDollar",
          3: "CAD",
        },
      },
    ],
  ]);
  const inCsvData: CsvData = {
    orderedColumns: [
      { id: "id", header: "id", columnIdx: 0 },
      { id: "indicators", header: "indicators", columnIdx: 1 },
      { id: "2018", header: "2018", columnIdx: 2 },
      { id: "2019", header: "2019", columnIdx: 3 },
    ],
    columnValuesSampled: null,
    rowsForDisplay: new Map([
      [2, ["USA", "Count_Person", "300000000", "329000000"]],
      [3, ["IND", "Count_Goat", "2000000", ""]],
      [1000, ["CHN", "Count_Dog", "100000001", "110000000"]],
    ]),
    headerRow: 1,
    firstDataRow: 2,
    lastDataRow: 1000,
    lastFileRow: 1000,
  };
  // NOTE: Row 2 only has one entry because the value is empty.
  const expected: Map<RowNumber, Array<string>> = new Map([
    [
      2,
      [
        "Value of Count_Person for USA in 2018 is 300000000 USDollar",
        "Value of Count_Person for USA in 2019 is 329000000 CAD",
      ],
    ],
    [3, ["Value of Count_Goat for IND in 2018 is 2000000 USDollar"]],
    [
      1000,
      [
        "Value of Count_Dog for CHN in 2018 is 100000001 USDollar",
        "Value of Count_Dog for CHN in 2019 is 110000000 CAD",
      ],
    ],
  ]);
  const actual = rowObsToStrList(
    generateRowObservations(inMappings, inCsvData, {})
  );
  expect(Array.from(actual.keys())).toEqual(Array.from(expected.keys()));
  expect(Array.from(actual.values())).toEqual(Array.from(expected.values()));
});
