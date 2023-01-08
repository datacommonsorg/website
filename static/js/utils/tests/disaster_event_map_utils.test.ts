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
import _ from "lodash";

import { EARTH_NAMED_TYPED_PLACE } from "../../shared/constants";
import {
  fetchDateList,
  fetchDisasterEventPoints,
} from "../disaster_event_map_utils";

const EARTHQUAKE_DISASTER_TYPE_ID = "earthquake";
const STORM_DISASTER_TYPE_ID = "storm";
const DISASTER_EVENT_TYPES = {
  [EARTHQUAKE_DISASTER_TYPE_ID]: ["EarthquakeEvent"],
  [STORM_DISASTER_TYPE_ID]: [
    "CycloneEvent",
    "HurricaneTyphoonEvent",
    "HurricaneEvent",
    "TornadoEvent",
  ],
};
const DISASTER_EVENT_SEVERITY_FILTERS = {
  [EARTHQUAKE_DISASTER_TYPE_ID]: {
    prop: "magnitude",
    unit: "",
    lowerLimit: 3,
    upperLimit: 6,
  },
};
const DISASTER_EVENT_COLORS = {
  [EARTHQUAKE_DISASTER_TYPE_ID]: "red",
  [STORM_DISASTER_TYPE_ID]: "blue",
};
const EARTHQUAKE_PROV_ID = "earthquakeProv";
const TORNADO_PROV_ID = "tornadoProv";
const CYCLONE_PROV_ID = "cycloneProv";

const EARTHQUAKE_EVENT_1_API = {
  dcid: "earthquake1",
  dates: ["2022-01-01"],
  places: ["country/USA"],
  geoLocations: [{ point: { longitude: 1, latitude: 1 } }],
  provenanceId: "earthquakeProv",
  propVals: {
    name: {
      vals: ["earthquake1Name"],
    },
    magnitude: {
      vals: ["5"],
    },
  },
};

const EARTHQUAKE_EVENT_1_PROCESSED = {
  placeDcid: "earthquake1",
  placeName: "earthquake1Name",
  latitude: 1,
  longitude: 1,
  disasterType: "earthquake",
  startDate: "2022-01-01",
  severity: { magnitude: 5 },
  endDate: "",
  provenanceId: "earthquakeProv",
};

const EARTHQUAKE_EVENT_2_API = {
  dcid: "earthquake2",
  dates: ["2022-01-02"],
  places: [],
  geoLocations: [{ point: { longitude: 1, latitude: 1 } }],
  provenanceId: "earthquakeProv",
  propVals: {
    name: {
      vals: ["earthquake2Name"],
    },
    magnitude: {
      vals: ["5"],
    },
  },
};

const EARTHQUAKE_EVENT_2_PROCESSED = {
  placeDcid: "earthquake2",
  placeName: "earthquake2Name",
  latitude: 1,
  longitude: 1,
  disasterType: "earthquake",
  startDate: "2022-01-02",
  severity: { magnitude: 5 },
  endDate: "",
  provenanceId: "earthquakeProv",
};

const EARTHQUAKE_EVENT_3_API = {
  dcid: "earthquake3",
  dates: ["2022-02-01"],
  places: ["country/USA"],
  geoLocations: [{ point: { longitude: 1, latitude: 1 } }],
  provenanceId: "earthquakeProv",
  propVals: {
    magnitude: {
      vals: ["5"],
    },
  },
};

const EARTHQUAKE_EVENT_3_PROCESSED = {
  placeDcid: "earthquake3",
  placeName: "earthquake3",
  latitude: 1,
  longitude: 1,
  disasterType: "earthquake",
  startDate: "2022-02-01",
  severity: { magnitude: 5 },
  endDate: "",
  provenanceId: "earthquakeProv",
};

const EARTHQUAKE_EVENT_4_API = {
  dcid: "earthquake4",
  dates: ["2023-01-01"],
  places: ["country/USA"],
  geoLocations: [{ point: { longitude: 1, latitude: 1 } }],
  provenanceId: "earthquakeProv",
  propVals: {
    magnitude: {
      vals: ["5"],
    },
  },
};

