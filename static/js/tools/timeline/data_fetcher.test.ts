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

import { expect } from "@jest/globals";
import axios from "axios";
import { when } from "jest-when";

import { loadLocaleData } from "../../i18n/i18n";
import { SeriesAllApiResponse } from "../../shared/stat_types";
import { stringifyFn } from "../../utils/axios";
import {
  convertToDelta,
  fetchRawData,
  getStatData,
  getStatVarGroupWithTime,
  StatData,
  statDataFromModels,
  TimelineRawData,
} from "./data_fetcher";

function axiosMock(): void {
  axios.get = jest.fn();
  axios.post = jest.fn();
  when(axios.get)
    .calledWith("/api/observations/series", {
      params: {
        variables: ["Count_Person", "Count_Person_Male"],
        entities: ["geoId/05", "geoId/06"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        facets: {
          facet1: {
            provenanceUrl: "source1",
          },
          facet2: {
            provenanceUrl: "source2",
          },
        },
        data: {
          Count_Person: {
            "geoId/05": {
              series: [
                {
                  date: "2011",
                  value: 21000,
                },
                {
                  date: "2012",
                  value: 22000,
                },
              ],
              facet: "facet1",
            },
            "geoId/06": {
              series: [
                {
                  date: "2011",
                  value: 31000,
                },
                {
                  date: "2012",
                  value: 32000,
                },
              ],
              facet: "facet2",
            },
          },
          Count_Person_Male: {
            "geoId/05": {
              series: [
                {
                  date: "2011",
                  value: 11000,
                },
                {
                  date: "2012",
                  value: 13000,
                },
              ],
              facet: "facet1",
            },
            "geoId/06": {
              series: [
                {
                  date: "2011",
                  value: 15000,
                },
                {
                  date: "2012",
                  value: 16000,
                },
              ],
              facet: "facet2",
            },
          },
        },
      },
    });

  when(axios.get)
    .calledWith("/api/observations/series/all", {
      params: {
        variables: ["Count_Person", "Count_Person_Male"],
        entities: ["geoId/05", "geoId/06"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        facets: {
          facet1: {
            provenanceUrl: "source1",
          },
          facet2: {
            provenanceUrl: "source2",
          },
          facetCensus: {
            importName: "CensusPEP",
            provenanceUrl:
              "https://www.census.gov/programs-surveys/popest.html",
            measurementMethod: "CensusPEPSurvey",
          },
        },
        data: {
          Count_Person: {
            "geoId/05": [
              {
                series: [
                  {
                    date: "2011",
                    value: 21000,
                  },
                  {
                    date: "2012",
                    value: 22000,
                  },
                ],
                facet: "facet1",
              },
              {
                series: [
                  {
                    date: "2011",
                    value: 2690743,
                  },
                  {
                    date: "2012",
                    value: 2952164,
                  },
                ],
                facet: "facetCensus",
              },
            ],
            "geoId/06": [
              {
                series: [
                  {
                    date: "2011",
                    value: 31000,
                  },
                  {
                    date: "2012",
                    value: 32000,
                  },
                ],
                facet: "facet2",
              },
            ],
          },
          Count_Person_Male: {
            "geoId/05": [
              {
                series: [
                  {
                    date: "2011",
                    value: 11000,
                  },
                  {
                    date: "2012",
                    value: 13000,
                  },
                ],
                facet: "facet1",
              },
            ],
            "geoId/06": [
              {
                series: [
                  {
                    date: "2011",
                    value: 15000,
                  },
                  {
                    date: "2012",
                    value: 16000,
                  },
                ],
                facet: "facet2",
              },
            ],
          },
        },
      },
    });

  when(axios.post)
    .calledWith(
      "/api/place/displayname",
      { dcids: ["geoId/05", "geoId/06"] },
      expect.anything()
    )
    .mockResolvedValue({
      data: {
        "geoId/05": "Arkansas",
        "geoId/06": "California",
      },
    });
}

beforeAll(() => {
  const locale = "en";
  loadLocaleData(locale, [
    import(`../i18n/compiled-lang/${locale}/stats_var_labels.json`),
  ]);
});

test("fetch raw data", () => {
  axiosMock();
  return fetchRawData(
    ["geoId/05", "geoId/06"],
    ["Count_Person", "Count_Person_Male"],
    ""
  ).then((data: TimelineRawData) => {
    expect(data).toEqual({
      denomData: { data: {}, facets: {} },
      displayNames: {
        "geoId/05": "Arkansas",
        "geoId/06": "California",
      },
      metadataMap: {
        Count_Person: {
          facet1: { provenanceUrl: "source1" },
          facetCensus: {
            importName: "CensusPEP",
            provenanceUrl:
              "https://www.census.gov/programs-surveys/popest.html",
            measurementMethod: "CensusPEPSurvey",
          },
          facet2: { provenanceUrl: "source2" },
        },
        Count_Person_Male: {
          facet1: { provenanceUrl: "source1" },
          facet2: { provenanceUrl: "source2" },
        },
      },
      statAllData: {
        facets: {
          facet1: { provenanceUrl: "source1" },
          facet2: { provenanceUrl: "source2" },
          facetCensus: {
            importName: "CensusPEP",
            provenanceUrl:
              "https://www.census.gov/programs-surveys/popest.html",
            measurementMethod: "CensusPEPSurvey",
          },
        },
        data: {
          Count_Person: {
            "geoId/05": [
              {
                series: [
                  {
                    date: "2011",
                    value: 21000,
                  },
                  {
                    date: "2012",
                    value: 22000,
                  },
                ],
                facet: "facet1",
              },
              {
                series: [
                  {
                    date: "2011",
                    value: 2690743,
                  },
                  {
                    date: "2012",
                    value: 2952164,
                  },
                ],
                facet: "facetCensus",
              },
            ],
            "geoId/06": [
              {
                series: [
                  {
                    date: "2011",
                    value: 31000,
                  },
                  {
                    date: "2012",
                    value: 32000,
                  },
                ],
                facet: "facet2",
              },
            ],
          },
          Count_Person_Male: {
            "geoId/05": [
              {
                facet: "facet1",
                series: [
                  {
                    date: "2011",
                    value: 11000,
                  },
                  {
                    date: "2012",
                    value: 13000,
                  },
                ],
              },
            ],
            "geoId/06": [
              {
                facet: "facet2",
                series: [
                  {
                    date: "2011",
                    value: 15000,
                  },
                  {
                    date: "2012",
                    value: 16000,
                  },
                ],
              },
            ],
          },
        },
      },
    });
  });
});

test("get stats data with state code", () => {
  const rawData: TimelineRawData = {
    denomData: { data: {}, facets: {} },
    metadataMap: {},
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06085": "Santa Clara, CA",
    },
    statAllData: {
      facets: {
        fac1: {
          provenanceUrl: "source1",
        },
        fac2: {
          provenanceUrl: "source2",
        },
      },
      data: {
        Count_Person: {
          "geoId/05": [
            {
              series: [
                {
                  date: "2011",
                  value: 21000,
                },
                {
                  date: "2012",
                  value: 22000,
                },
              ],
              facet: "fac1",
            },
          ],
          "geoId/06085": [
            {
              series: [
                {
                  date: "2011",
                  value: 31000,
                },
                {
                  date: "2012",
                  value: 32000,
                },
              ],
              facet: "fac2",
            },
          ],
        },
      },
    },
  };

  const statData = getStatData(
    rawData,
    ["geoId/05", "geoId/06085"],
    ["Count_Person"],
    {},
    false
  );
  expect(statData).toEqual({
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06085": "Santa Clara, CA",
    },
    data: {
      Count_Person: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 21000,
            },
            {
              date: "2012",
              value: 22000,
            },
          ],
          facet: "fac1",
        },
        "geoId/06085": {
          series: [
            {
              date: "2011",
              value: 31000,
            },
            {
              date: "2012",
              value: 32000,
            },
          ],
          facet: "fac2",
        },
      },
    },
    facets: {
      fac1: {
        provenanceUrl: "source1",
      },
      fac2: {
        provenanceUrl: "source2",
      },
    },
    dates: ["2011", "2012"],
    places: ["geoId/05", "geoId/06085"],
    statVars: ["Count_Person"],
    sources: new Set(["source1", "source2"]),
    measurementMethods: new Set(),
  });
});

