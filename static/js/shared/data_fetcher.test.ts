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

import { fetchStatsData, StatsData } from "./data_fetcher";
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
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 31000,
              "2012": 32000,
            },
            placeName: "California",
            provenanceUrl: "source2",
          },
        },
      });
    } else if (
      url === "/api/stats/Count_Person_Male?&dcid=geoId/05&dcid=geoId/06"
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 11000,
              "2012": 13000,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 15000,
              "2012": 16000,
            },
            placeName: "California",
            provenanceUrl: "source2",
          },
        },
      });
    } else if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06": "California",
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
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 15000,
              "2012": 16000,
            },
            placeName: "California",
            provenanceUrl: "source2",
          },
        },
        Count_Person: {
          "geoId/05": {
            data: {
              "2011": 21000,
              "2012": 22000,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 31000,
              "2012": 32000,
            },
            placeName: "California",
            provenanceUrl: "source2",
          },
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05", "geoId/06"],
      statsVars: ["Count_Person", "Count_Person_Male"],
      sources: new Set(["source1", "source2"]),
      latestCommonDate: "2012",
    });

    expect(data.getPlaceGroupWithStatsVar()).toEqual([
      new DataGroup("Arkansas", [
        { label: "Total Population", value: 22000 },
        { label: "Male", value: 13000 },
      ]),
      new DataGroup("California", [
        { label: "Total Population", value: 32000 },
        { label: "Male", value: 16000 },
      ]),
    ]);

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

    expect(data.getTimeGroupWithStatsVar("geoId/06")).toEqual([
      new DataGroup("2011", [
        { label: "Total Population", value: 31000 },
        { label: "Male", value: 15000 },
      ]),
      new DataGroup("2012", [
        { label: "Total Population", value: 32000 },
        { label: "Male", value: 16000 },
      ]),
    ]);

    expect(data.getStatsPoint("geoId/06")).toEqual([
      { label: "Total Population", value: 32000 },
      { label: "Male", value: 16000 },
    ]);
  });
});

test("fetch stats data with state code", () => {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/stats/Count_Person?&dcid=geoId/05&dcid=geoId/06085") {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 21000,
              "2012": 22000,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06085": {
            data: {
              "2011": 31000,
              "2012": 32000,
            },
            placeName: "Santa Clara",
            provenanceUrl: "source2",
          },
        },
      });
    } else if (
      url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06085"
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06085": "Santa Clara, CA",
        },
      });
    }
  });

  return fetchStatsData(["geoId/05", "geoId/06085"], ["Count_Person"]).then(
    (data) => {
      expect(data).toEqual({
        data: {
          Count_Person: {
            "geoId/05": {
              data: {
                "2011": 21000,
                "2012": 22000,
              },
              placeName: "Arkansas",
              provenanceUrl: "source1",
            },
            "geoId/06085": {
              data: {
                "2011": 31000,
                "2012": 32000,
              },
              placeName: "Santa Clara, CA",
              provenanceUrl: "source2",
            },
          },
        },
        dates: ["2011", "2012"],
        places: ["geoId/05", "geoId/06085"],
        statsVars: ["Count_Person"],
        sources: new Set(["source1", "source2"]),
        latestCommonDate: "2012",
      });

      expect(data.getPlaceGroupWithStatsVar()).toEqual([
        new DataGroup("Arkansas", [
          { label: "Total Population", value: 22000 },
        ]),
        new DataGroup("Santa Clara, CA", [
          { label: "Total Population", value: 32000 },
        ]),
      ]);
    }
  );
});