const EARTHQUAKE_EVENT_4_PROCESSED = {
  placeDcid: "earthquake4",
  placeName: "earthquake4",
  latitude: 1,
  longitude: 1,
  disasterType: "earthquake",
  startDate: "2023-01-01",
  severity: { magnitude: 5 },
  endDate: "",
  provenanceId: "earthquakeProv",
};

const EARTHQUAKE_EVENT_5_API = {
  dcid: "earthquake5",
  dates: ["2023-02-01"],
  places: ["country/USA"],
  geoLocations: [{ point: { longitude: 1, latitude: 1 } }],
  provenanceId: "earthquakeProv",
  propVals: {
    magnitude: {
      vals: ["5"],
    },
  },
};

const EARTHQUAKE_EVENT_5_PROCESSED = {
  placeDcid: "earthquake5",
  placeName: "earthquake5",
  latitude: 1,
  longitude: 1,
  disasterType: "earthquake",
  startDate: "2023-02-01",
  severity: { magnitude: 5 },
  endDate: "",
  provenanceId: "earthquakeProv",
};

const TORNADO_EVENT_1_API = {
  dcid: "tornado1",
  name: "tornado1",
  dates: ["2022-01-01"],
  places: ["country/USA"],
  geoLocations: [{ point: { longitude: 1, latitude: 1 } }],
  provenanceId: "tornadoProv",
  propVals: {},
};

const TORNADO_EVENT_1_PROCESSED = {
  placeDcid: "tornado1",
  placeName: "tornado1",
  latitude: 1,
  longitude: 1,
  disasterType: "storm",
  startDate: "2022-01-01",
  severity: {},
  endDate: "",
  provenanceId: "tornadoProv",
};

const TORNADO_EVENT_2_API = {
  dcid: "tornado2",
  dates: ["2022-03-03"],
  places: [],
  geoLocations: [{ point: { longitude: 1, latitude: 1 } }],
  provenanceId: "tornadoProv",
  propVals: {},
};

const TORNADO_EVENT_2_PROCESSED = {
  placeDcid: "tornado2",
  placeName: "tornado2",
  latitude: 1,
  longitude: 1,
  disasterType: "storm",
  startDate: "2022-03-03",
  severity: {},
  endDate: "",
  provenanceId: "tornadoProv",
};

const CYCLONE_EVENT_1_API = {
  dcid: "cyclone1",
  dates: ["2022-01-01"],
  places: ["country/USA"],
  geoLocations: [{ point: { longitude: 1, latitude: 1 } }],
  provenanceId: "cycloneProv",
  propVals: {},
};

const CYCLONE_EVENT_1_PROCESSED = {
  placeDcid: "cyclone1",
  placeName: "cyclone1",
  latitude: 1,
  longitude: 1,
  disasterType: "storm",
  startDate: "2022-01-01",
  severity: {},
  endDate: "",
  provenanceId: "cycloneProv",
};

const EARTHQUAKE_PROV_INFO = {
  domain: "earthquakeDom",
  importName: "earthquakeImport",
  provenanceUrl: "earthquakeUrl",
};

const TORNADO_PROV_INFO = {
  domain: "tornadoDom",
  importName: "tornadoImport",
  provenanceUrl: "tornadoUrl",
};

const CYCLONE_PROV_INFO = {
  domain: "cycloneDom",
  importName: "cycloneImport",
  provenanceUrl: "cycloneUrl",
};

