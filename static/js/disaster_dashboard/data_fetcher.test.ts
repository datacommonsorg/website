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

import axios from "axios";
import { when } from "jest-when";

import { DISASTER_EVENT_TYPES, DisasterType } from "./constants";
import { fetchDateList, fetchDisasterData } from "./data_fetcher";

const EARTHQUAKE_EVENT_1_API = {
  eventId: "earthquake1",
  name: "earthquake1",
  startDate: "2022-01-01",
  affectedPlaces: ["country/USA"],
  longitude: 1,
  latitude: 1,
  magnitude: 5,
};

const EARTHQUAKE_EVENT_1_PROCESSED = {
  placeDcid: "earthquake1",
  placeName: "earthquake1",
  latitude: 1,
  longitude: 1,
  disasterType: "Earthquake",
  startDate: "2022-01-01",
  intensity: { magnitude: 5 },
  endDate: undefined,
};

const EARTHQUAKE_EVENT_2_API = {
  eventId: "earthquake2",
  name: "earthquake2",
  startDate: "2022-01-02",
  affectedPlaces: [],
  longitude: 1,
  latitude: 1,
  magnitude: 5,
};

const EARTHQUAKE_EVENT_2_PROCESSED = {
  placeDcid: "earthquake2",
  placeName: "earthquake2",
  latitude: 1,
  longitude: 1,
  disasterType: "Earthquake",
  startDate: "2022-01-02",
  intensity: { magnitude: 5 },
  endDate: undefined,
};

const EARTHQUAKE_EVENT_3_API = {
  eventId: "earthquake3",
  name: "earthquake3",
  startDate: "2022-02-01",
  affectedPlaces: ["country/USA"],
  longitude: 1,
  latitude: 1,
  magnitude: 5,
};

const EARTHQUAKE_EVENT_3_PROCESSED = {
  placeDcid: "earthquake3",
  placeName: "earthquake3",
  latitude: 1,
  longitude: 1,
  disasterType: "Earthquake",
  startDate: "2022-02-01",
  intensity: { magnitude: 5 },
  endDate: undefined,
};

const TORNADO_EVENT_1_API = {
  eventId: "tornado1",
  name: "tornado1",
  startDate: "2022-01-01",
  affectedPlaces: ["country/USA"],
  longitude: 1,
  latitude: 1,
};

const TORNADO_EVENT_1_PROCESSED = {
  placeDcid: "tornado1",
  placeName: "tornado1",
  latitude: 1,
  longitude: 1,
  disasterType: "Storm",
  startDate: "2022-01-01",
  intensity: {},
  endDate: undefined,
};

const TORNADO_EVENT_2_API = {
  eventId: "tornado2",
  name: "tornado2",
  startDate: "2022-03-03",
  affectedPlaces: [],
  longitude: 1,
  latitude: 1,
};

const TORNADO_EVENT_2_PROCESSED = {
  placeDcid: "tornado2",
  placeName: "tornado2",
  latitude: 1,
  longitude: 1,
  disasterType: "Storm",
  startDate: "2022-03-03",
  intensity: {},
  endDate: undefined,
};

const CYCLONE_EVENT_1_API = {
  eventId: "cyclone1",
  name: "cyclone1",
  startDate: "2022-01-01",
  affectedPlaces: ["country/USA"],
  longitude: 1,
  latitude: 1,
};

const CYCLONE_EVENT_1_PROCESSED = {
  placeDcid: "cyclone1",
  placeName: "cyclone1",
  latitude: 1,
  longitude: 1,
  disasterType: "Storm",
  startDate: "2022-01-01",
  intensity: {},
  endDate: undefined,
};

const EVENT_POINTS = {
  EarthquakeEvent: {
    "2022-01": {
      Earth: [EARTHQUAKE_EVENT_1_API, EARTHQUAKE_EVENT_2_API],
    },
    "2022-02": {
      Earth: [EARTHQUAKE_EVENT_3_API],
    },
  },
  TornadoEvent: {
    "2022-01": {
      Earth: [TORNADO_EVENT_1_API],
    },
    "2022-03": {
      Earth: [TORNADO_EVENT_2_API],
    },
  },
  CycloneEvent: {
    "2022-01": {
      Earth: [CYCLONE_EVENT_1_API],
    },
  },
};

const YYYY_DATE = "2022";
const YYYY_MM_DATE = "2022-01";
const TEST_PLACE = "Earth";

const DATE_RANGES = {
  EarthquakeEvent: {
    minDate: "1990-01",
    maxDate: "2021-12",
  },
  CycloneEvent: {
    minDate: "2021-04",
    maxDate: "2022-01",
  },
  TornadoEvent: {
    minDate: "2020-01",
    maxDate: "2021-01",
  },
};

function axios_mock(): void {
  axios.get = jest.fn();

  for (const eventList of Object.values(DISASTER_EVENT_TYPES)) {
    for (const eventType of eventList) {
      const result = DATE_RANGES[eventType] || { minDate: "", maxDate: "" };
      when(axios.get)
        .calledWith("/api/disaster-dashboard/date-range", {
          params: {
            eventType,
          },
        })
        .mockResolvedValue({
          data: result,
        });
    }
  }

  for (const eventList of Object.values(DISASTER_EVENT_TYPES)) {
    for (const eventType of eventList) {
      for (let i = 1; i < 13; i++) {
        const date = `${YYYY_DATE}-${i < 10 ? "0" : ""}${i}`;
        let result = [];
        if (eventType in EVENT_POINTS && date in EVENT_POINTS[eventType]) {
          result = EVENT_POINTS[eventType][date][TEST_PLACE] || [];
        }
        when(axios.get)
          .calledWith("/api/disaster-dashboard/data", {
            params: {
              eventType,
              date,
              place: TEST_PLACE,
            },
          })
          .mockResolvedValue({
            data: result,
          });
      }
    }
  }
}