test("get stats data where latest date with data for all stat vars is not the latest date", () => {
  const rawData: TimelineRawData = {
    metadataMap: {},
    denomData: { facets: {}, data: {} },
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06": "California",
    },
    statAllData: {
      facets: {
        fac1: {
          provenanceUrl: "source1",
        },
        fac2: {
          provenanceUrl: "source2",
        },
      },
      data: {
        Count_Person: {
          "geoId/05": [
            {
              series: [
                {
                  date: "2011",
                  value: 21000,
                },
                {
                  date: "2012",
                  value: 22000,
                },
              ],
              facet: "fac1",
            },
          ],
          "geoId/06": [
            {
              series: [
                {
                  date: "2011",
                  value: 31000,
                },
                {
                  date: "2013",
                  value: 32000,
                },
              ],
              facet: "fac2",
            },
          ],
        },
      },
    },
  };

  const statData = getStatData(
    rawData,
    ["geoId/05", "geoId/06"],
    ["Count_Person"],
    {},
    false
  );
  expect(statData).toEqual({
    facets: {
      fac1: {
        provenanceUrl: "source1",
      },
      fac2: {
        provenanceUrl: "source2",
      },
    },
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06": "California",
    },
    data: {
      Count_Person: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 21000,
            },
            {
              date: "2012",
              value: 22000,
            },
          ],
          facet: "fac1",
        },
        "geoId/06": {
          series: [
            {
              date: "2011",
              value: 31000,
            },
            {
              date: "2013",
              value: 32000,
            },
          ],
          facet: "fac2",
        },
      },
    },
    dates: ["2011", "2012", "2013"],
    places: ["geoId/05", "geoId/06"],
    statVars: ["Count_Person"],
    sources: new Set(["source1", "source2"]),
    measurementMethods: new Set(),
  });
});