const EVENT_DATA = {
  EarthquakeEvent: {
    "2022-01": {
      Earth: {
        eventCollection: {
          events: [EARTHQUAKE_EVENT_1_API, EARTHQUAKE_EVENT_2_API],
          provenanceInfo: { [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO },
        },
      },
    },
    "2022-02": {
      Earth: {
        eventCollection: {
          events: [EARTHQUAKE_EVENT_3_API],
          provenanceInfo: { [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO },
        },
      },
    },
    "2023-01": {
      Earth: {
        eventCollection: {
          events: [EARTHQUAKE_EVENT_4_API],
          provenanceInfo: { [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO },
        },
      },
    },
    "2023-02": {
      Earth: {
        eventCollection: {
          events: [EARTHQUAKE_EVENT_5_API],
          provenanceInfo: { [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO },
        },
      },
    },
  },
  TornadoEvent: {
    "2022-01": {
      Earth: {
        eventCollection: {
          events: [TORNADO_EVENT_1_API],
          provenanceInfo: { [TORNADO_PROV_ID]: TORNADO_PROV_INFO },
        },
      },
    },
    "2022-03": {
      Earth: {
        eventCollection: {
          events: [TORNADO_EVENT_2_API],
          provenanceInfo: { [TORNADO_PROV_ID]: TORNADO_PROV_INFO },
        },
      },
    },
  },
  CycloneEvent: {
    "2022-01": {
      Earth: {
        eventCollection: {
          events: [CYCLONE_EVENT_1_API],
          provenanceInfo: { [CYCLONE_PROV_ID]: CYCLONE_PROV_INFO },
        },
      },
    },
  },
};

const YYYY_DATE = "2022";
const YYYY_MM_DATE = "2022-01";
const YYYY_DATE_2 = "2023";
const YYYY_MM_DATE_2 = "2023-01";
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
        .calledWith("/api/disaster-dashboard/event-date-range", {
          params: {
            eventType,
            place: EARTH_NAMED_TYPED_PLACE.dcid,
          },
        })
        .mockResolvedValue({
          data: result,
        });
    }
  }

  for (const eventType of Object.keys(DISASTER_EVENT_TYPES)) {
    const severityFilter = DISASTER_EVENT_SEVERITY_FILTERS[eventType];
    const eventList = DISASTER_EVENT_TYPES[eventType];
    for (const eventType of eventList) {
      for (const year of [YYYY_DATE, YYYY_DATE_2]) {
        for (let i = 1; i < 13; i++) {
          const date = `${year}-${i < 10 ? "0" : ""}${i}`;
          let result = { events: [], provenanceInfo: {} };
          if (eventType in EVENT_DATA && date in EVENT_DATA[eventType]) {
            result = EVENT_DATA[eventType][date][TEST_PLACE];
          }
          const params = {
            eventType,
            date,
            place: TEST_PLACE,
          };
          if (!_.isEmpty(severityFilter)) {
            params["filterProp"] = severityFilter.prop;
            params["filterUnit"] = severityFilter.unit;
            params["filterUpperLimit"] = severityFilter.upperLimit;
            params["filterLowerLimit"] = severityFilter.lowerLimit;
          }
          when(axios.get)
            .calledWith("/api/disaster-dashboard/event-data", {
              params,
            })
            .mockResolvedValue({
              data: result,
            });
        }
      }
    }
  }
}

test("fetch date list for all disasters", () => {
  axios_mock();
  return fetchDateList(
    Object.values(DISASTER_EVENT_TYPES).flat(),
    EARTH_NAMED_TYPED_PLACE.dcid
  ).then((dateList) => {
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
  return fetchDateList(
    DISASTER_EVENT_TYPES[STORM_DISASTER_TYPE_ID],
    EARTH_NAMED_TYPED_PLACE.dcid
  ).then((dateList) => {
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
  return fetchDateList(
    DISASTER_EVENT_TYPES[EARTHQUAKE_DISASTER_TYPE_ID],
    EARTH_NAMED_TYPED_PLACE.dcid
  ).then((dateList) => {
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
  const eventSpecs = Object.keys(DISASTER_EVENT_TYPES).map((disasterType) => {
    return {
      id: disasterType,
      name: disasterType,
      eventTypeDcids: DISASTER_EVENT_TYPES[disasterType],
      color: DISASTER_EVENT_COLORS[disasterType],
      defaultSeverityFilter: DISASTER_EVENT_SEVERITY_FILTERS[disasterType],
    };
  });
  return fetchDisasterEventPoints(
    eventSpecs,
    TEST_PLACE,
    [YYYY_MM_DATE, YYYY_MM_DATE],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      EARTHQUAKE_EVENT_1_PROCESSED,
      EARTHQUAKE_EVENT_2_PROCESSED,
      TORNADO_EVENT_1_PROCESSED,
      CYCLONE_EVENT_1_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO,
      [TORNADO_PROV_ID]: TORNADO_PROV_INFO,
      [CYCLONE_PROV_ID]: CYCLONE_PROV_INFO,
    });
  });
});

test("fetch data for all disasters with date as YYYY", () => {
  axios_mock();
  const eventSpecs = Object.keys(DISASTER_EVENT_TYPES).map((disasterType) => {
    return {
      id: disasterType,
      name: disasterType,
      eventTypeDcids: DISASTER_EVENT_TYPES[disasterType],
      color: DISASTER_EVENT_COLORS[disasterType],
      defaultSeverityFilter: DISASTER_EVENT_SEVERITY_FILTERS[disasterType],
    };
  });
  return fetchDisasterEventPoints(
    eventSpecs,
    TEST_PLACE,
    [YYYY_DATE, YYYY_DATE],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      EARTHQUAKE_EVENT_1_PROCESSED,
      EARTHQUAKE_EVENT_2_PROCESSED,
      EARTHQUAKE_EVENT_3_PROCESSED,
      TORNADO_EVENT_1_PROCESSED,
      TORNADO_EVENT_2_PROCESSED,
      CYCLONE_EVENT_1_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO,
      [TORNADO_PROV_ID]: TORNADO_PROV_INFO,
      [CYCLONE_PROV_ID]: CYCLONE_PROV_INFO,
    });
  });
});

test("fetch data for single disaster multiple events with date as YYYY-MM", () => {
  axios_mock();
  const eventSpec = {
    id: STORM_DISASTER_TYPE_ID,
    name: "storm",
    eventTypeDcids: DISASTER_EVENT_TYPES[STORM_DISASTER_TYPE_ID],
    color: DISASTER_EVENT_COLORS[STORM_DISASTER_TYPE_ID],
    defaultSeverityFilter:
      DISASTER_EVENT_SEVERITY_FILTERS[STORM_DISASTER_TYPE_ID],
  };
  return fetchDisasterEventPoints(
    [eventSpec],
    TEST_PLACE,
    [YYYY_MM_DATE, YYYY_MM_DATE],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      TORNADO_EVENT_1_PROCESSED,
      CYCLONE_EVENT_1_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [TORNADO_PROV_ID]: TORNADO_PROV_INFO,
      [CYCLONE_PROV_ID]: CYCLONE_PROV_INFO,
    });
  });
});

