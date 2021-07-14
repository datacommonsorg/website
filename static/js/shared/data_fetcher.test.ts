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

import _ from "lodash";
import axios from "axios";

import { fetchStatData, StatData, StatApiResponse } from "./data_fetcher";
import { DataGroup } from "../chart/base";
import { loadLocaleData } from "../i18n/i18n";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  const locale = "en";
  loadLocaleData(locale, [
    import(`../i18n/compiled-lang/${locale}/stats_var_labels.json`),
  ]);
});

interface ReqType {
  places: string[];
  statVars: string[];
}

test("fetch stats data", () => {
  mockedAxios.post.mockImplementation((url: string, data: ReqType) => {
    if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, ["Count_Person", "Count_Person_Male"]) &&
      _.isEqual(data.places, ["geoId/05", "geoId/06"])
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              Count_Person: {
                val: {
                  "2011": 21000,
                  "2012": 22000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
              Count_Person_Male: {
                val: {
                  "2011": 11000,
                  "2012": 13000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
          },
          "geoId/06": {
            data: {
              Count_Person: {
                val: {
                  "2011": 31000,
                  "2012": 32000,
                },
                metadata: {
                  provenanceUrl: "source2",
                },
              },
              Count_Person_Male: {
                val: {
                  "2011": 15000,
                  "2012": 16000,
                },
                metadata: {
                  provenanceUrl: "source2",
                },
              },
            },
          },
        },
      });
    }
  });
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06": "California",
        },
      });
    }
  });

  return fetchStatData(
    ["geoId/05", "geoId/06"],
    ["Count_Person", "Count_Person_Male"]
  ).then((data: StatData) => {
    expect(data).toEqual({
      data: {
        "geoId/05": {
          data: {
            Count_Person_Male: {
              val: {
                "2011": 11000,
                "2012": 13000,
              },
              metadata: {
                provenanceUrl: "source1",
              },
            },
            Count_Person: {
              val: {
                "2011": 21000,
                "2012": 22000,
              },
              metadata: {
                provenanceUrl: "source1",
              },
            },
          },
          name: "Arkansas",
        },
        "geoId/06": {
          data: {
            Count_Person_Male: {
              val: {
                "2011": 15000,
                "2012": 16000,
              },
              metadata: {
                provenanceUrl: "source2",
              },
            },
            Count_Person: {
              val: {
                "2011": 31000,
                "2012": 32000,
              },
              metadata: {
                provenanceUrl: "source2",
              },
            },
          },
          name: "California",
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05", "geoId/06"],
      statVars: ["Count_Person", "Count_Person_Male"],
      sources: new Set(["source1", "source2"]),
      latestCommonDate: "2012",
    });

    expect(data.getStatsVarGroupWithTime("geoId/06")).toEqual([
      new DataGroup("Count_Person", [
        { label: "2011", value: 31000, time: new Date("2011").getTime() },
        { label: "2012", value: 32000, time: new Date("2012").getTime() },
      ]),
      new DataGroup("Count_Person_Male", [
        { label: "2011", value: 15000, time: new Date("2011").getTime() },
        { label: "2012", value: 16000, time: new Date("2012").getTime() },
      ]),
    ]);
  });
});

