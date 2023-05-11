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

jest.mock("axios");

import axios from "axios";
import * as d3 from "d3";
import { when } from "jest-when";

import { drawGroupLineChart } from "../../chart/draw";
import { stringifyFn } from "../../utils/axios";

export function axiosMock(): void {
  // Mock all the async axios call.
  axios.get = jest.fn();
  axios.post = jest.fn();

  // get statsvar properties Median_Age_Person
  when(axios.get)
    .calledWith("/api/stats/stat-var-property?dcids=Median_Age_Person")
    .mockResolvedValue({
      data: {
        Median_Age_Person: {
          md: "",
          mprop: "age",
          pt: "Person",
          pvs: {},
          title: "Age",
        },
      },
    });

  // get statsvar properties Count_Person
  when(axios.get)
    .calledWith("/api/stats/stat-var-property?dcids=Count_Person")
    .mockResolvedValue({
      data: {
        Count_Person: {
          md: "",
          mprop: "count",
          pt: "Person",
          pvs: {},
          title: "Population",
        },
      },
    });

  // get statsVar info of Median_Age_Person and Count_Person
  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-property?dcids=Median_Age_Person&dcids=Count_Person"
    )
    .mockResolvedValue({
      data: {
        Median_Age_Person: {
          md: "",
          mprop: "age",
          pt: "Person",
          pvs: {},
          title: "Age",
        },
        Count_Person: {
          md: "",
          mprop: "count",
          pt: "Person",
          pvs: {},
          title: "Population",
        },
      },
    });

  when(axios.get)
    .calledWith("/api/stats/stat-var-property?dcids=NotInTheTree")
    .mockResolvedValue({
      data: {
        NotInTheTree: {
          md: "",
          mprop: "count",
          pt: "Person",
          pvs: {},
          title: "",
        },
      },
    });

  // get place stats vars, geoId/05
  when(axios.post)
    .calledWith("/api/observation/existence", {
      entities: ["geoId/05"],
      variables: ["Median_Age_Person"],
    })
    .mockResolvedValue({
      data: {
        Median_Age_Person: {
          "geoId/05": true,
        },
      },
    });

  // get place stats vars, geoId/05
  when(axios.post)
    .calledWith("/api/observation/existence", {
      entities: ["geoId/05"],
      variables: ["Median_Age_Person", "Count_Person"],
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          "geoId/05": true,
        },
        Median_Age_Person: {
          "geoId/05": true,
        },
      },
    });

  // get place stats vars, geoId/05
  when(axios.post)
    .calledWith("/api/observation/existence", {
      entities: ["geoId/05"],
      variables: ["NotInTheTree"],
    })
    .mockResolvedValue({
      data: {
        NotInTheTree: {
          "geoId/05": true,
        },
      },
    });

  // get place stats vars, geoId/05
  when(axios.post)
    .calledWith("/api/observation/existence", {
      entities: ["geoId/05"],
      variables: ["Count_Person"],
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          "geoId/05": true,
        },
      },
    });

  // get place names, geoId/05
  when(axios.post)
    .calledWith("/api/place/name", {
      dcids: ["geoId/05"],
    })
    .mockResolvedValue({ data: { "geoId/05": "Place" } });

  // get data, geoId/05,Count_Person
  when(axios.get)
    .calledWith("/api/observations/series", {
      params: {
        variables: ["Count_Person"],
        entities: ["geoId/05"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
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
          facets: {
            facet1: {
              importName: "CensusPEP",
              provenanceUrl:
                "https://www.census.gov/programs-surveys/popest.html",
              measurementMethod: "CensusPEPSurvey",
            },
          },
        },
      },
    });

  // get stats all data, geoId/05,Median_Age_Person
  when(axios.get)
    .calledWith("/api/observations/series/all", {
      params: {
        entities: ["geoId/05"],
        variables: ["Median_Age_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Median_Age_Person: {
            "geoId/05": [
              {
                series: [
                  {
                    date: "2011",
                    value: 37.3,
                  },
                  {
                    date: "2012",
                    value: 37.4,
                  },
                  {
                    date: "2013",
                    value: 37.5,
                  },
                  {
                    date: "2014",
                    value: 37.6,
                  },
                  {
                    date: "2015",
                    value: 37.7,
                  },
                  {
                    date: "2016",
                    value: 37.7,
                  },
                  {
                    date: "2017",
                    value: 37.9,
                  },
                  {
                    date: "2018",
                    value: 37.9,
                  },
                  {
                    date: "2019",
                    value: 38.1,
                  },
                ],
                facet: "facet1",
              },
            ],
          },
        },
        facets: {
          facet1: {
            importName: "CensusACS5YearSurvey",
            provenanceUrl: "https://www.census.gov/",
            measurementMethod: "CensusACS5yrSurvey",
            unit: "Year",
          },
        },
      },
    });

  // get stats all data, geoId/05,Count_Person
  when(axios.get)
    .calledWith("/api/observations/series/all", {
      params: {
        entities: ["geoId/05"],
        variables: ["Count_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Person: {
            "geoId/05": [
              {
                series: [
                  {
                    date: "2001",
                    value: 2690743,
                  },
                  {
                    date: "2012",
                    value: 2952164,
                  },
                ],
                facet: "facet1",
              },
            ],
          },
        },
        facets: {
          facet1: {
            importName: "CensusPEP",
            provenanceUrl:
              "https://www.census.gov/programs-surveys/popest.html",
            measurementMethod: "CensusPEPSurvey",
          },
        },
      },
    });

  when(axios.get)
    .calledWith("/api/observations/series/all", {
      params: {
        entities: ["geoId/05"],
        variables: ["NotInTheTree"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          NotInTheTree: {
            "geoId/05": [
              {
                series: [
                  {
                    date: "2001",
                    value: 2690743,
                  },
                  {
                    date: "2012",
                    value: 2952164,
                  },
                ],
                facet: "facet1",
              },
            ],
          },
        },
        facets: {
          facet1: {
            importName: "CensusPEP",
            provenanceUrl:
              "https://www.census.gov/programs-surveys/popest.html",
            measurementMethod: "CensusPEPSurvey",
          },
        },
      },
    });

  when(axios.post)
    .calledWith("/api/place/displayname", { dcids: ["geoId/05"] })
    .mockResolvedValue({
      data: {
        "geoId/05": "Arkansas",
      },
    });
  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: [],
      numEntitiesExistence: undefined,
    })
    .mockResolvedValue({
      data: {
        childStatVarGroups: [
          {
            displayName: "Demographics",
            id: "dc/g/Demographics",
            specializedEntity: "Demographics",
            descendentStatVarCount: 100,
          },
          {
            displayName: "Economics",
            id: "dc/g/Economics",
            specializedEntity: "Economics",
            descendentStatVarCount: 100,
          },
        ],
      },
    });
  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/05"],
      numEntitiesExistence: undefined,
    })
    .mockResolvedValue({
      data: {
        childStatVarGroups: [
          {
            displayName: "Person By Age",
            id: "dc/g/Person_Age",
            specializedEntity: "Age",
            descendentStatVarCount: 5,
          },
          {
            displayName: "Person By ArmedForcesStatus",
            id: "dc/g/Person_ArmedForcesStatus",
            specializedEntity: "ArmedForcesStatus",
            descendentStatVarCount: 5,
          },
        ],
        childStatVars: [
          {
            displayName: "Count Of Person",
            id: "Count_Person",
            searchName: "Count Of Person",
            hasData: true,
          },
          {
            displayName: "Median age of person",
            id: "Median_Age_Person",
            searchName: "Median age of person",
            hasData: true,
          },
        ],
      },
    });
  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/05"],
      numEntitiesExistence: undefined,
    })
    .mockResolvedValue({
      data: {
        childStatVarGroups: [
          {
            displayName: "Demographics",
            id: "dc/g/Demographics",
            specializedEntity: "Demographics",
            descendentStatVarCount: 100,
          },
          {
            displayName: "Economics",
            id: "dc/g/Economics",
            specializedEntity: "Economics",
            descendentStatVarCount: 100,
          },
        ],
      },
    });

  when(axios.get)
    .calledWith("/api/variable/path?dcid=Count_Person")
    .mockResolvedValue({
      data: ["Count_Person", "dc/g/Demographics"],
    });

  when(axios.get)
    .calledWith("/api/variable/path?dcid=Median_Age_Person")
    .mockResolvedValue({
      data: ["Median_Age_Person", "dc/g/Demographics"],
    });

  when(axios.get)
    .calledWith("/api/variable/path?dcid=NotInTheTree")
    .mockResolvedValue({
      data: ["NotInTheTree"],
    });

  when(axios.get)
    .calledWith("/api/variable/info", {
      params: {
        dcids: ["Count_Person", "Median_Age_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        Count_Person: {
          placeTypeSummary: {
            type1: {
              numPlaces: 0,
              topPlaces: [],
            },
          },
        },
        Median_Age_Person: {
          placeTypeSummary: {
            type1: {
              numPlaces: 0,
              topPlaces: [],
            },
          },
        },
      },
    });
}

// Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
// and jsdom.
export function drawGroupLineChartMock(): void {
  (drawGroupLineChart as jest.Mock).mockImplementation(
    (selector: string | HTMLDivElement) => {
      let container: d3.Selection<any, any, any, any>;
      if (typeof selector === "string") {
        container = d3.select("#" + selector);
      } else if (selector instanceof HTMLDivElement) {
        container = d3.select(selector);
      } else {
        return;
      }
      container.selectAll("svg").remove();

      const svg = container
        .append("svg")
        .attr("width", 500)
        .attr("height", 500);
      svg.append("text").text("svg text");
    }
  );
}
