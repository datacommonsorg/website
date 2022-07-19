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
import { generateTMCF } from "./tmcf_generation";

test("SingleNodeTMCF", () => {
  const input: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "iso", header: "iso", columnIdx: 1 },
        placeProperty: { dcid: "isoCode", displayName: "isoCode" },
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
        type: MappingType.CONSTANT,
        constant: "USDollar",
      },
    ],
  ]);
  const expected: string =
    "Node: E:CSVTable->E0\n" +
    "typeOf: dcs:Place\n" +
    "isoCode: C:CSVTable->iso\n" +
    "\n" +
    "Node: E:CSVTable->E1\n" +
    "typeOf: dcs:StatVarObservation\n" +
    "observationAbout: E:CSVTable->E0\n" +
    "variableMeasured: C:CSVTable->indicators\n" +
    "observationDate: C:CSVTable->date\n" +
    "value: C:CSVTable->val\n" +
    "unit: dcid:USDollar\n";
  expect(generateTMCF(input)).toEqual(expected);
});

test("MultiNodeTMCF_DateValueInHeader", () => {
  const input: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN,
        column: { id: "id", header: "id", columnIdx: 1 },
        placeProperty: { dcid: "dcid", displayName: "dcid" },
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
          { id: "2018_1", header: "2018", columnIdx: 3 },
          { id: "2019_2", header: "2019", columnIdx: 4 },
        ],
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.CONSTANT,
        constant: "USDollar",
      },
    ],
  ]);
  const expected =
    "Node: E:CSVTable->E0\n" +
    "typeOf: dcs:StatVarObservation\n" +
    "value: C:CSVTable->2018_1\n" +
    'observationDate: "2018"\n' +
    "observationAbout: C:CSVTable->id\n" +
    "variableMeasured: C:CSVTable->indicators\n" +
    "unit: dcid:USDollar\n" +
    "\n" +
    "Node: E:CSVTable->E1\n" +
    "typeOf: dcs:StatVarObservation\n" +
    "value: C:CSVTable->2019_2\n" +
    'observationDate: "2019"\n' +
    "observationAbout: C:CSVTable->id\n" +
    "variableMeasured: C:CSVTable->indicators\n" +
    "unit: dcid:USDollar\n";
  expect(generateTMCF(input)).toEqual(expected);
});

test("MultiNodeTMCF_PlaceValueInHeader", () => {
  const input: Mapping = new Map([
    [
      MappedThing.PLACE,
      {
        type: MappingType.COLUMN_HEADER,
        placeProperty: { dcid: "name", displayName: "name" },
        placeType: { dcid: "AdministrativeArea1", displayName: "State" },
        headers: [
          { id: "California_1", header: "California", columnIdx: 3 },
          { id: "Nevada_2", header: "Nevada", columnIdx: 4 },
        ],
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
        column: { id: "year", header: "year", columnIdx: 1 },
      },
    ],
    [
      MappedThing.UNIT,
      {
        type: MappingType.CONSTANT,
        constant: "USDollar",
      },
    ],
  ]);
  const expected =
    "Node: E:CSVTable->E0\n" +
    "typeOf: dcs:AdministrativeArea1\n" +
    'name: "California"\n' +
    "\n" +
    "Node: E:CSVTable->E2\n" +
    "typeOf: dcs:AdministrativeArea1\n" +
    'name: "Nevada"\n' +
    "\n" +
    "Node: E:CSVTable->E1\n" +
    "typeOf: dcs:StatVarObservation\n" +
    "value: C:CSVTable->California_1\n" +
    "observationAbout: E:CSVTable->E0\n" +
    "variableMeasured: C:CSVTable->indicators\n" +
    "observationDate: C:CSVTable->year\n" +
    "unit: dcid:USDollar\n" +
    "\n" +
    "Node: E:CSVTable->E3\n" +
    "typeOf: dcs:StatVarObservation\n" +
    "value: C:CSVTable->Nevada_2\n" +
    "observationAbout: E:CSVTable->E2\n" +
    "variableMeasured: C:CSVTable->indicators\n" +
    "observationDate: C:CSVTable->year\n" +
    "unit: dcid:USDollar\n";

  expect(generateTMCF(input)).toEqual(expected);
});