test("fetch stats data where latest date with data for all stat vars is not the latest date", () => {
  const testData = {
    "geoId/05": {
      data: {
        "2011": 21000,
        "2012": 22000,
      },
      placeName: "Arkansas",
      provenanceUrl: "source1",
    },
    "geoId/06": {
      data: {
        "2011": 31000,
        "2013": 32000,
      },
      placeName: "California",
      provenanceUrl: "source2",
    },
  };
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/stats/Count_Person?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: testData,
      });
    } else if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06": "California",
        },
      });
    }
  });

  return fetchStatsData(["geoId/05", "geoId/06"], ["Count_Person"]).then(
    (data) => {
      expect(data).toEqual({
        data: {
          Count_Person: testData,
        },
        dates: ["2011", "2012", "2013"],
        places: ["geoId/05", "geoId/06"],
        statsVars: ["Count_Person"],
        sources: new Set(["source1", "source2"]),
        latestCommonDate: "2011",
      });

      expect(data.getPlaceGroupWithStatsVar()).toEqual([
        new DataGroup("Arkansas", [
          { label: "Total Population", value: 21000 },
        ]),
        new DataGroup("California", [
          { label: "Total Population", value: 31000 },
        ]),
      ]);

      expect(data.getStatsVarGroupWithTime("geoId/06")).toEqual([
        new DataGroup("Count_Person", [
          { label: "2011", value: 31000, time: new Date("2011").getTime() },
          { label: "2012", value: null, time: new Date("2012").getTime() },
          { label: "2013", value: 32000, time: new Date("2013").getTime() },
        ]),
      ]);

      expect(data.getTimeGroupWithStatsVar("geoId/06")).toEqual([
        new DataGroup("2011", [{ label: "Total Population", value: 31000 }]),
        new DataGroup("2012", [
          { label: "Total Population", value: undefined },
        ]),
        new DataGroup("2013", [{ label: "Total Population", value: 32000 }]),
      ]);

      expect(data.getStatsPoint("geoId/06")).toEqual([
        { label: "Total Population", value: 31000 },
      ]);
    }
  );
});

test("fetch stats data where there is no date with data for all stat vars", () => {
  const testData = {
    "geoId/05": {
      data: {
        "2010": 21000,
        "2013": 22000,
      },
      placeName: "Arkansas",
      provenanceUrl: "source1",
    },
    "geoId/06": {
      data: {
        "2011": 31000,
        "2012": 32000,
      },
      placeName: "California",
      provenanceUrl: "source2",
    },
  };
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/stats/Count_Person?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: testData,
      });
    } else if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06": "California",
        },
      });
    }
  });

  return fetchStatsData(["geoId/05", "geoId/06"], ["Count_Person"]).then(
    (data) => {
      expect(data).toEqual({
        data: {
          Count_Person: testData,
        },
        dates: ["2010", "2011", "2012", "2013"],
        places: ["geoId/05", "geoId/06"],
        statsVars: ["Count_Person"],
        sources: new Set(["source1", "source2"]),
        latestCommonDate: "2013",
      });

      expect(data.getPlaceGroupWithStatsVar()).toEqual([
        new DataGroup("Arkansas", [
          { label: "Total Population", value: 22000 },
        ]),
      ]);

      expect(data.getStatsVarGroupWithTime("geoId/06")).toEqual([
        new DataGroup("Count_Person", [
          { label: "2010", value: null, time: new Date("2010").getTime() },
          { label: "2011", value: 31000, time: new Date("2011").getTime() },
          { label: "2012", value: 32000, time: new Date("2012").getTime() },
          { label: "2013", value: null, time: new Date("2013").getTime() },
        ]),
      ]);

      expect(data.getTimeGroupWithStatsVar("geoId/06")).toEqual([
        new DataGroup("2010", [
          { label: "Total Population", value: undefined },
        ]),
        new DataGroup("2011", [{ label: "Total Population", value: 31000 }]),
        new DataGroup("2012", [{ label: "Total Population", value: 32000 }]),
        new DataGroup("2013", [
          { label: "Total Population", value: undefined },
        ]),
      ]);

      expect(data.getStatsPoint("geoId/06")).toEqual([
        { label: "Total Population", value: 0 },
      ]);
    }
  );
});

