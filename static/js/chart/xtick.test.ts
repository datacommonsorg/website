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
import _ from "lodash";

import { getLineXTick } from "./xtick";

describe("get x tick", () => {
  each([
    [
      ["2020-01-01", "2020-01-05", "2020-01-07", "2020-01-10", "2020-01-15"],
      ["01-01", "01-05", "01-09", "01-13", "01-17"],
      [1577836800, 1578182400, 1578528000, 1578873600, 1579219200],
      [1577836800, 1579219200],
    ],
    [
      [
        "2020-01-01",
        "2020-01-05",
        "2020-01-07",
        "2020-01-10",
        "2020-01-15",
        "2020-02-03",
        "2020-02-21",
        "2020-03-20",
        "2020-03-22",
      ],
      ["Jan", "Feb", "Mar", "Apr"],
      [1577836800, 1580515200, 1583020800, 1585699200],
      [1577836800, 1585699200],
    ],
    [
      [
        "2020-01-05",
        "2020-02-05",
        "2020-03-05",
        "2020-04-10",
        "2020-05-15",
        "2020-06-03",
        "2020-07-21",
        "2020-08-20",
        "2020-09-22",
        "2020-10-22",
      ],
      ["Jan", "Apr", "Jul", "Oct", "Jan"],
      [1577836800, 1585699200, 1593561600, 1601510400, 1609459200],
      [1577836800, 1609459200],
    ],
    [
      [
        "2020-01-05",
        "2020-03-05",
        "2020-05-01",
        "2020-06-01",
        "2020-08-03",
        "2020-10-21",
        "2020-12-20",
        "2021-01-22",
        "2021-03-22",
      ],
      ["Jan", "Jul", "Jan", "Jul"],
      [1577836800, 1593561600, 1609459200, 1625097600],
      [1577836800, 1625097600],
    ],
    [
      ["2011", "2012", "2013", "2014", "2015", "2016", "2017"],
      ["2011", "2013", "2015", "2017"],
      [1293840000, 1356998400, 1420070400, 1483228800],
      [1293840000, 1483228800],
    ],
    [
      _.range(1998, 2015, 1).map((year: number) => String(year)),
      ["1995", "2000", "2005", "2010", "2015"],
      [788918400, 946684800, 1104537600, 1262304000, 1420070400],
      [788918400, 1420070400],
    ],
    [
      ["2011", "2012", "2013"],
      ["2011", "2012", "2013"],
      [1293840000, 1325376000, 1356998400],
      [1293840000, 1356998400],
    ],
  ]).it(
    "when the input is '%s'",
    (
      dates: string[],
      tickString: string[],
      tickValue: number[],
      startEnd: number[]
    ) => {
      const xTick = getLineXTick(dates);
      expect(xTick.data.map((point) => point[0])).toStrictEqual(tickValue);
      expect(xTick.data.map((point) => point[1])).toStrictEqual(tickString);
      expect(startEnd).toStrictEqual([
        xTick.valueRange.low,
        xTick.valueRange.high,
      ]);
    }
  );
});
