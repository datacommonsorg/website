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

import { waitFor } from "@testing-library/react";
import axios from "axios";
import Cheerio from "cheerio";
import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { when } from "jest-when";
import React, { useEffect } from "react";

import { stringifyFn } from "../../utils/axios";
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

beforeEach(() => {
  // Mock the info config object that is used for the landing page.
  window.infoConfig = [];
});

function mockAxios(): void {
  axios.get = jest.fn();
  axios.post = jest.fn();

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

  const facets = {
    facet1: {
      importName: "BLS_LAUS",
      provenanceUrl: "https://www.bls.gov/lau/",
      measurementMethod: "BLSSeasonallyUnadjusted",
    },
    facet2: {
      importName: "CensusCountyBusinessPatterns",
      provenanceUrl: "https://www.census.gov/",
      measurementMethod: "CensusCBPSurvey",
    },
    facet3: {
      importName: "CensusACS5YearSurvey",
      provenanceUrl: "https://www.census.gov/",
      measurementMethod: "CensusACS5yrSurvey",
    },
  };

  const data = {
    Count_Person_Employed: {
      "geoId/10001": {
        date: "2016",
        facet: "facet1",
        value: 76726,
      },
      "geoId/10003": {
        date: "2016",
        facet: "facet1",
        value: 276517,
      },
      "geoId/10005": {
        date: "2016",
        facet: "facet1",
        value: 104845,
      },
    },
    Count_Establishment: {
      "geoId/10001": {
        date: "2016",
        value: 3422,
        facet: "facet2",
      },
      "geoId/10003": {
        date: "2016",
        value: 16056,
        facet: "facet2",
      },
      "geoId/10005": {
        date: "2016",
        value: 5601,
        facet: "facet2",
      },
    },
    Count_HousingUnit: {
      "geoId/10001": {
        date: "2016",
        value: 70576,
        facet: "facet3",
      },
      "geoId/10003": {
        date: "2016",
        value: 222146,
        facet: "facet3",
      },
      "geoId/10005": {
        date: "2016",
        value: 135529,
        facet: "facet3",
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
    .calledWith("/api/observations/point/within", {
      params: {
        parent_entity: "geoId/10",
        child_type: "County",
        variables: ["Count_Person_Employed", "Count_Establishment"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Person_Employed: data.Count_Person_Employed,
          Count_Establishment: data.Count_Establishment,
        },
        facets: facets,
      },
    });
  when(axios.get)
    .calledWith("/api/observations/point/within", {
      params: {
        parent_entity: "geoId/10",
        child_type: "County",
        entities: ["Count_Person_Employed", "Count_HousingUnit"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Person_Employed: data.Count_Person_Employed,
          Count_HousingUnit: data.Count_HousingUnit,
        },
        facets: facets,
      },
    });
  axios.post = jest.fn();

  when(axios.get)
    .calledWith("/api/observations/point", {
      params: {
        variables: ["Count_Person"],
        entities: ["geoId/10001", "geoId/10003", "geoId/10005"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Person: {
            "geoId/10001": {
              date: "2016",
              value: 180786,
            },
            "geoId/10003": {
              date: "2016",
              value: 558753,
            },
            "geoId/10005": {
              date: "2016",
              value: 234225,
            },
          },
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

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: [],
      numEntitiesExistence: 0,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10001", "geoId/10003", "geoId/10005"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10001", "geoId/10005", "geoId/10003"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10003", "geoId/10001", "geoId/10005"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10003", "geoId/10005", "geoId/10001"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10005", "geoId/10003", "geoId/10001"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10005", "geoId/10001", "geoId/10003"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10001", "geoId/10003", "geoId/10005"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10001", "geoId/10005", "geoId/10003"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10003", "geoId/10001", "geoId/10005"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10003", "geoId/10005", "geoId/10001"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10005", "geoId/10003", "geoId/10001"],
      numEntitiesExistence: 10,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10005", "geoId/10001", "geoId/10003"],
      numEntitiesExistence: 10,
    })
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
    .calledWith("/api/variable/path?dcid=Count_Establishment")
    .mockResolvedValue({ data: pathsData.Count_Establishment });

  when(axios.get)
    .calledWith("/api/variable/path?dcid=Count_HousingUnit")
    .mockResolvedValue({ data: pathsData.Count_HousingUnit });

  when(axios.get)
    .calledWith("/api/variable/path?dcid=Count_Person_Employed")
    .mockResolvedValue({ data: pathsData.Count_Person_Employed });

  when(axios.get)
    .calledWith("/api/variable/info", {
      params: {
        nodes: [
          "Count_Person_Employed",
          "Count_HousingUnit",
          "Count_Establishment",
        ],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
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
    });
}

function expectCircles(n: number, app: Enzyme.ReactWrapper): void {
  const $ = Cheerio.load(app.html());
  expect($("circle").length).toEqual(n);
}

test("all functionalities", async () => {
  mockAxios();
  const app = mount(<TestApp />);
  await waitFor(() => {
    expect(axios.post).toHaveBeenCalledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: [],
      numEntitiesExistence: 0,
    });
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
