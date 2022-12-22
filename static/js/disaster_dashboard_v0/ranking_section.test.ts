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

import { DisasterType } from "./constants";
import { getRankedDisasterCounts, getRankingUnits } from "./ranking_section";

const EARTHQUAKE_EVENT_1 = {
  placeDcid: "earthquake1",
  placeName: "earthquake1",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.EARTHQUAKE,
  startDate: "2022-01-01",
  intensity: { magnitude: 5 },
  endDate: undefined,
};
const EARTHQUAKE_EVENT_2 = {
  placeDcid: "earthquake2",
  placeName: "earthquake2",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.EARTHQUAKE,
  startDate: "2022-01-02",
  intensity: { magnitude: 3 },
  endDate: undefined,
};

const EARTHQUAKE_EVENT_3 = {
  placeDcid: "earthquake3",
  placeName: "earthquake3",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.EARTHQUAKE,
  startDate: "2022-02-01",
  intensity: { magnitude: 7 },
  endDate: undefined,
};

const EARTHQUAKE_EVENT_4 = {
  placeDcid: "earthquake4",
  placeName: "earthquake4",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.EARTHQUAKE,
  startDate: "2022-02-06",
  intensity: {},
  endDate: undefined,
};

const TORNADO_EVENT_1 = {
  placeDcid: "tornado1",
  placeName: "tornado1",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.STORM,
  startDate: "2022-01-01",
  intensity: {},
  endDate: undefined,
};

const TORNADO_EVENT_2 = {
  placeDcid: "tornado2",
  placeName: "tornado2",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.STORM,
  startDate: "2022-03-03",
  intensity: {},
  endDate: undefined,
};

const CYCLONE_EVENT_1 = {
  placeDcid: "cyclone1",
  placeName: "cyclone1",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.STORM,
  startDate: "2022-01-01",
  intensity: {},
  endDate: undefined,
};

const DROUGHT_EVENT_1 = {
  placeDcid: "drought1",
  placeName: "drought1",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.DROUGHT,
  startDate: "2022-01-01",
  intensity: {
    directDeaths: 1,
    directInjuries: 2,
  },
  endDate: undefined,
};

const DROUGHT_EVENT_2 = {
  placeDcid: "drought2",
  placeName: "drought2",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.DROUGHT,
  startDate: "2022-01-01",
  intensity: {
    directDeaths: 2,
    directInjuries: 1,
  },
  endDate: undefined,
};

const FIRE_EVENT_1 = {
  placeDcid: "fire1",
  placeName: "fire1",
  latitude: 1,
  longitude: 1,
  disasterType: DisasterType.FIRE,
  startDate: "2022-01-01",
  intensity: {},
  endDate: undefined,
};

test("getRankedDisasterCounts", () => {
  const eventPoints = [
    EARTHQUAKE_EVENT_1,
    EARTHQUAKE_EVENT_2,
    EARTHQUAKE_EVENT_3,
    EARTHQUAKE_EVENT_4,
    TORNADO_EVENT_1,
    TORNADO_EVENT_2,
    CYCLONE_EVENT_1,
    DROUGHT_EVENT_1,
    DROUGHT_EVENT_2,
    FIRE_EVENT_1,
  ];
  const expectedCount = [
    {
      disaster: DisasterType.EARTHQUAKE,
      count: 4,
    },
    {
      disaster: DisasterType.STORM,
      count: 3,
    },
    {
      disaster: DisasterType.DROUGHT,
      count: 2,
    },
    {
      disaster: DisasterType.FIRE,
      count: 1,
    },
    {
      disaster: DisasterType.FLOOD,
      count: 0,
    },
  ];
  const result = getRankedDisasterCounts(eventPoints);
  expect(result).toEqual(expectedCount);
});

test("getRankingUnits - no intensity props", () => {
  const eventPoints = [FIRE_EVENT_1];
  const expectedRankingUnits = [];
  const result = getRankingUnits(eventPoints, DisasterType.FIRE);
  expect(result).toEqual(expectedRankingUnits);
});

test("getRankingUnits - single intensity prop", () => {
  const eventPoints = [
    EARTHQUAKE_EVENT_1,
    EARTHQUAKE_EVENT_2,
    EARTHQUAKE_EVENT_3,
    EARTHQUAKE_EVENT_4,
  ];
  const expectedRankingUnits = [
    {
      title: "magnitude",
      prop: "magnitude",
      ranking: [
        EARTHQUAKE_EVENT_3,
        EARTHQUAKE_EVENT_1,
        EARTHQUAKE_EVENT_2,
        EARTHQUAKE_EVENT_4,
      ],
    },
  ];
  const result = getRankingUnits(eventPoints, DisasterType.EARTHQUAKE);
  expect(result).toEqual(expectedRankingUnits);
});

test("getRankingUnits - multiple intensity props", () => {
  const eventPoints = [DROUGHT_EVENT_1, DROUGHT_EVENT_2];
  const expectedRankingUnits = [
    {
      title: "directDeaths",
      prop: "directDeaths",
      ranking: [DROUGHT_EVENT_2, DROUGHT_EVENT_1],
    },
    {
      title: "directInjuries",
      prop: "directInjuries",
      ranking: [DROUGHT_EVENT_1, DROUGHT_EVENT_2],
    },
  ];
  const result = getRankingUnits(eventPoints, DisasterType.DROUGHT);

  expect(result).toEqual(expectedRankingUnits);
});
