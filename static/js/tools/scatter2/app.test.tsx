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

import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import React, { useEffect } from "react";
import Cheerio from "cheerio";
import { when } from "jest-when";
import axios from "axios";
import { App } from "./app";
import { Context, useContextStore } from "./context";

import hierarchy from "../../../data/hierarchy_top.json";
import { waitFor } from "@testing-library/react";

Enzyme.configure({ adapter: new Adapter() });

function TestApp(): JSX.Element {
  const context = useContextStore();
  useEffect(() => {
    context.place.setEnclosingPlace({ name: "Delaware", dcid: "geoId/10" });
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
  when(axios.get)
    .calledWith(
      "/api/stats/collection?parent_place=geoId/10&child_type=County" +
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
      "/api/stats/collection?parent_place=geoId/10&child_type=County" +
        "&stat_vars=Count_Person_Employed&stat_vars=Count_HousingUnit"
    )
    .mockResolvedValue({
      data: {
        Count_Person_Employed: data.Count_Person_Employed,
        Count_HousingUnit: data.Count_HousingUnit,
      },
    });
  when(axios.get)
    .calledWith(
      "/api/stats/Count_Person?&dcid=geoId/10001&dcid=geoId/10003&dcid=geoId/10005"
    )
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
  const post = axios.post;
  axios.post = jest.fn();
  when(axios.post)
    .calledWith("/api/place/stat-vars/union", {
      dcids: ["geoId/10001", "geoId/10003", "geoId/10005"],
    })
    .mockResolvedValue({
      data: [
        "Count_Person_Employed",
        "Count_Establishment",
        "Count_HousingUnit",
      ],
    });

  // Statvar menu
  when(axios.get)
    .calledWith("../../data/hierarchy_statsvar.json")
    .mockResolvedValue({ data: hierarchy });

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

  return () => {
    axios.get = get;
    axios.post = post;
  };
}

function expectCircles(n: number, app: Enzyme.ReactWrapper): void {
  const $ = Cheerio.load(app.html());
  expect($("circle").length).toEqual(n);
}

test("all functionalities", async (done) => {
  const unmock = mockAxios();
  const app = mount(<TestApp />);

  // Expand these verticals
  app.find("#Demographics a").simulate("click");
  app.find("#Employment a").simulate("click");
  app.find("#Economics a").simulate("click");
  await waitFor(() => expect(app.text()).toContain("Population Density"));

  // Select county as child place type
  app
    .find("#enclosed-place-type")
    .at(0)
    .simulate("change", { target: { value: "County" } });

  // Population density should be filtered out
  await waitFor(() => expect(app.text()).not.toContain("Population Density"));

  // Choose employed for x and establishments for y
  app.find(`[id="Employed"] button`).simulate("click");
  app.find(`[id="Number of Establishments"] button`).simulate("click");

  await waitFor(() => {
    // Title
    expect(app.text()).toContain("Number Of Establishments vs Employed");
    // Points
    expectCircles(3, app);
    //expect(app.find("#plot-options")).toHaveLength(1);
  });
  app.update();
  // Swap axes
  app.find("#swap-axes").at(0).simulate("click");
  const expectTitle = (title: string) => expect(app.text()).toContain(title);

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
  expectTitle("Employed Per Capita vs Number Of Establishments Per Capita");
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
  app.find("#Housing a").simulate("click");
  app.find(`[id="Housing Units"] button`).simulate("click");
  await waitFor(() =>
    expect(app.find(".modal-title").text()).toContain(
      "Select two of the three statistical variables"
    )
  );

  // Uncheck establishments and check housing
  app
    .find(`input[name="x"]`)
    .simulate("change", { target: { name: "x", checked: false } });
  app
    .find(`input[name="third"]`)
    .simulate("change", { target: { name: "third", checked: true } });
  app.find(".modal-footer button").simulate("click");
  await waitFor(() => {
    expect(app.text()).toContain(
      "Housing Units Per Capita vs Employed Per Capita"
    );
    expectCircles(3, app);
  });

  unmock();
  done();
});