test("fetch stats data from cache where latest date with data for all stat vars is not the latest date", () => {
  return fetchStatsData(
    ["geoId/05", "geoId/06"],
    ["Count_Person"],
    false,
    1,
    [],
    {
      "geoId/05": {
        Count_Person: {
          data: {
            "2011": 1300,
            "2012": 2100,
          },
          provenanceUrl: "source1",
        },
      },
      "geoId/06": {
        Count_Person: {
          data: {
            "2011": 200,
            "2013": 300,
          },
          provenanceUrl: "source2",
        },
      },
    }
  ).then((data) => {
    expect(data).toEqual({
      data: {
        Count_Person: {
          "geoId/05": {
            data: {
              "2011": 1300,
              "2012": 2100,
            },
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 200,
              "2013": 300,
            },
            provenanceUrl: "source2",
          },
        },
      },
      dates: ["2011", "2012", "2013"],
      places: ["geoId/05", "geoId/06"],
      statsVars: ["Count_Person"],
      sources: new Set(["source1", "source2"]),
      latestCommonDate: "2011",
    });
  });
});

test("fetch stats data from cache where there is no date with data for all stat vars", () => {
  return fetchStatsData(
    ["geoId/05", "geoId/06"],
    ["Count_Person"],
    false,
    1,
    [],
    {
      "geoId/05": {
        Count_Person: {
          data: {
            "2010": 1300,
            "2012": 2100,
          },
          provenanceUrl: "source1",
        },
      },
      "geoId/06": {
        Count_Person: {
          data: {
            "2011": 200,
            "2013": 300,
          },
          provenanceUrl: "source2",
        },
      },
    }
  ).then((data) => {
    expect(data).toEqual({
      data: {
        Count_Person: {
          "geoId/05": {
            data: {
              "2010": 1300,
              "2012": 2100,
            },
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 200,
              "2013": 300,
            },
            provenanceUrl: "source2",
          },
        },
      },
      dates: ["2010", "2011", "2012", "2013"],
      places: ["geoId/05", "geoId/06"],
      statsVars: ["Count_Person"],
      sources: new Set(["source1", "source2"]),
      latestCommonDate: "2013",
    });
  });
});

test("fetch stats data with per capita with population size 0", () => {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/stats/Count_Person?&dcid=geoId/05") {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 0,
              "2012": 0,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
        },
      });
    } else if (url === "/api/stats/Count_Person_Male?&dcid=geoId/05") {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 11000,
              "2012": 13000,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
        },
      });
    } else if (url === "/api/place/displayname?&dcid=geoId/05") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
        },
      });
    }
  });

  return fetchStatsData(["geoId/05"], ["Count_Person_Male"], true).then(
    (data) => {
      expect(data).toEqual({
        data: {
          Count_Person_Male: {
            "geoId/05": {
              data: {
                "2011": 0,
                "2012": 0,
              },
              placeName: "Arkansas",
              provenanceUrl: "source1",
            },
          },
        },
        dates: ["2011", "2012"],
        places: ["geoId/05"],
        sources: new Set(["source1"]),
        statsVars: ["Count_Person_Male"],
        latestCommonDate: "2012",
      });
    }
  );
});

test("StatsData test", () => {
  // Test partial data
  const statsData = new StatsData(
    [],
    [],
    [],
    {
      Count_Person: {
        "geoId/01": null,
        "geoId/02": {
          placeDcid: "geoId/02",
          placeName: "Place2",
          provenanceUrl: "test.domain",
          data: { "1990": 10, "1992": 20 },
        },
      },
    },
    ""
  );
  expect(statsData.getStatsVarGroupWithTime("geoId/01")).toEqual([]);
});

