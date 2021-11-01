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

import { drawGroupLineChart } from "../chart/draw";

export function axios_mock(): void {
  // Mock all the async axios call.
  axios.get = jest.fn();
  axios.post = jest.fn();

  // get statsvar properties Median_Age_Person
  when(axios.get)
    .calledWith("/api/stats/stats-var-property?dcid=Median_Age_Person")
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
    .calledWith("/api/stats/stats-var-property?dcid=Count_Person")
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
      "/api/stats/stats-var-property?dcid=Median_Age_Person&dcid=Count_Person"
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
    .calledWith("/api/stats/stats-var-property?dcid=NotInTheTree")
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
    .calledWith("/api/place/stat-vars/union", { dcids: ["geoId/05"] })
    .mockResolvedValue({
      data: ["Count_Person", "Median_Age_Person", "NotInTheTree"],
    });

  // get place names, geoId/05
  when(axios.get)
    .calledWith("/api/place/name?dcid=geoId/05")
    .mockResolvedValue({ data: { "geoId/05": "Place" } });

  // get data, geoId/05, Median_Age_Person
  when(axios.post)
    .calledWith("/api/stats", {
      statVars: ["Median_Age_Person"],
      places: ["geoId/05"],
    })
    .mockResolvedValue({
      data: {
        "geoId/05": {
          data: {
            Median_Age_Person: {
              val: {
                "2015": 37.7,
                "2016": 37.7,
                "2017": 37.9,
                "2018": 37.9,
                "2013": 37.5,
                "2012": 37.4,
                "2014": 37.6,
                "2019": 38.1,
                "2011": 37.3,
              },
              metadata: {
                importName: "CensusACS5YearSurvey",
                provenanceUrl: "https://www.census.gov/",
                measurementMethod: "CensusACS5yrSurvey",
                unit: "Year",
              },
            },
          },
        },
      },
    });

  // get data, geoId/05,Count_Person
  when(axios.post)
    .calledWith("/api/stats", {
      statVars: ["Count_Person"],
      places: ["geoId/05"],
    })
    .mockResolvedValue({
      data: {
        "geoId/05": {
          data: {
            Count_Person: {
              val: {
                "2001": 2690743,
                "2012": 2952164,
              },
              metadata: {
                importName: "CensusPEP",
                provenanceUrl:
                  "https://www.census.gov/programs-surveys/popest.html",
                measurementMethod: "CensusPEPSurvey",
              },
            },
          },
        },
      },
    });

  when(axios.post)
    .calledWith("/api/stats", {
      statVars: ["NotInTheTree"],
      places: ["geoId/05"],
    })
    .mockResolvedValue({
      data: {
        "geoId/05": {
          data: {
            NotInTheTree: {
              val: {
                "2001": 2690743,
                "2012": 2952164,
              },
              metadata: {
                importName: "CensusPEP",
                provenanceUrl:
                  "https://www.census.gov/programs-surveys/popest.html",
                measurementMethod: "CensusPEPSurvey",
              },
            },
          },
        },
      },
    });

  when(axios.get)
    .calledWith("/api/place/displayname?&dcid=geoId/05")
    .mockResolvedValue({
      data: {
        "geoId/05": "Arkansas",
      },
    });
  when(axios.get)
    .calledWith("/api/browser/statvar/group?stat_var_group=dc/g/Root")
    .mockResolvedValue({
      data: {
        childStatVarGroups: [
          {
            displayName: "Demographics",
            id: "dc/g/Demographics",
            specializedEntity: "Demographics",
            numDescendentStatVars: 100,
          },
          {
            displayName: "Economics",
            id: "dc/g/Economics",
            specializedEntity: "Economics",
            numDescendentStatVars: 100,
          },
        ],
      },
    });
  when(axios.get)
    .calledWith(
      "/api/browser/statvar/group?stat_var_group=dc%2Fg%2FDemographics&places=geoId/05"
    )
    .mockResolvedValue({
      data: {
        childStatVarGroups: [
          {
            displayName: "Person By Age",
            id: "dc/g/Person_Age",
            specializedEntity: "Age",
            numDescendentStatVars: 5,
          },
          {
            displayName: "Person By ArmedForcesStatus",
            id: "dc/g/Person_ArmedForcesStatus",
            specializedEntity: "ArmedForcesStatus",
            numDescendentStatVars: 5,
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
  when(axios.get)
    .calledWith(
      "/api/browser/statvar/group?stat_var_group=dc/g/Root&places=geoId/05"
    )
    .mockResolvedValue({
      data: {
        childStatVarGroups: [
          {
            displayName: "Demographics",
            id: "dc/g/Demographics",
            specializedEntity: "Demographics",
            numDescendentStatVars: 100,
          },
          {
            displayName: "Economics",
            id: "dc/g/Economics",
            specializedEntity: "Economics",
            numDescendentStatVars: 100,
          },
        ],
      },
    });

  when(axios.get)
    .calledWith("/api/browser/statvar/path?id=Count_Person")
    .mockResolvedValue({
      data: {
        path: ["Count_Person", "dc/g/Demographics"],
      },
    });

  when(axios.get)
    .calledWith("/api/browser/statvar/path?id=Median_Age_Person")
    .mockResolvedValue({
      data: {
        path: ["Median_Age_Person", "dc/g/Demographics"],
      },
    });

  when(axios.get)
    .calledWith("/api/browser/statvar/path?id=NotInTheTree")
    .mockResolvedValue({
      data: {
        path: ["NotInTheTree"],
      },
    });

  when(axios.post)
    .calledWith("/api/stats/stat-var-summary", {
      statVars: ["Count_Person", "Median_Age_Person"],
    })
    .mockResolvedValue({
      data: {
        statVarSummary: {
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
      },
    });
}

// Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
// and jsdom.
export function drawGroupLineChart_mock(): void {
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