test("get stats data where there is no date with data for all stat vars", () => {
  const rawData: TimelineRawData = {
    metadataMap: {},
    denomData: { data: {}, facets: {} },
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06": "California",
    },
    statAllData: {
      facets: {
        fac1: {
          provenanceUrl: "source1",
        },
        fac2: {
          provenanceUrl: "source2",
        },
      },
      data: {
        Count_Person: {
          "geoId/05": [
            {
              series: [
                {
                  date: "2010",
                  value: 21000,
                },
                {
                  date: "2013",
                  value: 22000,
                },
              ],
              facet: "fac1",
            },
          ],
          "geoId/06": [
            {
              series: [
                {
                  date: "2011",
                  value: 31000,
                },
                {
                  date: "2012",
                  value: 32000,
                },
              ],
              facet: "fac2",
            },
          ],
        },
      },
    },
  };
  const statData = getStatData(
    rawData,
    ["geoId/05", "geoId/06"],
    ["Count_Person"],
    {},
    false
  );
  expect(statData).toEqual({
    data: {
      Count_Person: {
        "geoId/05": {
          series: [
            {
              date: "2010",
              value: 21000,
            },
            {
              date: "2013",
              value: 22000,
            },
          ],
          facet: "fac1",
        },
        "geoId/06": {
          series: [
            {
              date: "2011",
              value: 31000,
            },
            {
              date: "2012",
              value: 32000,
            },
          ],
          facet: "fac2",
        },
      },
    },
    dates: ["2010", "2011", "2012", "2013"],
    places: ["geoId/05", "geoId/06"],
    statVars: ["Count_Person"],
    sources: new Set(["source1", "source2"]),
    measurementMethods: new Set(),
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06": "California",
    },
    facets: {
      fac1: {
        provenanceUrl: "source1",
      },
      fac2: {
        provenanceUrl: "source2",
      },
    },
  });
});

test("get stats data with per capita with population size 0", () => {
  const rawData: TimelineRawData = {
    metadataMap: {},
    denomData: {
      facets: {
        fac1: {
          provenanceUrl: "source1",
        },
      },
      data: {
        Count_Person: {
          "geoId/05": {
            series: [
              {
                date: "2011",
                value: 0,
              },
              {
                date: "2012",
                value: 1300,
              },
            ],
            facet: "fac1",
          },
        },
      },
    },
    displayNames: {
      "geoId/05": "Arkansas",
    },
    statAllData: {
      data: {
        Count_Person_Male: {
          "geoId/05": [
            {
              series: [
                {
                  date: "2011",
                  value: 11000,
                },
                {
                  date: "2012",
                  value: 13000,
                },
              ],
              facet: "fac2",
            },
          ],
        },
      },
      facets: {
        fac2: {
          provenanceUrl: "source2",
        },
      },
    },
  };

  const statData = getStatData(
    rawData,
    ["geoId/05"],
    ["Count_Person_Male"],
    {},
    true,
    "Count_Person"
  );
  expect(statData).toEqual({
    data: {
      Count_Person_Male: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 0,
            },
            {
              date: "2012",
              value: 10,
            },
          ],
          facet: "fac2",
        },
      },
    },
    dates: ["2011", "2012"],
    measurementMethods: new Set(),
    places: ["geoId/05"],
    sources: new Set(["source1", "source2"]),
    statVars: ["Count_Person_Male"],
    displayNames: {
      "geoId/05": "Arkansas",
    },
    facets: {
      fac1: {
        provenanceUrl: "source1",
      },
      fac2: {
        provenanceUrl: "source2",
      },
    },
  });
});

