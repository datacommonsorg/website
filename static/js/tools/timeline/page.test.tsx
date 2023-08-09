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
// jest.mock("../../chart/draw");
jest.mock("../../chart/draw_bar");
jest.mock("../../chart/draw_histogram");
jest.mock("../../chart/draw_line");
jest.mock("../../chart/draw_utils");

import { waitFor } from "@testing-library/react";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import Enzyme, { mount, ReactWrapper } from "enzyme";
import pretty from "pretty";
import React from "react";

import { axiosMock, drawGroupLineChartMock } from "./mock_functions";
import { Page } from "./page";

Enzyme.configure({ adapter: new Adapter() });

const globalAny: any = global;

beforeEach(() => {
  // Mock the info config object that is used for the landing page.
  window.infoConfig = {};
});

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

test("Single place and single stat var", async () => {
  globalAny.window = Object.create(window);
  document.body.innerHTML =
    '<button id="download-link"></button><a id="bulk-download-link"></a>';
  // Set url hash
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      hash: "#place=geoId/05&statsVar=Median_Age_Person",
    },
  });
  // Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
  // and jsdom.
  drawGroupLineChartMock();
  // Mock all the async axios call
  axiosMock();
  // Do the actual render!
  const wrapper = mount(<Page />);
  await waitForComponentUpdates(wrapper);
  // Check that one chart is on the page and it matches snapshot
  expect(
    pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
  ).toMatchSnapshot();
  // Open demographics node in stat var widget
  wrapper
    .find("#hierarchy-section .Collapsible__trigger")
    .at(0)
    .simulate("click");
  // Wait for the stat var info fetch
  await new Promise(process.nextTick);
  wrapper.update();
  // Add one statVar by clicking the checkbox
  wrapper
    .find("#hierarchy-section input")
    .at(0)
    .simulate("change", { target: { checked: true } });
  // Check that url hash is updated
  window.location.hash = "#" + window.location.hash;
  expect(window.location.hash).toEqual(
    "#place=geoId%2F05&statsVar=Median_Age_Person__Count_Person"
  );
  // Hack to trigger hashchange event to fire
  window.dispatchEvent(
    new HashChangeEvent("hashchange", {
      newURL: "#place=geoId%2F05&statsVar=Median_Age_Person__Count_Person",
      oldURL: "#place=geoId/05&statsVar=Median_Age_Person",
    })
  );
  await waitForComponentUpdates(wrapper);
  // Check that there are 2 charts on the page and they match the snapshot
  expect(
    pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
  ).toMatchSnapshot();
  // Delete one statVar
  wrapper
    .find("#hierarchy-section input")
    .at(1)
    .simulate("change", { target: { checked: false } });
  // Check that the url hash is updated
  window.location.hash = "#" + window.location.hash;
  expect(window.location.hash).toEqual(
    "#place=geoId%2F05&statsVar=Count_Person"
  );
  // Hack to trigger hashchange event to fire
  window.dispatchEvent(
    new HashChangeEvent("hashchange", {
      newURL: "#place=geoId%2F05&statsVar=Count_Person",
      oldURL: "#place=geoId%2F05&statsVar=Median_Age_Person__Count_Person",
    })
  );
  await waitForComponentUpdates(wrapper);
  // Check that there is one chart on the page and the content matches the snapshot
  expect(
    pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
  ).toMatchSnapshot();
  // Check that the stat var widget matches the snapshot
  expect(
    pretty(wrapper.find("#hierarchy-section").getDOMNode().innerHTML)
  ).toMatchSnapshot();
});

test("statVar not in PV-tree", async () => {
  Object.defineProperty(window, "location", {
    value: {
      hash: "#&place=geoId/05&statsVar=NotInTheTree",
    },
  });
  // Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
  // and jsdom.
  drawGroupLineChartMock();
  // mock all the async axios call
  axiosMock();
  // Do the actual render!
  const wrapper = mount(<Page />);
  await waitForComponentUpdates(wrapper);
  // Check that one chart is on the page and it matches snapshot
  expect(
    pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
  ).toMatchSnapshot();
  // Check that the stat var widget matches the snapshot
  expect(
    pretty(wrapper.find("#hierarchy-section").getDOMNode().innerHTML)
  ).toMatchSnapshot();
});

test("chart options", async () => {
  globalAny.window = Object.create(window);
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      hash: "#&place=geoId/05&statsVar=Count_Person",
    },
  });

  // Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
  // and jsdom.
  drawGroupLineChartMock();
  // mock all the async axios call
  axiosMock();

  // Do the actual render!
  const wrapper = mount(<Page />);
  await waitForComponentUpdates(wrapper);
  // Set per capita to true
  wrapper.find("#count-none-ratio").at(0).simulate("change");
  await waitForComponentUpdates(wrapper);
  // Check that url hash is updated
  window.location.hash = "#" + window.location.hash;
  expect(window.location.hash).toBe(
    "#place=geoId%2F05&statsVar=Count_Person&chart=%7B%22count-none%22%3A%7B%22pc%22%3Atrue%7D%7D"
  );
  // Hack to trigger hashchange event to fire
  window.dispatchEvent(
    new HashChangeEvent("hashchange", {
      newURL:
        "#place=geoId%2F05&statsVar=Count_Person&chart=%7B%22count-none%22%3A%7B%22pc%22%3Atrue%7D%7D",
      oldURL: "#&place=geoId/05&statsVar=Count_Person",
    })
  );
  await waitForComponentUpdates(wrapper);
  expect(
    pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
  ).toMatchSnapshot();
  // Open the Demographics node in the stat var widget
  wrapper
    .find("#hierarchy-section .Collapsible__trigger")
    .at(0)
    .simulate("click");
  // Wait for the stat var info fetch from the stat var widget
  await new Promise(process.nextTick);
  wrapper.update();
  // Remove the stat var
  wrapper
    .find("#hierarchy-section input[checked=true]")
    .at(0)
    .simulate("change", { target: { checked: false } });
  // Check that the url hash is updated
  window.location.hash = "#" + window.location.hash;
  expect(window.location.hash).toBe(
    "#place=geoId%2F05&statsVar=&chart=%7B%22count-none%22%3A%7B%22pc%22%3Atrue%7D%7D"
  );
});