test("fetch data for single disaster multiple events with date as YYYY", () => {
  axios_mock();
  const eventSpec = {
    id: STORM_DISASTER_TYPE_ID,
    name: "storm",
    eventTypeDcids: DISASTER_EVENT_TYPES[STORM_DISASTER_TYPE_ID],
    color: DISASTER_EVENT_COLORS[STORM_DISASTER_TYPE_ID],
    defaultSeverityFilter:
      DISASTER_EVENT_SEVERITY_FILTERS[STORM_DISASTER_TYPE_ID],
  };
  return fetchDisasterEventPoints(
    [eventSpec],
    TEST_PLACE,
    [YYYY_DATE, YYYY_DATE],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      TORNADO_EVENT_1_PROCESSED,
      TORNADO_EVENT_2_PROCESSED,
      CYCLONE_EVENT_1_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [TORNADO_PROV_ID]: TORNADO_PROV_INFO,
      [CYCLONE_PROV_ID]: CYCLONE_PROV_INFO,
    });
  });
});

test("fetch data for single event with date as YYYY-MM", () => {
  axios_mock();
  const eventSpec = {
    id: EARTHQUAKE_DISASTER_TYPE_ID,
    name: "earthquake",
    eventTypeDcids: DISASTER_EVENT_TYPES[EARTHQUAKE_DISASTER_TYPE_ID],
    color: DISASTER_EVENT_COLORS[EARTHQUAKE_DISASTER_TYPE_ID],
    defaultSeverityFilter:
      DISASTER_EVENT_SEVERITY_FILTERS[EARTHQUAKE_DISASTER_TYPE_ID],
  };
  return fetchDisasterEventPoints(
    [eventSpec],
    TEST_PLACE,
    [YYYY_MM_DATE, YYYY_MM_DATE],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      EARTHQUAKE_EVENT_1_PROCESSED,
      EARTHQUAKE_EVENT_2_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO,
    });
  });
});

