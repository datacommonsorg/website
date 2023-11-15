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
import Papa from "papaparse";

import { CsvData, MappedThing, Mapping, MappingType, ValueMap } from "../types";
import {
  generateCsv,
  generateTranslationMetadataJson,
  shouldGenerateCsv,
} from "./file_generation";

test("generateTranslationMetadataJson", () => {
  const dateColHeader1 = { id: "2022-100", header: "2022-10", columnIdx: 0 };
  const dateColHeader2 = { id: "20211", header: "2021-10", columnIdx: 1 };
  const dateCol = { id: "c2", header: "c", columnIdx: 2 };
  const countryCol = { id: "d3", header: "d", columnIdx: 3 };
  const predictedMapping: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: countryCol,
        placeProperty: {
          3: {
            dcid: "name",
            displayName: "name",
          },
        },
        placeType: { 3: { dcid: "Country", displayName: "Country" } },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN,
        column: dateCol,
      },
    ],
  ]);
  const correctedMapping: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: countryCol,
        placeProperty: {
          3: {
            dcid: "countryAlpha3Code",
            displayName: "Alpha 3 Code",
          },
        },
        placeType: { 3: { dcid: "Country", displayName: "Country" } },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [dateColHeader1, dateColHeader2],
      },
    ],
  ]);

  const cases: {
    name: string;
    prediction: Mapping;
    correctedMapping: Mapping;
    expected: string;
  }[] = [
    {
      name: "empty prediction",
      prediction: new Map(),
      correctedMapping,
      expected:
        '{"predictions":{},"correctedMapping":{"Place":{"type":"column","column":{"id":"d3","header":"d","columnIdx":3},"placeProperty":{"3":{"dcid":"countryAlpha3Code","displayName":"Alpha 3 Code"}},"placeType":{"3":{"dcid":"Country","displayName":"Country"}}},"Date":{"type":"columnHeader","headers":[{"id":"2022-100","header":"2022-10","columnIdx":0},{"id":"20211","header":"2021-10","columnIdx":1}]}}}',
    },
    {
      name: "empty correctedMapping",
      prediction: predictedMapping,
      correctedMapping: new Map(),
      expected:
        '{"predictions":{"Place":{"type":"column","column":{"id":"d3","header":"d","columnIdx":3},"placeProperty":{"3":{"dcid":"name","displayName":"name"}},"placeType":{"3":{"dcid":"Country","displayName":"Country"}}},"Date":{"type":"column","column":{"id":"c2","header":"c","columnIdx":2}}},"correctedMapping":{}}',
    },
    {
      name: "both empty",
      prediction: new Map(),
      correctedMapping: new Map(),
      expected: '{"predictions":{},"correctedMapping":{}}',
    },
    {
      name: "both non empty",
      prediction: predictedMapping,
      correctedMapping,
      expected:
        '{"predictions":{"Place":{"type":"column","column":{"id":"d3","header":"d","columnIdx":3},"placeProperty":{"3":{"dcid":"name","displayName":"name"}},"placeType":{"3":{"dcid":"Country","displayName":"Country"}}},"Date":{"type":"column","column":{"id":"c2","header":"c","columnIdx":2}}},"correctedMapping":{"Place":{"type":"column","column":{"id":"d3","header":"d","columnIdx":3},"placeProperty":{"3":{"dcid":"countryAlpha3Code","displayName":"Alpha 3 Code"}},"placeType":{"3":{"dcid":"Country","displayName":"Country"}}},"Date":{"type":"columnHeader","headers":[{"id":"2022-100","header":"2022-10","columnIdx":0},{"id":"20211","header":"2021-10","columnIdx":1}]}}}',
    },
  ];

  for (const c of cases) {
    const result = generateTranslationMetadataJson(
      c.prediction,
      c.correctedMapping
    );
    try {
      expect(result).toEqual(c.expected);
    } catch (e) {
      console.log("test failed for: " + c.name);
      throw e;
    }
  }
});

