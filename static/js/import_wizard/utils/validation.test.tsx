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

import { MappedThing, Mapping, MappingType } from "../types";
import { checkMappings } from "./validation";

test("Fail_MalformedMappingVal", () => {
  const input: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [],
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.FILE_CONSTANT,
        fileConstant: "",
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.COLUMN_CONSTANT,
        columnConstants: {},
      },
    ],
  ]);
  const expected = [
    "Place: missing value for COLUMN type ",
    "Place mapping is missing placeProperty",
    "Name of Variable: missing value for COLUMN_HEADER type",
    "Date: missing value for FILE_CONSTANT type",
    "Unit: missing value for COLUMN_CONSTANT type",
  ];
  expect(checkMappings(input)).toEqual(expected);
});

test("Fail_MissingRequiredPropsAndMultipleColumnHeaders", () => {
  const input: Mapping = new Map([
    [
      MappedThing.UNIT,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [{ id: "a", header: "a", columnIdx: 1 }],
      },
    ],
    [
      MappedThing.VALUE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [{ id: "b", header: "b", columnIdx: 2 }],
      },
    ],
  ]);
  const expected = [
    "Missing required mapping for Place",
    "Missing required mapping for Name of Variable",
    "Missing required mapping for Date",
    "Observation Value: must be a COLUMN type",
    "Multiple columnHeader mappings found: Unit, Value",
  ];
  expect(checkMappings(input)).toEqual(expected);
});

test("Fail_ValueMissing", () => {
  const input: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "iso", header: "iso", columnIdx: 1 },
        placeProperty: { 1: { dcid: "isoCode", displayName: "isoCode" } },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 2 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.FILE_CONSTANT,
        fileConstant: "2019",
      },
    ],
  ]);
  const expected = ["Unable to detect 'Observation Value' column"];
  expect(checkMappings(input)).toEqual(expected);
});

test("Fail_MissingPlaceProperties", () => {
  const input: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [
          { id: "California_1", header: "California", columnIdx: 3 },
          { id: "Nevada_2", header: "Nevada", columnIdx: 4 },
        ],
        placeProperty: { 3: { dcid: "name", displayName: "name" } },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 2 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN,
        column: { id: "date", header: "date", columnIdx: 3 },
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
  const expected = ["Nevada: Place mapping is missing placeProperty"];
  expect(checkMappings(input)).toEqual(expected);
});

test("Pass_DateInColumnHeader", () => {
  const input: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "iso", header: "iso", columnIdx: 1 },
        placeProperty: { 1: { dcid: "isoCode", displayName: "isoCode" } },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 2 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN_HEADER,
        headers: [
          { id: "2018", header: "2018", columnIdx: 3 },
          { id: "2019", header: "2019", columnIdx: 4 },
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
  const expected = [];
  expect(checkMappings(input)).toEqual(expected);
});

test("Pass_NoColumnHeader", () => {
  const input: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "iso", header: "iso", columnIdx: 1 },
        placeProperty: { 1: { dcid: "isoCode", displayName: "isoCode" } },
      },
    ],
    [
      MappedThing.STAT_VAR,
      {
        type: MappingType.COLUMN,
        column: { id: "indicators", header: "indicators", columnIdx: 2 },
      },
    ],
    [
      MappedThing.DATE,
      {
        type: MappingType.COLUMN,
        column: { id: "date", header: "date", columnIdx: 3 },
      },
    ],
    [
      MappedThing.VALUE,
      {
        type: MappingType.COLUMN,
        column: { id: "val", header: "val", columnIdx: 4 },
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
  const expected = [];
  expect(checkMappings(input)).toEqual(expected);
});