test("fetch stats data with state code", () => {
  mockedAxios.post.mockImplementation((url: string, data: ReqType) => {
    if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, ["Count_Person"]) &&
      _.isEqual(data.places, ["geoId/05", "geoId/06085"])
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              Count_Person: {
                val: {
                  "2011": 21000,
                  "2012": 22000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
          },
          "geoId/06085": {
            data: {
              Count_Person: {
                val: {
                  "2011": 31000,
                  "2012": 32000,
                },
                metadata: {
                  provenanceUrl: "source2",
                },
              },
            },
          },
        } as StatApiResponse,
      });
    }
  });

  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06085") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06085": "Santa Clara, CA",
        },
      });
    }
  });

  return fetchStatData(["geoId/05", "geoId/06085"], ["Count_Person"]).then(
    (data) => {
      expect(data).toEqual({
        data: {
          "geoId/05": {
            data: {
              Count_Person: {
                val: {
                  "2011": 21000,
                  "2012": 22000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
            name: "Arkansas",
          },
          "geoId/06085": {
            data: {
              Count_Person: {
                val: {
                  "2011": 31000,
                  "2012": 32000,
                },
                metadata: {
                  provenanceUrl: "source2",
                },
              },
            },
            name: "Santa Clara, CA",
          },
        },
        dates: ["2011", "2012"],
        places: ["geoId/05", "geoId/06085"],
        statVars: ["Count_Person"],
        sources: new Set(["source1", "source2"]),
        latestCommonDate: "2012",
      });
    }
  );
});

test("fetch stats data where latest date with data for all stat vars is not the latest date", () => {
  const testData = {
    "geoId/05": {
      data: {
        Count_Person: {
          val: {
            "2011": 21000,
            "2012": 22000,
          },
          metadata: {
            provenanceUrl: "source1",
          },
        },
      },
      name: "Arkansas",
    },
    "geoId/06": {
      data: {
        Count_Person: {
          val: {
            "2011": 31000,
            "2013": 32000,
          },
          metadata: {
            provenanceUrl: "source2",
          },
        },
      },
      name: "California",
    },
  };
  mockedAxios.post.mockImplementation((url: string, data: ReqType) => {
    if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, ["Count_Person"]) &&
      _.isEqual(data.places, ["geoId/05", "geoId/06"])
    ) {
      return Promise.resolve({
        data: testData,
      });
    }
  });
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06": "California",
        },
      });
    }
  });

  return fetchStatData(["geoId/05", "geoId/06"], ["Count_Person"]).then(
    (data) => {
      expect(data).toEqual({
        data: testData,
        dates: ["2011", "2012", "2013"],
        places: ["geoId/05", "geoId/06"],
        statVars: ["Count_Person"],
        sources: new Set(["source1", "source2"]),
        latestCommonDate: "2011",
      });

      expect(data.getStatsVarGroupWithTime("geoId/06")).toEqual([
        new DataGroup("Count_Person", [
          { label: "2011", value: 31000, time: new Date("2011").getTime() },
          { label: "2012", value: null, time: new Date("2012").getTime() },
          { label: "2013", value: 32000, time: new Date("2013").getTime() },
        ]),
      ]);
    }
  );
});

test("fetch stats data where there is no date with data for all stat vars", () => {
  const testData = {
    "geoId/05": {
      data: {
        Count_Person: {
          val: {
            "2010": 21000,
            "2013": 22000,
          },
          metadata: {
            provenanceUrl: "source1",
          },
        },
      },
      name: "Arkansas",
    },
    "geoId/06": {
      data: {
        Count_Person: {
          val: {
            "2011": 31000,
            "2012": 32000,
          },
          metadata: {
            provenanceUrl: "source2",
          },
        },
      },
      name: "California",
    },
  };
  mockedAxios.post.mockImplementation((url: string, data: ReqType) => {
    if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, ["Count_Person"]) &&
      _.isEqual(data.places, ["geoId/05", "geoId/06"])
    ) {
      return Promise.resolve({
        data: testData,
      });
    }
  });
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06": "California",
        },
      });
    }
  });

  return fetchStatData(["geoId/05", "geoId/06"], ["Count_Person"]).then(
    (data) => {
      expect(data).toEqual({
        data: testData,
        dates: ["2010", "2011", "2012", "2013"],
        places: ["geoId/05", "geoId/06"],
        statVars: ["Count_Person"],
        sources: new Set(["source1", "source2"]),
        latestCommonDate: "2013",
      });

      expect(data.getStatsVarGroupWithTime("geoId/06")).toEqual([
        new DataGroup("Count_Person", [
          { label: "2010", value: null, time: new Date("2010").getTime() },
          { label: "2011", value: 31000, time: new Date("2011").getTime() },
          { label: "2012", value: 32000, time: new Date("2012").getTime() },
          { label: "2013", value: null, time: new Date("2013").getTime() },
        ]),
      ]);
    }
  );
});