test("shouldGenerateCsv", () => {
  const baseCsvData = {
    orderedColumns: [],
    columnValuesSampled: new Map(),
    rowsForDisplay: new Map(),
  };
  // column at idx 0 where header and id are the same
  const columnSameHeaderId1 = {
    id: "header",
    header: "header",
    columnIdx: 0,
  };
  // column at idx 1 where header and id are the same
  const columnSameHeaderId2 = {
    id: "header2",
    header: "header2",
    columnIdx: 1,
  };
  // column at idx 0 where header and id are different
  const columnDiffHeaderId1 = {
    id: "header_0",
    header: "header",
    columnIdx: 0,
  };
  // column at idx 1 where header and id are different
  const columnDiffHeaderId2 = {
    id: "header_1",
    header: "header",
    columnIdx: 1,
  };
  const cases: {
    name: string;
    originalCsv: CsvData;
    correctedCsv: CsvData;
    valueMap: ValueMap;
    expected: boolean;
  }[] = [
    {
      name: "no updated column id",
      originalCsv: {
        ...baseCsvData,
        orderedColumns: [columnSameHeaderId1, columnSameHeaderId2],
      },
      correctedCsv: {
        ...baseCsvData,
        orderedColumns: [columnSameHeaderId1, columnSameHeaderId2],
      },
      valueMap: {},
      expected: false,
    },
    {
      name: "has autogenerated column id",
      originalCsv: {
        ...baseCsvData,
        orderedColumns: [columnSameHeaderId1, columnDiffHeaderId2],
      },
      correctedCsv: {
        ...baseCsvData,
        orderedColumns: [columnSameHeaderId1, columnDiffHeaderId2],
      },
      valueMap: {},
      expected: true,
    },
    {
      name: "has user edited column id",
      originalCsv: {
        ...baseCsvData,
        orderedColumns: [columnSameHeaderId1, columnDiffHeaderId2],
      },
      correctedCsv: {
        ...baseCsvData,
        orderedColumns: [columnDiffHeaderId1, columnSameHeaderId2],
      },
      valueMap: {},
      expected: true,
    },
    {
      name: "has value map",
      originalCsv: {
        ...baseCsvData,
        orderedColumns: [columnSameHeaderId1, columnSameHeaderId2],
      },
      correctedCsv: {
        ...baseCsvData,
        orderedColumns: [columnSameHeaderId1, columnSameHeaderId2],
      },
      valueMap: { test: "test1" },
      expected: true,
    },
  ];

  for (const c of cases) {
    const result = shouldGenerateCsv(c.originalCsv, c.correctedCsv, c.valueMap);
    try {
      expect(result).toEqual(c.expected);
    } catch (e) {
      console.log("test failed for: " + c.name);
      throw e;
    }
  }
});

test("generateCsvNoValueMap", () => {
  // column at idx 0 where header and id are the same
  const columnSameHeaderId1 = {
    id: "header",
    header: "header",
    columnIdx: 0,
  };
  // column at idx 1 where header and id are different
  const columnDiffHeaderId2 = {
    id: "header_0",
    header: "header",
    columnIdx: 1,
  };
  // column at idx 2
  const column3 = {
    id: "col3",
    header: "col3",
    columnIdx: 2,
  };
  const originalCsvContent = Papa.unparse([
    ["col1", "col2", "col3"],
    ["a", "2", "3"],
    ["b", "test", "5"],
  ]);
  const originalCsvFile = new File([originalCsvContent], "original.csv", {
    type: "text/csv;chartset=utf-8",
  });
  const csvData = {
    orderedColumns: [columnSameHeaderId1, columnDiffHeaderId2, column3],
    columnValuesSampled: new Map(),
    rowsForDisplay: new Map(),
    rawCsvFile: originalCsvFile,
  };
  return generateCsv(csvData, {}).then((result) => {
    const expected = Papa.unparse([
      ["header", "header_0", "col3"],
      ["a", "2", "3"],
      ["b", "test", "5"],
    ]);
    expect(result).toEqual(expected);
  });
});

test("generateCsvWithValueMap", () => {
  // column at idx 0 where header and id are the same
  const columnSameHeaderId1 = {
    id: "header",
    header: "header",
    columnIdx: 0,
  };
  // column at idx 1 where header and id are different
  const columnDiffHeaderId2 = {
    id: "header_0",
    header: "header",
    columnIdx: 1,
  };
  // column at idx 2
  const column3 = {
    id: "col3",
    header: "col3",
    columnIdx: 2,
  };
  const originalCsvContent = Papa.unparse([
    ["col1", "col2", "col3"],
    ["a", "test, test1", "3"],
    ["b", "test", "test1, test2"],
  ]);
  const originalCsvFile = new File([originalCsvContent], "original.csv", {
    type: "text/csv;chartset=utf-8",
  });
  const csvData = {
    orderedColumns: [columnSameHeaderId1, columnDiffHeaderId2, column3],
    columnValuesSampled: new Map(),
    rowsForDisplay: new Map(),
    rawCsvFile: originalCsvFile,
  };
  const valueMap = { test: "abc", "test1, test2": "test3, test4", "3": "" };
  return generateCsv(csvData, valueMap).then((result) => {
    const expected = Papa.unparse([
      ["header", "header_0", "col3"],
      ["a", "test, test1", ""],
      ["b", "abc", "test3, test4"],
    ]);
    expect(result).toEqual(expected);
  });
});