test("get stats data with Per capita with specified denominators", () => {
  const rawData: TimelineRawData = {
    denomData: {
      facets: {
        facet1: {
          provenanceUrl: "source1",
        },
      },
      data: {
        Count_Person: {
          "geoId/05": {
            series: [
              {
                date: "2011",
                value: 80000,
              },
              {
                date: "2012",
                value: 84000,
              },
            ],
            facet: "facet1",
          },
          "geoId/06": {
            series: [
              {
                date: "2011",
                value: 62000,
              },
              {
                date: "2012",
                value: 64000,
              },
            ],
            facet: "facet2",
          },
        },
      },
    },
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06": "California",
    },
    metadataMap: {},
    statAllData: {
      facets: {
        facet1: {
          provenanceUrl: "source1",
        },
        facet2: {
          provenanceUrl: "source2",
        },
      },
      data: {
        Count_Person_Female: {
          "geoId/05": [
            {
              series: [
                {
                  date: "2011",
                  value: 20000,
                },
                {
                  date: "2012",
                  value: 21000,
                },
              ],
              facet: "facet1",
            },
          ],
          "geoId/06": [
            {
              series: [
                {
                  date: "2011",
                  value: 31000,
                },
                {
                  date: "2012",
                  value: 32000,
                },
              ],
              facet: "facet2",
            },
          ],
        },
        Count_Person_Male: {
          "geoId/05": [
            {
              series: [
                {
                  date: "2011",
                  value: 60000,
                },
                {
                  date: "2012",
                  value: 63000,
                },
              ],
              facet: "facet1",
            },
          ],
          "geoId/06": [
            {
              series: [
                {
                  date: "2011",
                  value: 31000,
                },
                {
                  date: "2012",
                  value: 32000,
                },
              ],
              facet: "facet2",
            },
          ],
        },
      },
    },
  };

  const statData = getStatData(
    rawData,
    ["geoId/05", "geoId/06"],
    ["Count_Person_Male", "Count_Person_Female"],
    {},
    true,
    "Count_Person"
  );

  expect(statData).toEqual({
    data: {
      Count_Person_Female: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 0.25,
            },
            {
              date: "2012",
              value: 0.25,
            },
          ],
          facet: "facet1",
        },
        "geoId/06": {
          series: [
            {
              date: "2011",
              value: 0.5,
            },
            {
              date: "2012",
              value: 0.5,
            },
          ],
          facet: "facet2",
        },
      },
      Count_Person_Male: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 0.75,
            },
            {
              date: "2012",
              value: 0.75,
            },
          ],
          facet: "facet1",
        },
        "geoId/06": {
          series: [
            {
              date: "2011",
              value: 0.5,
            },
            {
              date: "2012",
              value: 0.5,
            },
          ],
          facet: "facet2",
        },
      },
    },
    dates: ["2011", "2012"],
    places: ["geoId/05", "geoId/06"],
    statVars: ["Count_Person_Male", "Count_Person_Female"],
    sources: new Set(["source1", "source2"]),
    measurementMethods: new Set(),
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06": "California",
    },
    facets: {
      facet1: {
        provenanceUrl: "source1",
      },
      facet2: {
        provenanceUrl: "source2",
      },
    },
  });
});