test("fetch data for single event with date as YYYY", () => {
  axios_mock();
  const eventSpec = {
    id: EARTHQUAKE_DISASTER_TYPE_ID,
    name: "earthquake",
    eventTypeDcids: DISASTER_EVENT_TYPES[EARTHQUAKE_DISASTER_TYPE_ID],
    color: DISASTER_EVENT_COLORS[EARTHQUAKE_DISASTER_TYPE_ID],
    defaultSeverityFilter:
      DISASTER_EVENT_SEVERITY_FILTERS[EARTHQUAKE_DISASTER_TYPE_ID],
  };
  return fetchDisasterEventPoints(
    [eventSpec],
    TEST_PLACE,
    [YYYY_DATE, YYYY_DATE],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      EARTHQUAKE_EVENT_1_PROCESSED,
      EARTHQUAKE_EVENT_2_PROCESSED,
      EARTHQUAKE_EVENT_3_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO,
    });
  });
});

test("fetch data for single event with date range as YYYY", () => {
  axios_mock();
  const eventSpec = {
    id: EARTHQUAKE_DISASTER_TYPE_ID,
    name: "earthquake",
    eventTypeDcids: DISASTER_EVENT_TYPES[EARTHQUAKE_DISASTER_TYPE_ID],
    color: DISASTER_EVENT_COLORS[EARTHQUAKE_DISASTER_TYPE_ID],
    defaultSeverityFilter:
      DISASTER_EVENT_SEVERITY_FILTERS[EARTHQUAKE_DISASTER_TYPE_ID],
  };
  return fetchDisasterEventPoints(
    [eventSpec],
    TEST_PLACE,
    [YYYY_DATE, YYYY_DATE_2],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      EARTHQUAKE_EVENT_1_PROCESSED,
      EARTHQUAKE_EVENT_2_PROCESSED,
      EARTHQUAKE_EVENT_3_PROCESSED,
      EARTHQUAKE_EVENT_4_PROCESSED,
      EARTHQUAKE_EVENT_5_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO,
    });
  });
});

test("fetch data for single event with date range as YYYY-MM", () => {
  axios_mock();
  const eventSpec = {
    id: EARTHQUAKE_DISASTER_TYPE_ID,
    name: "earthquake",
    eventTypeDcids: DISASTER_EVENT_TYPES[EARTHQUAKE_DISASTER_TYPE_ID],
    color: DISASTER_EVENT_COLORS[EARTHQUAKE_DISASTER_TYPE_ID],
    defaultSeverityFilter:
      DISASTER_EVENT_SEVERITY_FILTERS[EARTHQUAKE_DISASTER_TYPE_ID],
  };
  return fetchDisasterEventPoints(
    [eventSpec],
    TEST_PLACE,
    [YYYY_MM_DATE, YYYY_MM_DATE_2],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      EARTHQUAKE_EVENT_1_PROCESSED,
      EARTHQUAKE_EVENT_2_PROCESSED,
      EARTHQUAKE_EVENT_3_PROCESSED,
      EARTHQUAKE_EVENT_4_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO,
    });
  });
});

test("fetch data for single event with date range as YYYY-MM-DD", () => {
  axios_mock();
  const eventSpec = {
    id: EARTHQUAKE_DISASTER_TYPE_ID,
    name: "earthquake",
    eventTypeDcids: DISASTER_EVENT_TYPES[EARTHQUAKE_DISASTER_TYPE_ID],
    color: DISASTER_EVENT_COLORS[EARTHQUAKE_DISASTER_TYPE_ID],
    defaultSeverityFilter:
      DISASTER_EVENT_SEVERITY_FILTERS[EARTHQUAKE_DISASTER_TYPE_ID],
  };
  return fetchDisasterEventPoints(
    [eventSpec],
    TEST_PLACE,
    [`${YYYY_MM_DATE}-02`, `${YYYY_MM_DATE_2}-02`],
    DISASTER_EVENT_SEVERITY_FILTERS
  ).then((result) => {
    const expectedEventPoints = [
      EARTHQUAKE_EVENT_2_PROCESSED,
      EARTHQUAKE_EVENT_3_PROCESSED,
    ];
    expect(result.eventPoints).toEqual(
      expect.arrayContaining(expectedEventPoints)
    );
    expect(result.provenanceInfo).toEqual({
      [EARTHQUAKE_PROV_ID]: EARTHQUAKE_PROV_INFO,
    });
  });
});
