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
jest.mock("../../chart/draw");

import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import pretty from "pretty";
import React from "react";

import { axios_mock, drawGroupLineChart_mock } from "../mock_functions";
import { Page } from "./page";

Enzyme.configure({ adapter: new Adapter() });

const globalAny: any = global;

test("Single place and single stat var", () => {
  globalAny.window = Object.create(window);
  document.body.innerHTML =
    '<button id="download-link"></button><a id="bulk-download-link"></a>';
  // Set url hash
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      hash: "#&place=geoId/05&statsVar=Median_Age_Person",
    },
  });
  // Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
  // and jsdom.
  drawGroupLineChart_mock();
  // mock all the async axios call
  axios_mock();
  // Do the actual render!
  const wrapper = mount(<Page />);
  // Resolve statVarInfo promise and placeName promise
  return Promise.resolve(wrapper)
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => {
      wrapper.update();
      expect(wrapper.find("#chart-region").getDOMNode().innerHTML).toContain(
        '<label class="form-check-label"><input id="age-ratio" type="checkbox" class="form-check-input">Per Capita</label>'
      );
      wrapper
        .find("#hierarchy-section .Collapsible__trigger")
        .at(0)
        .simulate("click");
      Promise.resolve(wrapper).then(() => {
        wrapper.update();
        // add one statVar by clicking the checkbox
        wrapper
          .find("#hierarchy-section input")
          .at(0)
          .simulate("change", { target: { checked: true } });
        Promise.resolve(wrapper).then(() => {
          wrapper.update();
          // Hack to mimic the browser behavior as there is no native
          // browser environment in jest.
          window.location.hash = "#" + window.location.hash;
          expect(window.location.hash).toEqual(
            "#place=geoId%2F05&statsVar=Median_Age_Person__Count_Person"
          );

          expect(
            pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
          ).toMatchSnapshot();

          // delete one statVar from the statVar chips
          wrapper
            .find("#hierarchy-section input")
            .at(1)
            .simulate("change", { target: { checked: false } });
          Promise.resolve(wrapper).then(() => {
            wrapper.update();
            // Hack to mimic the browser behavior as there is no native
            // browser environment in jest.
            window.location.hash = "#" + window.location.hash;
            expect(window.location.hash).toEqual(
              "#place=geoId%2F05&statsVar=Count_Person"
            );
            expect(
              pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
            ).toMatchSnapshot();
            expect(
              pretty(wrapper.find("#hierarchy-section").getDOMNode().innerHTML)
            ).toMatchSnapshot();
          });
        });
      });
    });
});

test("statVar not in PV-tree", () => {
  Object.defineProperty(window, "location", {
    value: {
      hash: "#&place=geoId/05&statsVar=NotInTheTree",
    },
  });
  // Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
  // and jsdom.
  drawGroupLineChart_mock();
  // mock all the async axios call
  axios_mock();
  // Do the actual render!
  const wrapper = mount(<Page />);
  // Resolve statVarInfo promise and placeName promise
  return Promise.resolve(wrapper)
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => {
      wrapper.update();
      expect(
        pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
      ).toMatchSnapshot();
      expect(
        pretty(wrapper.find("#hierarchy-section").getDOMNode().innerHTML)
      ).toMatchSnapshot();
    });
});

test("chart options", () => {
  // test if the chart options are correctly set
  globalAny.window = Object.create(window);
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      hash: "#&place=geoId/05&statsVar=Count_Person",
    },
  });

  // Mock drawGroupLineChart() as getComputedTextLength can has issue with jest
  // and jsdom.
  drawGroupLineChart_mock();
  // mock all the async axios call
  axios_mock();

  // Do the actual render!
  const wrapper = mount(<Page />);
  // Resolve statVarInfo promise and placeName promise
  return Promise.resolve(wrapper)
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => {
      wrapper.update();
      // set per capita to True
      wrapper.find("#count-ratio").at(0).simulate("change");
      Promise.resolve(wrapper)
        .then(() => wrapper.update())
        .then(() => {
          wrapper.update();
          window.location.hash = "#" + window.location.hash;
          expect(window.location.hash).toBe(
            "#place=geoId%2F05&statsVar=Count_Person&chart=%7B%22count%22%3A%7B%22pc%22%3Atrue%7D%7D"
          );
          expect(
            pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
          ).toMatchSnapshot();

          // First need to open the Demographics node.
          wrapper
            .find("#hierarchy-section .Collapsible__trigger")
            .at(0)
            .simulate("click");

          Promise.resolve(wrapper).then(() => {
            wrapper.update();
            // remove the statVar
            wrapper
              .find("#hierarchy-section input[checked=true]")
              .at(0)
              .simulate("change", { target: { checked: false } });
            Promise.resolve(wrapper)
              .then(() => wrapper.update())
              .then(() => {
                wrapper.update();
                // expect(wrapper.find("#chart-region").length).toBe(0); // chart deleted
                window.location.hash = "#" + window.location.hash;
                expect(window.location.hash).toBe(
                  "#place=geoId%2F05&statsVar=&chart=%7B%22count%22%3A%7B%22pc%22%3Atrue%7D%7D"
                );
              });
          });
        });
    });
});