test("get stats data with per capita with specified denominators - missing place data", () => {
  const rawData: TimelineRawData = {
    denomData: {
      facets: {
        facet1: {
          provenanceUrl: "source1",
        },
      },
      data: {
        Count_Person: {
          "geoId/05": {
            series: [
              {
                date: "2011",
                value: 80000,
              },
              {
                date: "2012",
                value: 84000,
              },
            ],
            facet: "facet1",
          },
        },
      },
    },
    displayNames: {
      "geoId/05": "Arkansas",
      "country/USA": "USA",
    },
    metadataMap: {},
    statAllData: {
      facets: {
        facet1: {
          provenanceUrl: "source1",
        },
        facet2: {
          provenanceUrl: "source2",
        },
      },
      data: {
        UnemploymentRate_Person_Female: {
          "geoId/05": [
            {
              series: [
                {
                  date: "2011",
                  value: 11000,
                },
                {
                  date: "2012",
                  value: 11760,
                },
              ],
              facet: "facet2",
            },
          ],
          "country/USA": [],
        },
        UnemploymentRate_Person_Male: {
          "geoId/05": [],
          "country/USA": [
            {
              series: [
                {
                  date: "2011",
                  value: 21000,
                },
                {
                  date: "2012",
                  value: 22000,
                },
              ],
              facet: "facet1",
            },
          ],
        },
      },
    },
  };

  const statData = getStatData(
    rawData,
    ["geoId/05", "country/USA"],
    ["UnemploymentRate_Person_Male", "UnemploymentRate_Person_Female"],
    {},
    true,
    "Count_Person"
  );

  expect(statData).toEqual({
    data: {
      UnemploymentRate_Person_Female: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 0.1375,
            },
            {
              date: "2012",
              value: 0.14,
            },
          ],
          facet: "facet2",
        },
      },
    },
    dates: ["2011", "2012"],
    places: ["geoId/05", "country/USA"],
    statVars: [
      "UnemploymentRate_Person_Male",
      "UnemploymentRate_Person_Female",
    ],
    sources: new Set(["source1", "source2"]),
    measurementMethods: new Set(),
    displayNames: {
      "country/USA": "USA",
      "geoId/05": "Arkansas",
    },
    facets: {
      facet1: {
        provenanceUrl: "source1",
      },
      facet2: {
        provenanceUrl: "source2",
      },
    },
  });
});

test("get stat data with specified source", () => {
  const rawData: TimelineRawData = {
    denomData: { data: {}, facets: {} },
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06085": "Santa Clara, CA",
    },
    metadataMap: {
      Count_Person: {
        facet1: {
          importName: "CensusPEP",
          measurementMethod: "CensusPEPSurvey",
          provenanceUrl: "https://www.census.gov/programs-surveys/popest.html",
        },
        facet2: {
          provenanceUrl: "source2",
        },
      },
    },
    statAllData: {
      facets: {
        facet1: {
          importName: "CensusPEP",
          measurementMethod: "CensusPEPSurvey",
          provenanceUrl: "https://www.census.gov/programs-surveys/popest.html",
        },
        facet2: {
          provenanceUrl: "source2",
        },
      },
      data: {
        Count_Person: {
          "geoId/05": [
            {
              series: [
                {
                  date: "2011",
                  value: 2690743,
                },
                {
                  date: "2012",
                  value: 2952164,
                },
              ],
              facet: "facet1",
            },
            {
              series: [
                {
                  date: "2011",
                  value: 21000,
                },
                {
                  date: "2012",
                  value: 22000,
                },
              ],
              facet: "facet2",
            },
          ],
          "geoId/06085": [
            {
              series: [
                {
                  date: "2011",
                  value: 31000,
                },
                {
                  date: "2012",
                  value: 32000,
                },
              ],
              facet: "facet2",
            },
          ],
        },
      },
    },
  };

  const statData = getStatData(
    rawData,
    ["geoId/05", "geoId/06085"],
    ["Count_Person"],
    { Count_Person: "facet1" },
    false
  );
  expect(statData).toEqual({
    data: {
      Count_Person: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 2690743,
            },
            {
              date: "2012",
              value: 2952164,
            },
          ],
          facet: "facet1",
        },
      },
    },
    dates: ["2011", "2012"],
    places: ["geoId/05", "geoId/06085"],
    statVars: ["Count_Person"],
    sources: new Set(["https://www.census.gov/programs-surveys/popest.html"]),
    measurementMethods: new Set(["CensusPEPSurvey"]),
    displayNames: {
      "geoId/05": "Arkansas",
      "geoId/06085": "Santa Clara, CA",
    },
    facets: {
      facet1: {
        importName: "CensusPEP",
        measurementMethod: "CensusPEPSurvey",
        provenanceUrl: "https://www.census.gov/programs-surveys/popest.html",
      },
      facet2: {
        provenanceUrl: "source2",
      },
    },
  });
});

