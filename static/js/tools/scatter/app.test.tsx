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

/* eslint-disable camelcase */

jest.mock("axios");

import { act, waitFor } from "@testing-library/react";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import axios from "axios";
import Cheerio from "cheerio";
import Enzyme, { mount } from "enzyme";
import { when } from "jest-when";
import React, { useEffect } from "react";

import { stringifyFn } from "../../utils/axios";
import { App } from "./app";
import {
  Context,
  EmptyPlace,
  SHOW_POPULATION_LINEAR,
  SHOW_POPULATION_LOG,
  useContextStore,
} from "./context";

Enzyme.configure({ adapter: new Adapter() });

function TestApp(): JSX.Element {
  const context = useContextStore();
  useEffect(() => {
    context.place.set({
      ...EmptyPlace,
      enclosingPlace: {
        dcid: "geoId/10",
        name: "Delaware",
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

declare global {
  interface SVGElement {
    getComputedTextLength(): number;
    getBBox(): {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }
}

beforeEach(() => {
  // Mock the info config object that is used for the landing page.
  window.infoConfig = {};

  // Stub getComputedTextLength and getBBox in SVGElement as they do not exist in d3node
  SVGElement.prototype.getComputedTextLength = (): number => 100;
  SVGElement.prototype.getBBox = (): {
    x: number;
    y: number;
    width: number;
    height: number;
  } => ({ x: 1, y: 1, width: 1, height: 1 });
});

function mockAxios(): void {
  axios.get = jest.fn();
  axios.post = jest.fn();

  // Counties in Delaware
  when(axios.get)
    .calledWith(
      "/api/place/descendent/name?dcid=geoId/10&descendentType=County"
    )
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
  const dataAll = {
    Count_Person_Employed: {
      ...data.Count_Person_Employed,
    },
    Count_Establishment: {
      ...data.Count_Establishment,
    },
    Count_HousingUnit: {
      ...data.Count_HousingUnit,
    },
  };
  Object.keys(dataAll).forEach((variable) => {
    Object.keys(dataAll[variable]).forEach((dcid) => {
      dataAll[variable][dcid] = [dataAll[variable][dcid]];
    });
  });

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
        parentEntity: "geoId/10",
        childType: "County",
        variables: ["Count_Person_Employed"],
        date: "",
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Person_Employed: data.Count_Person_Employed,
        },
        facets,
      },
    });
  when(axios.get)
    .calledWith("/api/observations/point/within", {
      params: {
        parentEntity: "geoId/10",
        childType: "County",
        variables: ["Count_HousingUnit"],
        date: "",
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_HousingUnit: data.Count_HousingUnit,
        },
        facets,
      },
    });
  when(axios.get)
    .calledWith("/api/observations/point/within", {
      params: {
        parentEntity: "geoId/10",
        childType: "County",
        variables: ["Count_Establishment"],
        date: "",
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Establishment: data.Count_Establishment,
        },
        facets,
      },
    });
  when(axios.get)
    .calledWith("/api/observations/point/within/all", {
      params: {
        parentEntity: "geoId/10",
        childType: "County",
        variables: ["Count_Person_Employed"],
        date: "",
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Person_Employed: dataAll.Count_Person_Employed, // eslint-disable-line camelcase
        },
        facets,
      },
    });
  when(axios.get)
    .calledWith("/api/observations/point/within/all", {
      params: {
        parentEntity: "geoId/10",
        childType: "County",
        variables: ["Count_HousingUnit"],
        date: "",
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_HousingUnit: dataAll.Count_HousingUnit, // eslint-disable-line camelcase
        },
        facets,
      },
    });
  when(axios.get)
    .calledWith("/api/observations/point/within/all", {
      params: {
        parentEntity: "geoId/10",
        childType: "County",
        variables: ["Count_Establishment"],
        date: "",
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Establishment: dataAll.Count_Establishment, // eslint-disable-line camelcase
        },
        facets,
      },
    });

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
    .calledWith("/api/observations/series/within", {
      params: {
        parentEntity: "geoId/10",
        childType: "County",
        variables: ["Count_Person"],
      },
      paramsSerializer: stringifyFn,
    })
    .mockResolvedValue({
      data: {
        data: {
          Count_Person: {
            "geoId/10001": {
              facet: "facet1",
              series: [
                {
                  date: "2016",
                  value: 180786,
                },
              ],
            },
            "geoId/10003": {
              facet: "facet1",
              series: [
                {
                  date: "2016",
                  value: 558753,
                },
              ],
            },
            "geoId/10005": {
              facet: "facet1",
              series: [
                {
                  date: "2016",
                  value: 234225,
                },
              ],
            },
          },
        },
        facets: {
          facet1: {
            importName: "USCensusPEP_Annual_Population",
            measurementMethod: "CensusPEPSurvey",
            observationPeriod: "P1Y",
            provenanceUrl:
              "https://www2.census.gov/programs-surveys/popest/tables",
          },
        },
      },
    });

  when(axios.get)
    .calledWith("/api/place/parent?dcid=geoId/10")
    .mockResolvedValue({
      data: [{ dcid: "country/USA", type: "Country", name: "United States" }],
    });

  when(axios.get).calledWith("/api/place/type/geoId/10").mockResolvedValue({
    data: "State",
  });

  when(axios.get)
    .calledWith("/api/place/name?dcids=geoId/10")
    .mockResolvedValue({
      data: { "geoId/10": "Delaware" },
    });

  when(axios.get)
    .calledWith("/api/place/descendent?dcids=geoId/10&descendentType=County")
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
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10001", "geoId/10005", "geoId/10003"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10003", "geoId/10001", "geoId/10005"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10003", "geoId/10005", "geoId/10001"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10005", "geoId/10003", "geoId/10001"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Root",
      entities: ["geoId/10005", "geoId/10001", "geoId/10003"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(rootGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10001", "geoId/10003", "geoId/10005"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10001", "geoId/10005", "geoId/10003"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10003", "geoId/10001", "geoId/10005"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10003", "geoId/10005", "geoId/10001"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10005", "geoId/10003", "geoId/10001"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.post)
    .calledWith("/api/variable-group/info", {
      dcid: "dc/g/Demographics",
      entities: ["geoId/10005", "geoId/10001", "geoId/10003"],
      numEntitiesExistence: 1,
    })
    .mockResolvedValue(demographicsGroupsData);

  when(axios.get)
    .calledWith("/api/stats/stat-var-property?dcids=Count_Establishment")
    .mockResolvedValue(statVarInfoData);

  when(axios.get)
    .calledWith("/api/stats/stat-var-property?dcids=Count_HousingUnit")
    .mockResolvedValue(statVarInfoData);

  when(axios.get)
    .calledWith("/api/stats/stat-var-property?dcids=Count_Person_Employed")
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
        dcids: [
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

  when(axios.get)
    .calledWith("/api/choropleth/geojson?placeDcid=geoId/10&placeType=County")
    .mockResolvedValue({
      features: [],
      type: "FeatureCollection",
    });
}

function expectCircles(n: number, app: Enzyme.ReactWrapper): void {
  const $ = Cheerio.load(app.html());
  expect($("circle").length).toEqual(n);
}

/**
 * Asserts all <circle> tags in the app have the specified radius values
 * @param values array of radius values encoded as strings. Example: ["3.5", "3.5"]
 * @param app react app wrapper
 */
function expectCircleSizes(values: string[], app: Enzyme.ReactWrapper): void {
  const $ = Cheerio.load(app.html());
  const $tags = $("circle");
  expect($tags.length).toEqual(values.length);
  const actualValues = [];
  $tags.each((i, tag) => {
    actualValues.push($(tag).attr("r"));
  });
  expect(actualValues.join(",")).toEqual(values.join(","));
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
  await app.update();

  // Select county as child place type
  await act(async () => {
    app
      .find("#place-selector-place-type")
      .at(0)
      .simulate("change", { target: { value: "County" } });
  });
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      "/api/place/descendent?dcids=geoId/10&descendentType=County"
    );
  });

  // Expand stat var menu
  app.find("#hierarchy-section .Collapsible__trigger").at(0).simulate("click");
  await app.update();
  await app.update();

  // Selecting the first stat var, Count_Person_Employed, should not show the scatter plot
  await act(async () => {
    app
      .find("#hierarchy-section input")
      .at(0)
      .simulate("change", { target: { checked: true } });
  });
  await app.update();
  await waitFor(() => {
    expect(app.text()).toContain(
      "Choose 2 statistical variables from the left pane"
    );
    expectCircles(0, app);
  });

  // Select the second stat var, Count_HousingUnit, should show the scatter plot
  await act(async () => {
    app
      .find("#hierarchy-section input")
      .at(1)
      .simulate("change", { target: { checked: true } });
  });
  await app.update();
  await waitFor(() => {
    expect(app.text()).toContain("Housing Units (2016)vsEmployed (2016)");
    expectCircles(3, app);
  });

  // Clicking swap axis should successfully swap the x and y axis
  await act(async (): Promise<void> => {
    app.find("#swap-axes").at(0).simulate("click");
  });
  await app.update();
  const expectTitle = (title: string): void =>
    expect(app.text()).toContain(title);
  expectTitle("Employed (2016)vsHousing Units (2016)");
  expectCircles(3, app);

  // Setting the axis' to per-capita should update the scatter plot
  await act(async () => {
    app
      .find("#per-capita-x")
      .at(0)
      .simulate("change", { target: { checked: true } });
    app
      .find("#per-capita-y")
      .at(0)
      .simulate("change", { target: { checked: true } });
  });
  expectTitle("Employed Per Capita (2016)vsHousing Units Per Capita (2016)");
  expectCircles(3, app);

  // Setting log scales should succeed
  await act(async () => {
    app
      .find("#log-x")
      .at(0)
      .simulate("change", { target: { checked: true } });
    app
      .find("#log-y")
      .at(0)
      .simulate("change", { target: { checked: true } });
  });
  expectCircles(3, app);

  // Choosing a third stat var should not be allowed
  await act(async () => {
    app
      .find("#hierarchy-section input")
      .at(2)
      .simulate("change", { target: { checked: true } });
  });
  await app.update();
  expect(app.find(".modal-title").text()).toContain(
    "Only Two Statistical Variables Supported"
  );

  // Removing one of the three stat vars should allow the scatter plot to render
  await act(async () => {
    app.find(`input[id="y-radio-button"]`).simulate("click");
    app.find(".modal-footer button").simulate("click");
  });
  await app.update();
  expectTitle(
    "Employed Per Capita (2016)vsNumber Of Establishments Per Capita (2016)"
  );
  expectCircles(3, app);

  // Selecting point size by population should resize points using a linear scale
  expectCircleSizes(["3.5", "3.5", "3.5"], app);
  await act(async () => {
    app
      .find("#show-population-linear")
      .at(0)
      .simulate("change", { target: { value: SHOW_POPULATION_LINEAR } });
  });
  expectCircleSizes(["3.5", "20", "5.8328584241481405"], app);

  // Changing to log scale should resize points
  await act(async () => {
    app
      .find("#show-population-log")
      .at(0)
      .simulate("change", { target: { value: SHOW_POPULATION_LOG } });
  });
  expectCircleSizes(["3.5", "20", "7.286777364719656"], app);
});
