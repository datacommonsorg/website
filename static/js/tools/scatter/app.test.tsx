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

import { waitFor } from "@testing-library/react";
import axios from "axios";
import Cheerio from "cheerio";
import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { when } from "jest-when";
import React, { useEffect } from "react";

import { App } from "./app";
import { Context, EmptyPlace, useContextStore } from "./context";

Enzyme.configure({ adapter: new Adapter() });

function TestApp(): JSX.Element {
  const context = useContextStore();
  useEffect(() => {
    context.place.set({
      ...EmptyPlace,
      enclosingPlace: {
        name: "Delaware",
        dcid: "",
        types: null,
      },
    });
  }, []);
  return (
    <Context.Provider value={context}>
      <App />
    </Context.Provider>
  );
}

function mockAxios(): () => void {
  const get = axios.get;
  axios.get = jest.fn();

  // Counties in Delaware
  when(axios.get)
    .calledWith(`/api/place/places-in-names?dcid=geoId/10&placeType=County`)
    .mockResolvedValue({
      data: {
        "geoId/10001": "Kent County",
        "geoId/10003": "New Castle County",
        "geoId/10005": "Sussex County",
      },
    });

  // Population and statvar data
  const data = {
    Count_Person_Employed: {
      metadata: {
        BLS_LAUS: {
          provenanceUrl: "https://www.bls.gov/lau/",
          measurementMethod: "BLSSeasonallyUnadjusted",
        },
      },
      stat: {
        "geoId/10001": {
          date: "2016",
          metadata: {
            importName: "BLS_LAUS",
          },
          value: 76726,
        },
        "geoId/10003": {
          date: "2016",
          metadata: {
            importName: "BLS_LAUS",
          },
          value: 276517,
        },
        "geoId/10005": {
          date: "2016",
          metadata: {
            importName: "BLS_LAUS",
          },
          value: 104845,
        },
      },
    },
    Count_Establishment: {
      metadata: {
        CensusCountyBusinessPatterns: {
          provenanceUrl: "https://www.census.gov/",
          measurementMethod: "CensusCBPSurvey",
        },
      },
      stat: {
        "geoId/10001": {
          date: "2016",
          metadata: {
            importName: "CensusCountyBusinessPatterns",
          },
          value: 3422,
        },
        "geoId/10003": {
          date: "2016",
          metadata: {
            importName: "CensusCountyBusinessPatterns",
          },
          value: 16056,
        },
        "geoId/10005": {
          date: "2016",
          metadata: {
            importName: "CensusCountyBusinessPatterns",
          },
          value: 5601,
        },
      },
    },
    Count_HousingUnit: {
      metadata: {
        CensusACS5YearSurvey: {
          provenanceUrl: "https://www.census.gov/",
          measurementMethod: "CensusACS5yrSurvey",
        },
      },
      stat: {
        "geoId/10001": {
          date: "2016",
          metadata: {
            importName: "CensusACS5YearSurvey",
          },
          value: 70576,
        },
        "geoId/10003": {
          date: "2016",
          metadata: {
            importName: "CensusACS5YearSurvey",
          },
          value: 222146,
        },
        "geoId/10005": {
          date: "2016",
          metadata: {
            importName: "CensusACS5YearSurvey",
          },
          value: 135529,
        },
      },
    },
  };

  const rootGroupsData = {
    data: {
      childStatVarGroups: [
        {
          displayName: "Demographics",
          id: "dc/g/Demographics",
          specializedEntity: "Demographics",
          descendentStatVarCount: 2,
        },
        {
          displayName: "Economics",
          id: "dc/g/Economics",
          specializedEntity: "Economics",
          descendentStatVarCount: 2,
        },
      ],
    },
  };

  const demographicsGroupsData = {
    data: {
      childStatVarGroups: [
        {
          displayName: "Person By Age",
          id: "dc/g/Person_Age",
          specializedEntity: "Age",
          descendentStatVarCount: 2,
        },
        {
          displayName: "Person By ArmedForcesStatus",
          id: "dc/g/Person_ArmedForcesStatus",
          specializedEntity: "ArmedForcesStatus",
          descendentStatVarCount: 2,
        },
      ],
      childStatVars: [
        {
          displayName: "Count Employed",
          id: "Count_Person_Employed",
          searchName: "Count Of Person Employed",
          hasData: true,
        },
        {
          displayName: "Count Housing Unit",
          id: "Count_HousingUnit",
          searchName: "Count Housing Unit",
          hasData: true,
        },
        {
          displayName: "Count Establishment",
          id: "Count_Establishment",
          searchName: "Count Establishment",
          hasData: true,
        },
      ],
    },
  };

  const statVarInfoData = {
    data: {
      Count_Person_Employed: {
        title: "Employed",
      },
      Count_Establishment: {
        title: "Number Of Establishments",
      },
      Count_HousingUnit: {
        title: "Housing Units",
      },
    },
  };

  const pathsData = {
    Count_Person_Employed: {
      path: ["Count_Person_Employed", "dc/g/Demographics"],
    },
    Count_Establishment: {
      path: ["Count_Establishment", "dc/g/Economics"],
    },
    Count_HousingUnit: {
      path: ["Count_HousingUnit", "dc/g/Demographics"],
    },
  };

  when(axios.get)
    .calledWith(
      "/api/stats/within-place?parent_place=geoId/10&child_type=County" +
        "&stat_vars=Count_Person_Employed&stat_vars=Count_Establishment"
    )
    .mockResolvedValue({
      data: {
        Count_Person_Employed: data.Count_Person_Employed,
        Count_Establishment: data.Count_Establishment,
      },
    });
  when(axios.get)
    .calledWith(
      "/api/stats/within-place?parent_place=geoId/10&child_type=County" +
        "&stat_vars=Count_Person_Employed&stat_vars=Count_HousingUnit"
    )
    .mockResolvedValue({
      data: {
        Count_Person_Employed: data.Count_Person_Employed,
        Count_HousingUnit: data.Count_HousingUnit,
      },
    });
  const post = axios.post;
  axios.post = jest.fn();

  when(axios.post)
    .calledWith("/api/stats/Count_Person", {
      dcid: ["geoId/10001", "geoId/10003", "geoId/10005"],
    })
    .mockResolvedValue({
      data: {
        "geoId/10001": {
          data: {
            "2016": 180786,
          },
          placeName: "Kent County",
          provenanceUrl: "https://www.census.gov/programs-surveys/popest.html",
        },
        "geoId/10003": {
          data: {
            "2016": 558753,
          },
          placeName: "Kent County",
          provenanceUrl: "https://www.census.gov/programs-surveys/popest.html",
        },
        "geoId/10005": {
          data: {
            "2016": 234225,
          },
          placeName: "Kent County",
          provenanceUrl: "https://www.census.gov/programs-surveys/popest.html",
        },
      },
    });

  when(axios.get)
    .calledWith("/api/place/parent/geoId/10")
    .mockResolvedValue({
      data: ["country/USA"],
    });

  when(axios.get).calledWith("/api/place/type/geoId/10").mockResolvedValue({
    data: "State",
  });

  when(axios.get)
    .calledWith("/api/place/places-in?dcid=geoId/10&placeType=County")
    .mockResolvedValue({
      data: {
        "geoId/10": ["geoId/10001", "geoId/10003", "geoId/10005"],
      },
    });

  when(axios.get)
    .calledWith("/api/stats/stat-var-group?stat_var_group=dc/g/Root")
    .mockResolvedValue(rootGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc/g/Root&entities=geoId/10001&entities=geoId/10003&entities=geoId/10005"
    )
    .mockResolvedValue(rootGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc/g/Root&entities=geoId/10001&entities=geoId/10005&entities=geoId/10003"
    )
    .mockResolvedValue(rootGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc/g/Root&entities=geoId/10003&entities=geoId/10001&entities=geoId/10005"
    )
    .mockResolvedValue(rootGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc/g/Root&entities=geoId/10003&entities=geoId/10005&entities=geoId/10001"
    )
    .mockResolvedValue(rootGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc/g/Root&entities=geoId/10005&entities=geoId/10003&entities=geoId/10001"
    )
    .mockResolvedValue(rootGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc/g/Root&entities=geoId/10005&entities=geoId/10001&entities=geoId/10003"
    )
    .mockResolvedValue(rootGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc%2Fg%2FDemographics&entities=geoId/10001&entities=geoId/10003&entities=geoId/10005"
    )
    .mockResolvedValue(demographicsGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc%2Fg%2FDemographics&entities=geoId/10001&entities=geoId/10005&entities=geoId/10003"
    )
    .mockResolvedValue(demographicsGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc%2Fg%2FDemographics&entities=geoId/10003&entities=geoId/10001&entities=geoId/10005"
    )
    .mockResolvedValue(demographicsGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc%2Fg%2FDemographics&entities=geoId/10003&entities=geoId/10005&entities=geoId/10001"
    )
    .mockResolvedValue(demographicsGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc%2Fg%2FDemographics&entities=geoId/10005&entities=geoId/10003&entities=geoId/10001"
    )
    .mockResolvedValue(demographicsGroupsData);

  when(axios.get)
    .calledWith(
      "/api/stats/stat-var-group?stat_var_group=dc%2Fg%2FDemographics&entities=geoId/10005&entities=geoId/10001&entities=geoId/10003"
    )
    .mockResolvedValue(demographicsGroupsData);

  when(axios.get)
    .calledWith("/api/stats/stats-var-property?dcid=Count_Establishment")
    .mockResolvedValue(statVarInfoData);

  when(axios.get)
    .calledWith("/api/stats/stats-var-property?dcid=Count_HousingUnit")
    .mockResolvedValue(statVarInfoData);

  when(axios.get)
    .calledWith("/api/stats/stats-var-property?dcid=Count_Person_Employed")
    .mockResolvedValue(statVarInfoData);

  when(axios.get)
    .calledWith("/api/stats/stat-var-path?id=Count_Establishment")
    .mockResolvedValue({ data: pathsData.Count_Establishment });

  when(axios.get)
    .calledWith("/api/stats/stat-var-path?id=Count_HousingUnit")
    .mockResolvedValue({ data: pathsData.Count_HousingUnit });

  when(axios.get)
    .calledWith("/api/stats/stat-var-path?id=Count_Person_Employed")
    .mockResolvedValue({ data: pathsData.Count_Person_Employed });

  when(axios.post)
    .calledWith("/api/stats/stat-var-summary", {
      statVars: [
        "Count_Person_Employed",
        "Count_HousingUnit",
        "Count_Establishment",
      ],
    })
    .mockResolvedValue({
      data: {
        statVarSummary: {
          Count_Person_Employed: {
            placeTypeSummary: {
              type1: {
                numPlaces: 0,
                topPlaces: [],
              },
            },
          },
          Count_HousingUnit: {
            placeTypeSummary: {
              type1: {
                numPlaces: 0,
                topPlaces: [],
              },
            },
          },
          Count_Establishment: {
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
  return () => {
    axios.get = get;
    axios.post = post;
  };
}

function expectCircles(n: number, app: Enzyme.ReactWrapper): void {
  const $ = Cheerio.load(app.html());
  expect($("circle").length).toEqual(n);
}

test("all functionalities", async () => {
  mockAxios();
  const app = mount(<TestApp />);
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      "/api/stats/stat-var-group?stat_var_group=dc/g/Root"
    );
  });
  return Promise.resolve(app)
    .then(() => app.update())
    .then(() => app.update())
    .then(() => app.update())
    .then(() => app.update())
    .then(() => {
      app.update();
      // Select county as child place type
      app
        .find("#place-selector-place-type")
        .at(0)
        .simulate("change", { target: { value: "County" } });
      waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/place/places-in?dcid=geoId/10&placeType=County"
        );
      }).then(() => {
        app.update();
        app
          .find("#hierarchy-section .Collapsible__trigger")
          .at(0)
          .simulate("click");
        Promise.resolve(app).then(() => {
          app.update();
          app
            .find("#hierarchy-section input")
            .at(0)
            .simulate("change", { target: { checked: true } });
          app.update();
          app
            .find("#hierarchy-section input")
            .at(1)
            .simulate("change", { target: { checked: true } });
          waitFor(() => {
            expect(app.text()).toContain(
              "Number Of Establishments vs Employed"
            );
            expectCircles(3, app);
          }).then(() => {
            app.update();
            app.find("#swap-axes").at(0).simulate("click");
            const expectTitle = (title: string) =>
              expect(app.text()).toContain(title);

            expectTitle("Employed vs Number Of Establishments");
            expectCircles(3, app);
            // Per capita
            app
              .find("#per-capita-x")
              .at(0)
              .simulate("change", { target: { checked: true } });
            app
              .find("#per-capita-y")
              .at(0)
              .simulate("change", { target: { checked: true } });
            expectTitle(
              "Employed Per Capita vs Number Of Establishments Per Capita"
            );
            expectCircles(3, app);

            // Log
            app
              .find("#log-x")
              .at(0)
              .simulate("change", { target: { checked: true } });
            app
              .find("#log-y")
              .at(0)
              .simulate("change", { target: { checked: true } });
            expectCircles(3, app);
            // Choose a third statvar
            app
              .find("#hierarchy-section input")
              .at(2)
              .simulate("change", { target: { checked: true } });
            Promise.resolve(app)
              .then(() => app.update())
              .then(() => {
                app.update();
                expect(app.find(".modal-title").text()).toContain(
                  "Only Two Statistical Variables Supported"
                );
                app.find(`input[id="y-radio-button"]`).simulate("click");
                app.find(".modal-footer button").simulate("click");
                Promise.resolve(app)
                  .then(() => app.update())
                  .then(() => {
                    expectTitle(
                      "Housing Units Per Capita vs Employed Per Capita"
                    );
                    expectCircles(3, app);
                  });
              });
          });
        });
      });
    });
});