test("StatsData test", () => {
  // Test partial data
  const statData: StatData = {
    places: [],
    statVars: [],
    facets: {
      facet1: {
        provenanceUrl: "source1",
      },
    },
    data: {
      Count_Person: {
        "geoId/01": { series: [] },
        "geoId/02": {
          series: [
            {
              date: "1990",
              value: 10,
            },
            {
              date: "1992",
              value: 20,
            },
          ],
          facet: "facet1",
        },
      },
    },
    dates: [],
    sources: new Set(),
    measurementMethods: new Set(),
  };
  expect(getStatVarGroupWithTime(statData, "geoId/01")).toEqual([]);
});

test("convert to delta", () => {
  let statData: StatData = {
    facets: {},
    data: {
      UnemploymentRate_Person_Female: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 11000,
            },
            {
              date: "2012",
              value: 12000,
            },
          ],
          facet: "facet2",
        },
      },
      UnemploymentRate_Person_Male: {
        "country/USA": {
          series: [
            {
              date: "2011",
              value: 21000,
            },
            {
              date: "2012",
              value: 22000,
            },
          ],
          facet: "facet1",
        },
      },
    },
    dates: ["2011", "2012"],
    places: ["geoId/05", "country/USA"],
    statVars: [
      "UnemploymentRate_Person_Male",
      "UnemploymentRate_Person_Female",
    ],
    sources: new Set(["source2", "source1"]),
    measurementMethods: new Set(),
  };

  const expected: StatData = {
    facets: {},
    data: {
      UnemploymentRate_Person_Female: {
        "geoId/05": {
          series: [
            {
              date: "2012",
              value: 1000,
            },
          ],
          facet: "facet2",
        },
      },
      UnemploymentRate_Person_Male: {
        "country/USA": {
          series: [
            {
              date: "2012",
              value: 1000,
            },
          ],
          facet: "facet1",
        },
      },
    },
    dates: ["2012"],
    places: ["geoId/05", "country/USA"],
    statVars: [
      "UnemploymentRate_Person_Male",
      "UnemploymentRate_Person_Female",
    ],
    sources: new Set(["source2", "source1"]),
    measurementMethods: new Set(),
  };

  statData = convertToDelta(statData);
  expect(statData).toEqual(expected);
});