test("fetch date list for all disasters", () => {
  axios_mock();
  return fetchDateList(DisasterType.ALL).then((dateList) => {
    expect(dateList).toEqual([
      "2022",
      "2021",
      "2020",
      "2019",
      "2018",
      "2017",
      "2016",
      "2015",
      "2014",
      "2013",
      "2012",
      "2011",
      "2010",
      "2009",
      "2008",
      "2007",
      "2006",
      "2005",
      "2004",
      "2003",
      "2002",
      "2001",
      "2000",
      "1999",
      "1998",
      "1997",
      "1996",
      "1995",
      "1994",
      "1993",
      "1992",
      "1991",
      "1990",
    ]);
  });
});

test("fetch date list for single disaster multiple event types", () => {
  axios_mock();
  return fetchDateList(DisasterType.STORM).then((dateList) => {
    expect(dateList).toEqual([
      "2022-01",
      "2021-12",
      "2021-11",
      "2021-10",
      "2021-09",
      "2021-08",
      "2021-07",
      "2021-06",
      "2021-05",
      "2021-04",
      "2021-03",
      "2021-02",
      "2021-01",
      "2020-12",
      "2020-11",
      "2020-10",
      "2020-09",
      "2020-08",
      "2020-07",
      "2020-06",
      "2020-05",
      "2020-04",
      "2020-03",
      "2020-02",
      "2020-01",
    ]);
  });
});

test("fetch date list for single eventType", () => {
  axios_mock();
  return fetchDateList(DisasterType.EARTHQUAKE).then((dateList) => {
    expect(dateList).toEqual([
      "2021",
      "2020",
      "2019",
      "2018",
      "2017",
      "2016",
      "2015",
      "2014",
      "2013",
      "2012",
      "2011",
      "2010",
      "2009",
      "2008",
      "2007",
      "2006",
      "2005",
      "2004",
      "2003",
      "2002",
      "2001",
      "2000",
      "1999",
      "1998",
      "1997",
      "1996",
      "1995",
      "1994",
      "1993",
      "1992",
      "1991",
      "1990",
    ]);
  });
});

test("fetch data for all disasters with date as YYYY-MM", () => {
  axios_mock();
  return fetchDisasterData(DisasterType.ALL, TEST_PLACE, YYYY_MM_DATE).then(
    (result) => {
      const expectedEventPoints = [
        EARTHQUAKE_EVENT_1_PROCESSED,
        EARTHQUAKE_EVENT_2_PROCESSED,
        TORNADO_EVENT_1_PROCESSED,
        CYCLONE_EVENT_1_PROCESSED,
      ];
      expect(result).toEqual(expect.arrayContaining(expectedEventPoints));
    }
  );
});

test("fetch data for all disasters with date as YYYY", () => {
  axios_mock();
  return fetchDisasterData(DisasterType.ALL, TEST_PLACE, YYYY_DATE).then(
    (result) => {
      const expectedEventPoints = [
        EARTHQUAKE_EVENT_1_PROCESSED,
        EARTHQUAKE_EVENT_2_PROCESSED,
        EARTHQUAKE_EVENT_3_PROCESSED,
        TORNADO_EVENT_1_PROCESSED,
        TORNADO_EVENT_2_PROCESSED,
        CYCLONE_EVENT_1_PROCESSED,
      ];
      expect(result).toEqual(expect.arrayContaining(expectedEventPoints));
    }
  );
});

test("fetch data for single disaster multiple events with date as YYYY-MM", () => {
  axios_mock();
  return fetchDisasterData(DisasterType.STORM, TEST_PLACE, YYYY_MM_DATE).then(
    (result) => {
      const expectedEventPoints = [
        TORNADO_EVENT_1_PROCESSED,
        CYCLONE_EVENT_1_PROCESSED,
      ];
      expect(result).toEqual(expect.arrayContaining(expectedEventPoints));
    }
  );
});

test("fetch data for single disaster multiple events with date as YYYY", () => {
  axios_mock();
  return fetchDisasterData(DisasterType.STORM, TEST_PLACE, YYYY_DATE).then(
    (result) => {
      const expectedEventPoints = [
        TORNADO_EVENT_1_PROCESSED,
        TORNADO_EVENT_2_PROCESSED,
        CYCLONE_EVENT_1_PROCESSED,
      ];
      expect(result).toEqual(expect.arrayContaining(expectedEventPoints));
    }
  );
});

test("fetch data for single event with date as YYYY-MM", () => {
  axios_mock();
  return fetchDisasterData(
    DisasterType.EARTHQUAKE,
    TEST_PLACE,
    YYYY_MM_DATE
  ).then((result) => {
    const expectedEventPoints = [
      EARTHQUAKE_EVENT_1_PROCESSED,
      EARTHQUAKE_EVENT_2_PROCESSED,
    ];
    expect(result).toEqual(expect.arrayContaining(expectedEventPoints));
  });
});

test("fetch data for single event with date as YYYY", () => {
  axios_mock();
  return fetchDisasterData(DisasterType.EARTHQUAKE, TEST_PLACE, YYYY_DATE).then(
    (result) => {
      const expectedEventPoints = [
        EARTHQUAKE_EVENT_1_PROCESSED,
        EARTHQUAKE_EVENT_2_PROCESSED,
        EARTHQUAKE_EVENT_3_PROCESSED,
      ];
      expect(result).toEqual(expect.arrayContaining(expectedEventPoints));
    }
  );
});