test("fetch stats data with per capita with population size 0", () => {
  mockedAxios.post.mockImplementation((url: string, data: ReqType) => {
    if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, ["Count_Person"]) &&
      _.isEqual(data.places, ["geoId/05"])
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              Count_Person: {
                val: {
                  "2011": 1100,
                  "2012": 1300,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
            name: "Arkansas",
          },
        },
      });
    } else if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, ["Count_Person_Male"]) &&
      _.isEqual(data.places, ["geoId/05"])
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              Count_Person_Male: {
                val: {
                  "2011": 11000,
                  "2012": 13000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
            name: "Arkansas",
          },
        },
      });
    }
  });

  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/place/displayname?&dcid=geoId/05") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
        },
      });
    }
  });

  return fetchStatData(["geoId/05"], ["Count_Person_Male"], true).then(
    (data) => {
      expect(data).toEqual({
        data: {
          "geoId/05": {
            data: {
              Count_Person_Male: {
                val: {
                  "2011": 10,
                  "2012": 10,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
            name: "Arkansas",
          },
        },
        dates: ["2011", "2012"],
        places: ["geoId/05"],
        sources: new Set(["source1"]),
        statVars: ["Count_Person_Male"],
        latestCommonDate: "2012",
      });
    }
  );
});

test("StatsData test", () => {
  // Test partial data
  const statData = new StatData(
    [],
    [],
    [],
    {
      "geoId/01": { data: {} },
      "geoId/02": {
        data: {
          Count_Person: {
            val: { "1990": 10, "1992": 20 },
            metadata: {
              provenanceUrl: "test.domain",
            },
          },
        },
        name: "Place2",
      },
    },
    ""
  );
  expect(statData.getStatsVarGroupWithTime("geoId/01")).toEqual([]);
});

test("Per capita with specified denominators test", () => {
  mockedAxios.post.mockImplementation((url: string, data: ReqType) => {
    if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, ["Count_Person_Male", "Count_Person_Female"]) &&
      _.isEqual(data.places, ["geoId/05", "geoId/06"])
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              Count_Person_Female: {
                val: {
                  "2011": 20000,
                  "2012": 21000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
              Count_Person_Male: {
                val: {
                  "2011": 60000,
                  "2012": 63000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
            name: "Arkansas",
          },
          "geoId/06": {
            data: {
              Count_Person_Female: {
                val: {
                  "2011": 31000,
                  "2012": 32000,
                },
                metadata: {
                  provenanceUrl: "source2",
                },
              },
              Count_Person_Male: {
                val: {
                  "2011": 31000,
                  "2012": 32000,
                },
                metadata: {
                  provenanceUrl: "source2",
                },
              },
            },
            name: "California",
          },
        },
      });
    } else if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, ["Count_Person"]) &&
      _.isEqual(data.places, ["geoId/05", "geoId/06"])
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              Count_Person: {
                val: {
                  "2011": 80000,
                  "2012": 84000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
            name: "Arkansas",
          },
          "geoId/06": {
            data: {
              Count_Person: {
                val: {
                  "2011": 62000,
                  "2012": 64000,
                },
                metadata: {
                  provenanceUrl: "source2",
                },
              },
            },
            name: "California",
          },
        },
      });
    }
  });
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06": "California",
        },
      });
    }
  });

  return fetchStatData(
    ["geoId/05", "geoId/06"],
    ["Count_Person_Male", "Count_Person_Female"],
    false,
    1,
    {
      Count_Person_Male: "Count_Person",
      Count_Person_Female: "Count_Person",
    }
  ).then((data) => {
    expect(data).toEqual({
      data: {
        "geoId/05": {
          data: {
            Count_Person_Male: {
              val: {
                "2011": 0.75,
                "2012": 0.75,
              },
              metadata: {
                provenanceUrl: "source1",
              },
            },
            Count_Person_Female: {
              val: {
                "2011": 0.25,
                "2012": 0.25,
              },
              metadata: {
                provenanceUrl: "source1",
              },
            },
          },
          name: "Arkansas",
        },
        "geoId/06": {
          data: {
            Count_Person_Female: {
              val: {
                "2011": 0.5,
                "2012": 0.5,
              },
              metadata: {
                provenanceUrl: "source2",
              },
            },
            Count_Person_Male: {
              val: {
                "2011": 0.5,
                "2012": 0.5,
              },
              metadata: {
                provenanceUrl: "source2",
              },
            },
          },
          name: "California",
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05", "geoId/06"],
      statVars: ["Count_Person_Male", "Count_Person_Female"],
      sources: new Set(["source1", "source2"]),
      latestCommonDate: "2012",
    });

    expect(data.getStatsVarGroupWithTime("geoId/06")).toEqual([
      new DataGroup("Count_Person_Male", [
        { label: "2011", value: 0.5, time: new Date("2011").getTime() },
        { label: "2012", value: 0.5, time: new Date("2012").getTime() },
      ]),
      new DataGroup("Count_Person_Female", [
        { label: "2011", value: 0.5, time: new Date("2011").getTime() },
        { label: "2012", value: 0.5, time: new Date("2012").getTime() },
      ]),
    ]);
  });
});