test("transform from models - multiple places", () => {
  const statData: StatData = {
    facets: {
      facet1: {
        provenanceUrl: "nasa.gov",
        measurementMethod: "NASA_Mean_CCSM4",
        observationPeriod: "P1M",
      },
    },
    data: {
      Max_Temperature_RCP26: {
        "geoId/05": {
          series: [
            {
              date: "2011-01",
              value: 1.0,
            },
            {
              date: "2012-01",
              value: 3.0,
            },
          ],
          facet: "facet1",
        },
        "country/USA": {
          series: [
            {
              date: "2011-01",
              value: 4.0,
            },
            {
              date: "2012-01",
              value: 6.0,
            },
          ],
          facet: "facet1",
        },
      },
    },
    dates: ["2011-01", "2012-01"],
    places: ["geoId/05", "country/USA"],
    statVars: ["Max_Temperature_RCP26"],
    sources: new Set(["nasa.gov"]),
    measurementMethods: new Set(["NASA_Mean_CCSM4"]),
  };

  const modelStatAllResponse: SeriesAllApiResponse = {
    facets: {
      facet1: {
        importName: "model1",
        measurementMethod: "NASA_Mean_CCSM4",
        observationPeriod: "P1M",
        provenanceUrl: "model.nasa.gov",
      },
      facet2: {
        importName: "model2",
        measurementMethod: "NASA_Mean_HadGEM2-AO",
        observationPeriod: "P1M",
        provenanceUrl: "model.nasa.gov",
      },
    },
    data: {
      Max_Temperature_RCP26: {
        "geoId/05": [
          {
            series: [
              {
                date: "2011-01",
                value: 10.0,
              },
              {
                date: "2012-01",
                value: 12.0,
              },
            ],
            facet: "facet1",
          },
          {
            series: [
              {
                date: "2011-01",
                value: 12.0,
              },
              {
                date: "2012-01",
                value: 14.0,
              },
            ],
            facet: "facet2",
          },
        ],
        "country/USA": [
          {
            series: [
              {
                date: "2011-01",
                value: 20.0,
              },
              {
                date: "2012-01",
                value: 22.0,
              },
            ],
            facet: "facet1",
          },
          {
            series: [
              {
                date: "2011-01",
                value: 22.0,
              },
              {
                date: "2012-01",
                value: 24.0,
              },
            ],
            facet: "facet2",
          },
        ],
      },
    },
  };

  const expected: [StatData, StatData] = [
    {
      // Modified mainStatData
      facets: {
        "0": {
          provenanceUrl: "model.nasa.gov",
          measurementMethod: "Mean across models",
          observationPeriod: "P1M",
        },
      },
      data: {
        Max_Temperature_RCP26: {
          "geoId/05": {
            series: [
              {
                date: "2011-01",
                value: 11.0,
              },
              {
                date: "2012-01",
                value: 13.0,
              },
            ],
            facet: "0",
          },
          "country/USA": {
            series: [
              {
                date: "2011-01",
                value: 21.0,
              },
              {
                date: "2012-01",
                value: 23.0,
              },
            ],
            facet: "0",
          },
        },
      },
      dates: ["2011-01", "2012-01"],
      places: ["geoId/05", "country/USA"],
      statVars: ["Max_Temperature_RCP26"],
      sources: new Set(["model.nasa.gov"]),
      measurementMethods: new Set(["Mean across models"]),
    },
    {
      // model StatData
      facets: {
        facet1: {
          importName: "model1",
          measurementMethod: "NASA_Mean_CCSM4",
          observationPeriod: "P1M",
          provenanceUrl: "model.nasa.gov",
        },
        facet2: {
          importName: "model2",
          measurementMethod: "NASA_Mean_HadGEM2-AO",
          observationPeriod: "P1M",
          provenanceUrl: "model.nasa.gov",
        },
      },
      data: {
        "Max_Temperature_RCP26-NASA_Mean_CCSM4": {
          "geoId/05": {
            series: [
              {
                date: "2011-01",
                value: 10.0,
              },
              {
                date: "2012-01",
                value: 12.0,
              },
            ],
            facet: "facet1",
          },
          "country/USA": {
            series: [
              {
                date: "2011-01",
                value: 20.0,
              },
              {
                date: "2012-01",
                value: 22.0,
              },
            ],
            facet: "facet1",
          },
        },
        "Max_Temperature_RCP26-NASA_Mean_HadGEM2-AO": {
          "geoId/05": {
            series: [
              {
                date: "2011-01",
                value: 12.0,
              },
              {
                date: "2012-01",
                value: 14.0,
              },
            ],
            facet: "facet2",
          },
          "country/USA": {
            series: [
              {
                date: "2011-01",
                value: 22.0,
              },
              {
                date: "2012-01",
                value: 24.0,
              },
            ],
            facet: "facet2",
          },
        },
      },
      dates: ["2011-01", "2012-01"],
      places: ["geoId/05", "country/USA"],
      statVars: [
        "Max_Temperature_RCP26",
        "Max_Temperature_RCP26-NASA_Mean_CCSM4",
        "Max_Temperature_RCP26-NASA_Mean_HadGEM2-AO",
      ],
      sources: new Set(["model.nasa.gov"]),
      measurementMethods: new Set(["NASA_Mean_CCSM4", "NASA_Mean_HadGEM2-AO"]),
    },
  ];
  expect(
    statDataFromModels(statData, modelStatAllResponse, [
      "Max_Temperature_RCP26",
    ])
  ).toEqual(expected);
});

