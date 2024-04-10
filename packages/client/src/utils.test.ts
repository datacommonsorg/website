/**
 * Copyright 2024 Google LLC
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

import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  computePerCapitaRatio,
  encodeCsvRow,
  flattenNestedObject,
  isDateInRange,
} from "./utils";

describe("Utility methods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleDenom = [
    {
      date: "2010",
      value: 10,
    },
    {
      date: "2012",
      value: 12,
    },
    {
      date: "2014",
      value: 14,
    },
    {
      date: "2016",
      value: 16,
    },
    {
      date: "2018",
      value: 18,
    },
    {
      date: "2020",
      value: 20,
    },
  ];

  test("encodeCsvRow should convert null to empty strings", () => {
    expect(encodeCsvRow([1, null, "3"])).toBe(`1,"","3"`);
  });

  test("encodeCsvRow should replace double quotes with two double-quotes", () => {
    expect(encodeCsvRow([1, 'Number "3"', "3"])).toBe(`1,"Number ""3""","3"`);
  });

  test("computeRatio base cases", async () => {
    // Empty num & denom should return empty result
    const emptyResult1 = computePerCapitaRatio([], []);
    expect(emptyResult1.length).toBe(0);

    // Empty num and non-empty denom should return empty result
    const emptyResult2 = computePerCapitaRatio([], sampleDenom);
    expect(emptyResult2.length).toBe(0);

    const sampleNum = [
      {
        date: "2010",
        value: 10,
      },
      {
        date: "2011",
        value: 11,
      },
    ];

    // Non-empty num & empty denom should return empty result
    const result3 = computePerCapitaRatio(sampleNum, []);
    expect(result3.length).toBe(0);
  });

  test("computeRatio finds closest dates", async () => {
    const result1 = computePerCapitaRatio(
      [
        {
          date: "1900", // closest to 2010
          value: 10,
        },
        {
          date: "2010",
          value: 10,
        },
        {
          date: "2010-12-31", // Closer to 2010 than 2012
          value: 10,
        },
        {
          date: "2011-01-02", // Closer to 2012 than to 2010
          value: 12,
        },
        {
          date: "2012",
          value: 12,
        },
        {
          date: "3000", // Closests to 2020
          value: 20,
        },
      ],
      sampleDenom
    );
    expect(result1.length).toBe(6);
    result1.forEach((item) => {
      expect(item.perCapitaValue).toBeCloseTo(1);
    });
  });

  test("computeRatio scaling factor correctly scales", async () => {
    const result1 = computePerCapitaRatio(
      [
        {
          date: "1900", // closest to 2010
          value: 10,
        },
        {
          date: "2010",
          value: 10,
        },
      ],
      sampleDenom,
      0.1
    );
    expect(result1.length).toBe(2);
    result1.forEach((item) => {
      expect(item.perCapitaValue).toBeCloseTo(10);
    });
  });

  test("flattenNestedObject flattens nested objects", () => {
    const flattendObject = flattenNestedObject({
      a: {
        b1: "val1",
        b2: "val2",
        c: {
          d: "val3",
        },
        e: null,
      },
      x: {
        y: [1, 2, 3],
        z: [{ z1: 1, z2: 2 }],
      },
    });
    expect(flattendObject).toEqual({
      "a.b1": "val1",
      "a.b2": "val2",
      "a.c.d": "val3",
      "a.e": null,
      "x.y.0": 1,
      "x.y.1": 2,
      "x.y.2": 3,
      "x.z.0.z1": 1,
      "x.z.0.z2": 2,
    });
  });

  test("isDateInRange returns correct values if date is in range", () => {
    expect(isDateInRange("2024", undefined, undefined)).toBe(true);
    expect(isDateInRange("2024", "2023", undefined)).toBe(true);
    expect(isDateInRange("2024", "2024", undefined)).toBe(true);
    expect(isDateInRange("2024", undefined, "2024")).toBe(true);
    expect(isDateInRange("2024", undefined, "2025")).toBe(true);
    // Test truncating observation date
    expect(isDateInRange("2024-05-05", "2022", "2025")).toBe(true);
    expect(isDateInRange("2024-05-05", "2022", "2024")).toBe(true);
    expect(isDateInRange("2024-05-05", "2022", "2023")).toBe(false);
  });
});
