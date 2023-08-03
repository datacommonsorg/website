/**
 * Copyright 2022 Google LLC
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
jest.setTimeout(100000);

import { waitFor } from "@testing-library/react";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import axios from "axios";
import Enzyme, { mount, ReactWrapper } from "enzyme";
import pretty from "pretty";
import React from "react";

import * as SharedUtil from "../../shared/util";
import { InfoPlace } from "./info";
import { axiosMock } from "./mock_functions";
import { Page } from "./page";

Enzyme.configure({ adapter: new Adapter() });

const globalAny: any = global;

const INFO_PLACES: [InfoPlace, InfoPlace] = [
  { name: "Place 1", dcid: "dcid/1" },
  { name: "Place 2", dcid: "dcid/2" },
];

async function waitForComponentUpdates(wrapper: ReactWrapper) {
  // Wait for state updates
  await waitFor(() => {
    expect(wrapper.text()).toContain("");
  });
  // Wait for stat var info and place info fetching
  await new Promise(process.nextTick);
  wrapper.update();
  await new Promise(process.nextTick);
  wrapper.update();
}

test("Loading options from URL", async () => {
  globalAny.window = Object.create(window);
  // Set url hash
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      hash: "#place=geoId/06&pt=County&sv=Count_Person",
    },
  });
  // Mock all the async axios calls
  axiosMock();
  // Render the component
  const wrapper = mount(<Page infoPlaces={INFO_PLACES} />);
  await waitForComponentUpdates(wrapper);
  // Check that preview table shows up on click and matches snapshot
  wrapper.find(".get-data-button").at(0).simulate("click");
  await waitForComponentUpdates(wrapper);
  await waitFor(() => {
    expect(wrapper.text()).toContain("placeDcid");
  });
  expect(
    pretty(wrapper.find("#preview-section").at(0).getDOMNode().innerHTML)
  ).toMatchSnapshot();
  // Check that clicking download gets the right data and calls the saveToFile function.
  wrapper.find(".download-button").at(0).simulate("click");
  expect(axios.post).toHaveBeenCalledWith("/api/csv/within", {
    childType: "County",
    facetMap: {
      Count_Person: "",
    },
    maxDate: "latest",
    minDate: "latest",
    parentPlace: "geoId/06",
    statVars: ["Count_Person"],
  });
  let savedFile = "";
  jest.spyOn(SharedUtil, "saveToFile").mockImplementation((fileName) => {
    savedFile = fileName;
  });
  await waitFor(() => {
    expect(savedFile).toEqual("California_County.csv");
  });
});

test("Manually updating options", async () => {
  globalAny.window = Object.create(window);
  // Set url hash
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      hash: "#place=geoId/06",
    },
  });
  // Mock all the async axios calls
  axiosMock();
  // Render the component
  const wrapper = mount(<Page infoPlaces={INFO_PLACES} />);
  await waitForComponentUpdates(wrapper);
  // Choose place type
  wrapper
    .find("#place-selector-place-type")
    .at(0)
    .simulate("change", { target: { value: "County" } });
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      "/api/place/descendent?dcids=geoId/06&descendentType=County"
    );
  });
  await waitForComponentUpdates(wrapper);
  // Update Date Range
  wrapper.find("#date-range").at(0).simulate("click");
  wrapper.update();
  wrapper
    .find(".download-date-range-input")
    .at(0)
    .simulate("change", { target: { value: "2020" } });
  wrapper.update();
  // Add stat vars using stat var widget
  wrapper
    .find("#hierarchy-section .Collapsible__trigger")
    .at(0)
    .simulate("click");
  await waitForComponentUpdates(wrapper);
  wrapper
    .find("#hierarchy-section input")
    .at(0)
    .simulate("change", { target: { checked: true } });
  await waitForComponentUpdates(wrapper);
  wrapper
    .find("#hierarchy-section input")
    .at(1)
    .simulate("change", { target: { checked: true } });
  await waitForComponentUpdates(wrapper);
  // Delete one stat var using the chips
  wrapper.find(".download-sv-chips .chip-action i").at(1).simulate("click");
  await waitForComponentUpdates(wrapper);
  // Check that preview table shows up on click and matches snapshot
  wrapper.find(".get-data-button").at(0).simulate("click");
  await waitForComponentUpdates(wrapper);
  await waitFor(() => {
    expect(wrapper.text()).toContain("placeDcid");
  });
  expect(
    pretty(wrapper.find("#preview-section").at(0).getDOMNode().innerHTML)
  ).toMatchSnapshot();
  // Check that clicking download gets the right data and calls the saveToFile function.
  wrapper.find(".download-button").at(0).simulate("click");
  expect(axios.post).toHaveBeenCalledWith("/api/csv/within", {
    childType: "County",
    facetMap: {
      Count_Person: "",
    },
    maxDate: "",
    minDate: "2020",
    parentPlace: "geoId/06",
    statVars: ["Count_Person"],
  });
  let savedFile = "";
  jest.spyOn(SharedUtil, "saveToFile").mockImplementation((fileName) => {
    savedFile = fileName;
  });
  await waitFor(() => {
    expect(savedFile).toEqual("California_County.csv");
  });
});
