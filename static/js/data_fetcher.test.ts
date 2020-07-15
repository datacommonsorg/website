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

import axios from "axios";

import { fetchStatsData } from "./data_fetcher";
import { DataGroup } from "./chart/base";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

test("fetch stats data", () => {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/stats/Count_Person?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 21000,
              "2012": 22000,
            },
            place_name: "Arkansas",
          },
          "geoId/06": {
            data: {
              "2011": 31000,
              "2012": 32000,
            },
            place_name: "California",
          },
        },
      });
    } else if (url === "/api/stats/Count_Person_Male?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 11000,
              "2012": 13000,
            },
            place_name: "Arkansas",
          },
          "geoId/06": {
            data: {
              "2011": 15000,
              "2012": 16000,
            },
            place_name: "California",
          },
        },
      });
    }
  });

  return fetchStatsData(
    ["geoId/05", "geoId/06"],
    ["Count_Person", "Count_Person_Male"]
  ).then((data) => {
    expect(data).toEqual({
      data: {
        Count_Person_Male: {
          "geoId/05": {
            data: {
              "2011": 11000,
              "2012": 13000,
            },
            place_name: "Arkansas",
          },
          "geoId/06": {
            data: {
              "2011": 15000,
              "2012": 16000,
            },
            place_name: "California",
          },
        },
        Count_Person: {
          "geoId/05": {
            data: {
              "2011": 21000,
              "2012": 22000,
            },
            place_name: "Arkansas",
          },
          "geoId/06": {
            data: {
              "2011": 31000,
              "2012": 32000,
            },
            place_name: "California",
          },
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05", "geoId/06"],
      statsVars: ["Count_Person", "Count_Person_Male"],
    });

    expect(data.getPlaceGroupWithStatsVar()).toEqual([
      new DataGroup("Arkansas", [
        { label: "Total", value: 22000 },
        { label: "Male", value: 13000 },
      ]),
      new DataGroup("California", [
        { label: "Total", value: 32000 },
        { label: "Male", value: 16000 },
      ]),
    ]);

    expect(data.getStatsVarGroupWithTime("geoId/06")).toEqual([
      new DataGroup("Total", [
        { label: "2011", value: 31000 },
        { label: "2012", value: 32000 },
      ]),
      new DataGroup("Male", [
        { label: "2011", value: 15000 },
        { label: "2012", value: 16000 },
      ]),
    ]);

    expect(data.getTimeGroupWithStatsVar("geoId/06")).toEqual([
      new DataGroup("2011", [
        { label: "Total", value: 31000 },
        { label: "Male", value: 15000 },
      ]),
      new DataGroup("2012", [
        { label: "Total", value: 32000 },
        { label: "Male", value: 16000 },
      ]),
    ]);

    expect(data.getStatsPoint("geoId/06")).toEqual([
      { label: "Total", value: 32000 },
      { label: "Male", value: 16000 },
    ]);
  });
});