test("Per capita with specified denominators test", () => {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/api/stats/Count_Person_Female?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 21000,
              "2012": 22000,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 31000,
              "2012": 32000,
            },
            placeName: "California",
            provenanceUrl: "source2",
          },
        },
      });
    } else if (
      url === "/api/stats/Count_Person_Male?&dcid=geoId/05&dcid=geoId/06"
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 11000,
              "2012": 13000,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 15000,
              "2012": 16000,
            },
            placeName: "California",
            provenanceUrl: "source2",
          },
        },
      });
    } else if (url === "/api/place/displayname?&dcid=geoId/05&dcid=geoId/06") {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "geoId/06": "California",
        },
      });
    }
  });

  return fetchStatsData(
    ["geoId/05", "geoId/06"],
    ["Count_Person_Male", "Count_Person_Female"],
    false,
    1,
    ["Count_Person_Male", "Count_Person_Female"]
  ).then((data) => {
    expect(data).toEqual({
      data: {
        Count_Person_Male: {
          "geoId/05": {
            data: {
              "2011": 1,
              "2012": 1,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 1,
              "2012": 1,
            },
            placeName: "California",
            provenanceUrl: "source2",
          },
        },
        Count_Person_Female: {
          "geoId/05": {
            data: {
              "2011": 1,
              "2012": 1,
            },
            placeName: "Arkansas",
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 1,
              "2012": 1,
            },
            placeName: "California",
            provenanceUrl: "source2",
          },
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05", "geoId/06"],
      statsVars: ["Count_Person_Male", "Count_Person_Female"],
      sources: new Set(["source1", "source2"]),
      latestCommonDate: "2012",
    });

    expect(data.getPlaceGroupWithStatsVar()).toEqual([
      new DataGroup("Arkansas", [
        { label: "Male", value: 1 },
        { label: "Female", value: 1 },
      ]),
      new DataGroup("California", [
        { label: "Male", value: 1 },
        { label: "Female", value: 1 },
      ]),
    ]);

    expect(data.getStatsVarGroupWithTime("geoId/06")).toEqual([
      new DataGroup("Count_Person_Male", [
        { label: "2011", value: 1, time: new Date("2011").getTime() },
        { label: "2012", value: 1, time: new Date("2012").getTime() },
      ]),
      new DataGroup("Count_Person_Female", [
        { label: "2011", value: 1, time: new Date("2011").getTime() },
        { label: "2012", value: 1, time: new Date("2012").getTime() },
      ]),
    ]);

    expect(data.getTimeGroupWithStatsVar("geoId/06")).toEqual([
      new DataGroup("2011", [
        { label: "Male", value: 1 },
        { label: "Female", value: 1 },
      ]),
      new DataGroup("2012", [
        { label: "Male", value: 1 },
        { label: "Female", value: 1 },
      ]),
    ]);

    expect(data.getStatsPoint("geoId/06")).toEqual([
      { label: "Male", value: 1 },
      { label: "Female", value: 1 },
    ]);
  });
});

