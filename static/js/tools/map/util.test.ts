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

import { ContextType, DisplayOptions, PlaceInfo, StatVar } from "./context";
import { observationDates } from "./test_data";
import {
  applyHashDisplay,
  applyHashPlaceInfo,
  applyHashStatVar,
  getTimeSliderDates,
  updateHashDisplay,
  updateHashPlaceInfo,
  updateHashStatVar,
} from "./util";

const TestContext = {
  placeInfo: {
    value: {
      selectedPlace: {
        dcid: "geoId/10",
        name: "Delaware",
        types: ["State"],
      },
      enclosingPlace: {
        dcid: "",
        name: "",
      },
      enclosedPlaceType: "County",
      mapPointPlaceType: "",
    },
  },
  statVar: {
    value: {
      dcid: "Count_Person",
      perCapita: false,
      info: null,
      denom: "Count_Person",
      mapPointSv: "",
      metahash: "",
    },
  },
  display: {
    value: {
      domain: [-10, 50, 100],
      color: "red",
      showMapPoints: false,
      showTimeSlider: false,
      allowLeaflet: false,
    },
  },
} as unknown as ContextType;

test("updateHashPlaceInfo", () => {
  history.pushState = jest.fn();
  const resultHash = updateHashPlaceInfo("", TestContext.placeInfo.value);
  const expectedHash = "&pd=geoId/10&ept=County";
  expect(resultHash).toEqual(expectedHash);
});

test("updateHashStatVarInfo", () => {
  history.pushState = jest.fn();
  const resultHash = updateHashStatVar("", TestContext.statVar.value);
  const expectedHash = "&sv=Count_Person&pc=0&denom=Count_Person";
  expect(resultHash).toEqual(expectedHash);
});

test("updateHashDisplay", () => {
  history.pushState = jest.fn();
  const resultHash = updateHashDisplay("", TestContext.display.value);
  const expectedHash = "&color=red&domain=-10:50:100";
  expect(resultHash).toEqual(expectedHash);
});

test("applyHashPlaceInfo", () => {
  const context = { statVar: {}, placeInfo: {} } as ContextType;
  context.placeInfo.set = (value): PlaceInfo =>
    (context.placeInfo.value = value);
  const urlParams = new URLSearchParams(
    decodeURIComponent(
      "#%26sv%3DCount_Person%26svn%3DPeople%26pc%3D0%26pd%3DgeoId%2F10&ept=County"
    ).replace("#", "?")
  );
  const placeInfo = applyHashPlaceInfo(urlParams);
  expect(placeInfo).toEqual({
    ...TestContext.placeInfo.value,
    selectedPlace: {
      dcid: "geoId/10",
      name: "",
      types: null,
    },
    parentPlaces: null,
  });
});

test("applyHashStatVarInfo", () => {
  const context = { statVar: {}, placeInfo: {} } as ContextType;
  context.statVar.set = (value): StatVar => (context.statVar.value = value);
  const urlParams = new URLSearchParams(
    decodeURIComponent(
      "#%26sv%3DCount_Person%26svn%3DPeople%26pc%3D0%26denom%3DCount_Person%26pd%3DgeoId%2F10%26pn%3DDelaware%26pt%3DCounty"
    ).replace("#", "?")
  );
  const statVar = applyHashStatVar(urlParams);
  expect(statVar).toEqual(TestContext.statVar.value);
});

test("applyHashDisplay", () => {
  const context = { statVar: {}, placeInfo: {}, display: {} } as ContextType;
  context.display.set = (value): DisplayOptions =>
    (context.display.value = value);
  const urlParams = new URLSearchParams(
    decodeURIComponent("%23%26domain%3D-10%3A50%3A100%26color%3Dred").replace(
      "#",
      "?"
    )
  );
  const display = applyHashDisplay(urlParams);
  expect(display).toEqual(TestContext.display.value);
});

test("get time slider dates", () => {
  const expected = {
    facetDates: {
      "1355058237": [
        "2010",
        "2011",
        "2012",
        "2013",
        "2014",
        "2015",
        "2016",
        "2017",
        "2018",
        "2019",
      ],
      "2763329611": [
        "2010",
        "2011",
        "2012",
        "2013",
        "2014",
        "2015",
        "2016",
        "2017",
        "2018",
        "2019",
      ],
      "3690003977": ["2017", "2018", "2019"],
      "3795540742": [
        "2001",
        "2003",
        "2005",
        "2007",
        "2009",
        "2011",
        "2013",
        "2015",
        "2017",
        "2019",
        "2020",
      ],
      "3847894791": ["2017", "2018", "2019"],
    },
    bestFacet: "3795540742",
  };
  expect(getTimeSliderDates(observationDates)).toEqual(expected);
});
