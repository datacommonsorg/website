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

import { Mapping, TypeProperty } from "../types";
import * as detection from "./detection";

// Detection API Response tests.
test("jsonParsingPlaceDateColumns", () => {
  /* eslint-disable */
    const resp = {
        Place: {
            type: "column",
            column: { id: "a", header: "b", column_idx: 0 },
            place_property: {
                dcid: "countryAlpha3Code",
                display_name: "Alpha 3 Code",
            },
            place_type: { dcid: "Country", display_name: "Country" },
            headers: null,
        },
        Date: {
            type: "column",
            column: { id: "d_202", header: "d", column_idx: 202 },
            place_property: null,
            place_type: null,
            headers: null,
        },
    };
    /* eslint-enable */

  const got: Mapping = detection.parseDetectionApiResponse(resp);

  expect(got["Place"].type).toEqual("column");
  expect(got["Place"].column).toEqual({ id: "a", header: "b", columnIdx: 0 });
  expect(got["Place"].placeType).toEqual({
    dcid: "Country",
    displayName: "Country",
  });
  expect(got["Place"].placeProperty).toEqual({
    dcid: "countryAlpha3Code",
    displayName: "Alpha 3 Code",
  });
  expect(_.has(got["Place"], "headers")).toBe(false);

  expect(got["Date"].type).toEqual("column");
  expect(got["Date"].column).toEqual({
    id: "d_202",
    header: "d",
    columnIdx: 202,
  });
  expect(_.has(got["Date"], "placeType")).toBe(false);
  expect(_.has(got["Date"], "placeProperty")).toBe(false);
  expect(_.has(got["Date"], "headers")).toBe(false);
});

test("jsonParsingPlaceDateHeaders", () => {
  /* eslint-disable */
    const resp = {
        Place: {
            type: "column",
            column: { id: "a", header: "b", column_idx: 0 },
            place_property: { dcid: "name", display_name: "Name" },
            place_type: { dcid: "State", display_name: "State" },
            headers: null,
        },
        Date: {
            type: "columnHeader",
            column: null,
            place_property: null,
            place_type: null,
            headers: [
                { id: "d1", header: "2020-01-03", column_idx: 0 },
                { id: "d2", header: "2020-02-03", column_idx: 3 },
            ],
        },
    };
    /* eslint-enable */
  const got: Mapping = detection.parseDetectionApiResponse(resp);

  expect(got["Place"].type).toEqual("column");
  expect(got["Place"].column).toEqual({ id: "a", header: "b", columnIdx: 0 });
  expect(got["Place"].placeType).toEqual({
    dcid: "State",
    displayName: "State",
  });
  expect(got["Place"].placeProperty).toEqual({
    dcid: "name",
    displayName: "Name",
  });
  expect(_.has(got["Place"], "headers")).toBe(false);

  expect(got["Date"].type).toEqual("columnHeader");
  expect(_.has(got["Date"], "column")).toBe(false);
  expect(_.has(got["Date"], "placeType")).toBe(false);
  expect(_.has(got["Date"], "placeProperty")).toBe(false);
  expect(got["Date"].headers.length).toEqual(2);
  expect(got["Date"].headers[0]).toEqual({
    id: "d1",
    header: "2020-01-03",
    columnIdx: 0,
  });
  expect(got["Date"].headers[1]).toEqual({
    id: "d2",
    header: "2020-02-03",
    columnIdx: 3,
  });
});

test("jsonParsingPlaceSkippedDateCorrect", () => {
  /* eslint-disable */
    const resp = {
        Place: {
            type: "column",
            column: null, // Column cannot be empty.
            place_property: {
                dcid: "countryAlpha3Code",
                display_name: "Alpha 3 Code",
            },
            place_type: { dcid: "Country", display_name: "Country" },
            headers: null,
        },
            Date: {
            type: "column",
            column: { id: "d_202", header: "d", column_idx: 202 },
            place_property: null,
            place_type: null,
            headers: null,
        },
    };
    /* eslint-enable */
  const got: Mapping = detection.parseDetectionApiResponse(resp);

  expect(_.has(got, "Place")).toBe(false);

  expect(got["Date"].type).toEqual("column");
  expect(got["Date"].column).toEqual({
    id: "d_202",
    header: "d",
    columnIdx: 202,
  });
  expect(_.has(got["Date"], "placeType")).toBe(false);
  expect(_.has(got["Date"], "placeProperty")).toBe(false);
  expect(_.has(got["Date"], "headers")).toBe(false);
});