test("Per capita with specified denominators test from cache", () => {
  return fetchStatsData(
    ["geoId/05", "geoId/06"],
    ["Count_Person_Male", "Count_Person_Female"],
    false,
    1,
    ["Count_Person_Male", "Count_Person_Female"],
    {
      "geoId/05": {
        Count_Person_Male: {
          data: {
            "2011": 1300,
            "2012": 2100,
          },
          provenanceUrl: "source1",
        },
        Count_Person_Female: {
          data: {
            "2011": 500,
            "2012": 300,
          },
          provenanceUrl: "source1",
        },
      },
      "geoId/06": {
        Count_Person_Male: {
          data: {
            "2011": 200,
            "2012": 300,
          },
          provenanceUrl: "source2",
        },
        Count_Person_Female: {
          data: {
            "2011": 1000,
            "2012": 3000,
          },
          provenanceUrl: "source2",
        },
      },
    }
  ).then((data) => {
    expect(data).toEqual({
      data: {
        Count_Person_Male: {
          "geoId/05": {
            data: {
              "2011": 1,
              "2012": 1,
            },
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 1,
              "2012": 1,
            },
            provenanceUrl: "source2",
          },
        },
        Count_Person_Female: {
          "geoId/05": {
            data: {
              "2011": 1,
              "2012": 1,
            },
            provenanceUrl: "source1",
          },
          "geoId/06": {
            data: {
              "2011": 1,
              "2012": 1,
            },
            provenanceUrl: "source2",
          },
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05", "geoId/06"],
      statsVars: ["Count_Person_Male", "Count_Person_Female"],
      sources: new Set(["source1", "source2"]),
      latestCommonDate: "2012",
    });
  });
});

test("Per capita with specified denominators test - missing place data", () => {
  mockedAxios.get.mockImplementation((url: string) => {
    if (
      url ===
      "/api/stats/UnemploymentRate_Person_Male?&dcid=geoId/05&dcid=country/USA"
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": null,
          "country/USA": {
            data: {
              "2011": 21000,
              "2012": 22000,
            },
            placeName: "USA",
            provenanceUrl: "source1",
          },
        },
      });
    } else if (
      url ===
      "/api/stats/UnemploymentRate_Person_Female?&dcid=geoId/05&dcid=country/USA"
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": {
            data: {
              "2011": 1,
              "2012": 2,
            },
            placeName: "Arkansas",
            provenanceUrl: "source2",
          },
          "country/USA": null,
        },
      });
    } else if (
      url === "/api/place/displayname?&dcid=geoId/05&dcid=country/USA"
    ) {
      return Promise.resolve({
        data: {
          "geoId/05": "Arkansas",
          "country/USA": "USA",
        },
      });
    }
  });

  return fetchStatsData(
    ["geoId/05", "country/USA"],
    ["UnemploymentRate_Person_Male", "UnemploymentRate_Person_Female"],
    false,
    1,
    []
  ).then((data) => {
    expect(data).toEqual({
      data: {
        UnemploymentRate_Person_Male: {
          "geoId/05": null,
          "country/USA": {
            data: {
              "2011": 21000,
              "2012": 22000,
            },
            placeName: "USA",
            provenanceUrl: "source1",
          },
        },
        UnemploymentRate_Person_Female: {
          "geoId/05": {
            data: {
              "2011": 1,
              "2012": 2,
            },
            placeName: "Arkansas",
            provenanceUrl: "source2",
          },
          "country/USA": null,
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05", "country/USA"],
      statsVars: [
        "UnemploymentRate_Person_Male",
        "UnemploymentRate_Person_Female",
      ],
      sources: new Set(["source1", "source2"]),
      latestCommonDate: "2012",
    });

    expect(data.getPlaceGroupWithStatsVar()).toEqual([
      new DataGroup("Arkansas", [{ label: "Female", value: 2 }]),
      new DataGroup("USA", [{ label: "Male", value: 22000 }]),
    ]);

    expect(data.getStatsVarGroupWithTime("geoId/05")).toEqual([
      new DataGroup("UnemploymentRate_Person_Female", [
        { label: "2011", value: 1, time: new Date("2011").getTime() },
        { label: "2012", value: 2, time: new Date("2012").getTime() },
      ]),
    ]);

    expect(data.getTimeGroupWithStatsVar("geoId/05")).toEqual([
      new DataGroup("2011", [{ label: "Female", value: 1 }]),
      new DataGroup("2012", [{ label: "Female", value: 2 }]),
    ]);

    expect(data.getStatsPoint("geoId/05")).toEqual([
      { label: "Female", value: 2 },
    ]);
  });
});

test("getTimeGroupWithStatsVar with missing data", () => {
  const statsData = new StatsData(
    ["geoId/05"],
    ["Count_Person_Female", "Count_Person_Male"],
    ["2011", "2012", "2013"],
    {
      Count_Person_Female: {
        "geoId/05": {
          data: {
            "2012": 150,
            "2013": 0,
          },
          placeName: "Arkansas",
          provenanceUrl: "source1",
        },
      },
      Count_Person_Male: {
        "geoId/05": {
          data: {
            "2011": 11000,
            "2012": 13000,
          },
          placeName: "Arkansas",
          provenanceUrl: "source1",
        },
      },
    },
    "2012"
  );

  expect(statsData.getTimeGroupWithStatsVar("geoId/05")).toEqual([
    new DataGroup("2011", [
      { label: "Female", value: undefined },
      { label: "Male", value: 11000 },
    ]),
    new DataGroup("2012", [
      { label: "Female", value: 150 },
      { label: "Male", value: 13000 },
    ]),
    new DataGroup("2013", [
      { label: "Female", value: undefined },
      { label: "Male", value: undefined },
    ]),
  ]);
});