test("transform from models - multiple obs periods", () => {
  const statData: StatData = {
    facets: {
      facet1: {
        provenanceUrl: "model.nasa.gov",
        measurementMethod: "NASA_Mean_CCSM4",
        observationPeriod: "P1Y",
      },
    },
    data: {
      Max_Temperature_RCP26: {
        "geoId/05": {
          series: [
            {
              date: "2011",
              value: 1.0,
            },
            {
              date: "2012",
              value: 3.0,
            },
          ],
          facet: "facet1",
        },
      },
    },
    dates: ["2011", "2012"],
    places: ["geoId/05"],
    statVars: ["Max_Temperature_RCP26"],
    sources: new Set(["model.nasa.gov"]),
    measurementMethods: new Set(["NASA_Mean_CCSM4"]),
  };

  const modelStatAllResponse: SeriesAllApiResponse = {
    facets: {
      facet1: {
        importName: "model1",
        measurementMethod: "NASA_Mean_CCSM4",
        observationPeriod: "P1M",
        provenanceUrl: "model.nasa.gov",
      },
      facet2: {
        importName: "model2",
        measurementMethod: "NASA_Mean_HadGEM2-AO",
        observationPeriod: "P1M",
        provenanceUrl: "model.nasa.gov",
      },
      facet3: {
        importName: "model1",
        measurementMethod: "NASA_Mean_CCSM4",
        observationPeriod: "P1Y",
        provenanceUrl: "p1y.nasa.gov",
      },
      facet4: {
        importName: "model2",
        measurementMethod: "NASA_Mean_HadGEM2-AO",
        observationPeriod: "P1Y",
        provenanceUrl: "p1y.nasa.gov",
      },
    },
    data: {
      Max_Temperature_RCP26: {
        "geoId/05": [
          {
            series: [
              {
                date: "2011-01",
                value: 10.0,
              },
              {
                date: "2011-02",
                value: 12.0,
              },
            ],
            facet: "facet1",
          },
          {
            series: [
              {
                date: "2011-01",
                value: 12.0,
              },
              {
                date: "2011-02",
                value: 14.0,
              },
            ],
            facet: "facet2",
          },
          {
            series: [
              {
                date: "2011",
                value: 20.0,
              },
              {
                date: "2012",
                value: 22.0,
              },
            ],
            facet: "facet3",
          },
          {
            series: [
              {
                date: "2011",
                value: 22.0,
              },
              {
                date: "2012",
                value: 24.0,
              },
            ],
            facet: "facet4",
          },
        ],
      },
    },
  };

  const expected: [StatData, StatData] = [
    {
      // Modified mainStatData
      facets: {
        "0": {
          provenanceUrl: "p1y.nasa.gov",
          measurementMethod: "Mean across models",
          observationPeriod: "P1Y",
        },
      },
      data: {
        Max_Temperature_RCP26: {
          "geoId/05": {
            series: [
              {
                date: "2011",
                value: 21.0,
              },
              {
                date: "2012",
                value: 23.0,
              },
            ],
            facet: "0",
          },
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05"],
      statVars: ["Max_Temperature_RCP26"],
      sources: new Set(["p1y.nasa.gov"]),
      measurementMethods: new Set(["Mean across models"]),
    },
    {
      // model StatData
      facets: {
        facet3: {
          importName: "model1",
          measurementMethod: "NASA_Mean_CCSM4",
          observationPeriod: "P1Y",
          provenanceUrl: "p1y.nasa.gov",
        },
        facet4: {
          importName: "model2",
          measurementMethod: "NASA_Mean_HadGEM2-AO",
          observationPeriod: "P1Y",
          provenanceUrl: "p1y.nasa.gov",
        },
      },
      data: {
        "Max_Temperature_RCP26-NASA_Mean_CCSM4": {
          "geoId/05": {
            series: [
              {
                date: "2011",
                value: 20.0,
              },
              {
                date: "2012",
                value: 22.0,
              },
            ],
            facet: "facet3",
          },
        },
        "Max_Temperature_RCP26-NASA_Mean_HadGEM2-AO": {
          "geoId/05": {
            series: [
              {
                date: "2011",
                value: 22.0,
              },
              {
                date: "2012",
                value: 24.0,
              },
            ],
            facet: "facet4",
          },
        },
      },
      dates: ["2011", "2012"],
      places: ["geoId/05"],
      statVars: [
        "Max_Temperature_RCP26",
        "Max_Temperature_RCP26-NASA_Mean_CCSM4",
        "Max_Temperature_RCP26-NASA_Mean_HadGEM2-AO",
      ],
      sources: new Set(["p1y.nasa.gov"]),
      measurementMethods: new Set(["NASA_Mean_CCSM4", "NASA_Mean_HadGEM2-AO"]),
    },
  ];

  expect(
    statDataFromModels(statData, modelStatAllResponse, [
      "Max_Temperature_RCP26",
    ])
  ).toEqual(expected);
});