test("jsonParsingPlaceCorrectDateSkipped", () => {
  /* eslint-disable */
    const resp = {
        Place: {
            type: "column",
            column: { id: "a", header: "b", column_idx: 0 },
            place_property: {
                dcid: "countryAlpha3Code",
                display_name: "Alpha 3 Code",
            },
            place_type: { dcid: "Country", display_name: "Country" },
            headers: null,
        },
        Date: {
            type: "column",
            column: null,
            place_property: null,
            place_type: null,
            // headers should be an array and not a map.
            headers: { id: "d_202", header: "d", column_idx: 202 },
        },
    };
    /* eslint-enable */
  const got: Mapping = detection.parseDetectionApiResponse(resp);

  expect(got["Place"].type).toEqual("column");
  expect(got["Place"].column).toEqual({ id: "a", header: "b", columnIdx: 0 });
  expect(got["Place"].placeType).toEqual({
    dcid: "Country",
    displayName: "Country",
  });
  expect(got["Place"].placeProperty).toEqual({
    dcid: "countryAlpha3Code",
    displayName: "Alpha 3 Code",
  });
  expect(_.has(got["Place"], "headers")).toBe(false);
  expect(_.has(got, "Date")).toBe(false);
});

test("jsonParsingAllSkipped", () => {
  /* eslint-disable */
    const resp = {
        Place: {
            type: "column",
            column: null, // Cannot be null.
            place_property: {
                dcid: "countryAlpha3Code",
                display_name: "Alpha 3 Code",
            },
            place_type: { dcid: "Country", display_name: "Country" },
            headers: null,
        },
        Date: {
            type: "random", // Must be a valid MappingType.
            column: null,
            place_property: null,
            place_type: null,
            headers: null,
        },
    };
    /* eslint-disable */
    const got: Mapping = detection.parseDetectionApiResponse(resp);
    expect(_.isEmpty(got)).toBe(true);
});
    

test("jsonParsingColumnIncorrect", () => {
    /* eslint-disable */
    const resp = {
        Place: {
            type: "column",
            // Column has a "random" field which should be "id".
            column: { random: "a", header: "b", column_idx: 0 },
            place_property: {
                dcid: "countryAlpha3Code",
                display_name: "Alpha 3 Code",
            },
            place_type: { dcid: "Country", display_name: "Country" },
            headers: null,
        },
    };
    /* eslint-enable */
  const got: Mapping = detection.parseDetectionApiResponse(resp);
  expect(_.isEmpty(got)).toBe(true);
});

test("jsonParsingPropIncorrect", () => {
  /* eslint-disable */
  const resp = {
    Place: {
      type: "column",
      column: { id: "a", header: "b", column_idx: 0 },
      // place_property has a "random" field which should be "dcid".
      place_property: {
        random: "countryAlpha3Code",
        display_name: "Alpha 3 Code",
      },
      place_type: { dcid: "Country", display_name: "Country" },
      headers: null,
    },
  };
  /* eslint-enable */
  const got: Mapping = detection.parseDetectionApiResponse(resp);
  expect(_.isEmpty(got)).toBe(true);
});

test("jsonParsingTypeIncorrect", () => {
  /* eslint-disable */
    const resp = {
        Place: {
            type: "column",
            column: { id: "a", header: "b", column_idx: 0 },
            place_property: {
                dcid: "countryAlpha3Code",
                display_name: "Alpha 3 Code",
            },
            // place_type has a "random" field which should be "display_name".
            place_type: { dcid: "Country", random: "Country" },
            headers: null,
        },
    };
    /* eslint-enable */
  const got: Mapping = detection.parseDetectionApiResponse(resp);
  expect(_.isEmpty(got)).toBe(true);
});

// Supported Type Properties API Response tests.
test("jsonParsingSupportedTypePropertiesAllSkipped", () => {
  /* eslint-disable */
    const resp = [
        {
            // dc_type has a "randomField" which should be "dcid".
            dc_type: { randomField: "Country", display_name: "Country" },
            dc_property: { dcid: "countryAlpha3Code", display_name: "Alpha 3 Code" },
        },
    ];
    /* eslint-enable */
  const got: Array<TypeProperty> =
    detection.parseSupportedTypePropertiesResponse(resp);
  expect(_.isEmpty(got)).toBe(true);
});

test("jsonParsingSupportedTypePropertiesCorrect", () => {
  /* eslint-disable */
    const resp = [
        {
            dc_type: { dcid: "Country", display_name: "Country" },
            dc_property: { dcid: "countryAlpha3Code", display_name: "Alpha 3 Code" },
        },
        {
            dc_type: { dcid: "State", display_name: "State" },
            dc_property: { dcid: "name", display_name: "Name" },
        },
    ];
    /* eslint-enable */
  const got: Array<TypeProperty> =
    detection.parseSupportedTypePropertiesResponse(resp);
  expect(got.length).toEqual(2);
  expect(got[0]).toEqual({
    dcType: { dcid: "Country", displayName: "Country" },
    dcProperty: { dcid: "countryAlpha3Code", displayName: "Alpha 3 Code" },
  });
  expect(got[1]).toEqual({
    dcType: { dcid: "State", displayName: "State" },
    dcProperty: { dcid: "name", displayName: "Name" },
  });
});