test("Per capita with specified denominators test - missing place data", () => {
  mockedAxios.post.mockImplementation((url: string, data: ReqType) => {
    if (
      url === "/api/stats" &&
      _.isEqual(data.statVars, [
        "UnemploymentRate_Person_Male",
        "UnemploymentRate_Person_Female",
      ]) &&
      _.isEqual(data.places, ["geoId/05", "country/USA"])
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              UnemploymentRate_Person_Female: {
                val: {
                  "2011": 11000,
                  "2012": 12000,
                },
                metadata: {
                  provenanceUrl: "source2",
                },
              },
            },
            name: "Arkansas",
          },
          "country/USA": {
            data: {
              UnemploymentRate_Person_Male: {
                val: {
                  "2011": 21000,
                  "2012": 22000,
                },
                metadata: {
                  provenanceUrl: "source1",
                },
              },
            },
            name: "USA",
          },
        },
      });
    }
  });
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/place/displayname?&dcid=geoId/05&dcid=country/USA") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "country/USA": "USA",
        },
      });
    }
  });

  return fetchStatData(
    ["geoId/05", "country/USA"],
    ["UnemploymentRate_Person_Male", "UnemploymentRate_Person_Female"],
    false,
    1,
    {}
  ).then((data) => {
    expect(data).toEqual({
      data: {
        "geoId/05": {
          data: {
            UnemploymentRate_Person_Female: {
              val: {
                "2011": 11000,
                "2012": 12000,
              },
              metadata: {
                provenanceUrl: "source2",
              },
            },
          },
          name: "Arkansas",
        },
        "country/USA": {
          data: {
            UnemploymentRate_Person_Male: {
              val: {
                "2011": 21000,
                "2012": 22000,
              },
              metadata: {
                provenanceUrl: "source1",
              },
            },
          },
          name: "USA",
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05", "country/USA"],
      statVars: [
        "UnemploymentRate_Person_Male",
        "UnemploymentRate_Person_Female",
      ],
      sources: new Set(["source2", "source1"]),
      latestCommonDate: "2012",
    });

    expect(data.getStatsVarGroupWithTime("geoId/05")).toEqual([
      new DataGroup("UnemploymentRate_Person_Female", [
        { label: "2011", value: 11000, time: new Date("2011").getTime() },
        { label: "2012", value: 12000, time: new Date("2012").getTime() },
      ]),
    ]);
  });
});
