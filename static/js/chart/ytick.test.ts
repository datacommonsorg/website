/**
 * Copyright 2020 Google LLC
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

import each from "jest-each";

import {
  Range,
} from "./base";

import {
  YTick,
  getYTick,
} from "./ytick"


describe("get y tick", () => {
  each([
    [
      new Range(0, 0.168), new Range(0.168, 0), [
        [0, "0"],
        [0.05, "0.05"],
        [0.1, "0.10"],
        [0.15, "0.15"],
      ]
    ],
    [
      new Range(0, 78900), new Range(78900, 0), [
        [0, "0"],
        [20000, "20K"],
        [40000, "40K"],
        [60000, "60K"],
      ]
    ],
    [
      new Range(0, 1839330), new Range(1839330, 0), [
        [0, "0"],
        [500000, "0.5M"],
        [1000000, "1.0M"],
        [1500000, "1.5M"],
      ]
    ]
  ]).it(
    "when the input is '%s'",
    (
      dataRange: Range,
      valueRange: Range,
      data: [number, string][]
    ) => {
      expect(getYTick(dataRange)).toStrictEqual(new YTick(valueRange, data));
    }
  );
});
