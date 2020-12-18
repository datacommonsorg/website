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
jest.mock("../chart/draw");
import Enzyme, { mount } from "enzyme";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import React from "react";
import axios from "axios";
import pretty from "pretty";
import { Page } from "./timeline_page";
import { axios_mock, drawGroupLineChart_mock } from "./mock_functions";

Enzyme.configure({ adapter: new Adapter() });

const globalAny: any = global;

test("Single place and single stats var", () => {
  globalAny.window = Object.create(window);
  document.body.innerHTML = '<button id="download-link"></div>';
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
  // There are 3 promises to resolve:
  // 1) all for [statsVarInfo, placeName, validStatsVar]
  // 2) get hierachy.json
  // 3) get stats
  return Promise.resolve(wrapper)
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => {
      wrapper.update();
      expect(wrapper.find("#chart-region").getDOMNode().innerHTML).toEqual(
        `<div class="card"><span class="chartPerCapita">Per capita<button class="perCapitaCheckbox">` +
          `</button><a href="/faq#perCapita"><span> *</span></a></span>` +
          `<div class="chart-svg"></div><div class="statsVarChipRegion">` +
          `<div class="pv-chip mdl-chip--deletable">` +
          `<span class="mdl-chip__text">Median age</span>` +
          `<button class="mdl-chip__action"><i class="material-icons">` +
          `cancel</i></button></div></div></div>`
      );

      // add one statsVar by clicking the checkbox
      wrapper.find("#drill .checkbox").at(0).simulate("click");
      Promise.resolve(wrapper)
        .then(() => wrapper.update())
        .then(() => {
          wrapper.update();
          expect(window.location.hash).toEqual(
            "place=geoId%2F05&statsVar=Median_Age_Person%2C0%2C2__Count_Person%2C0%2C0"
          );
          // test if the statsVar info and statsVarTitle is updated
          expect(wrapper.state().statsVarInfo).toEqual({
            Median_Age_Person: { md: "", mprop: "age", pt: "Person", pvs: {} },
            Count_Person: { md: "", mprop: "count", pt: "Person", pvs: {} },
          });
          expect(wrapper.state().statsVarTitle).toEqual({
            Median_Age_Person: "Median age",
            Count_Person: "Population",
          });
          expect(
            pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
          ).toMatchSnapshot();

          // delete one statsVar from the statsVar chips
          wrapper.find("#chart-region button i").at(1).simulate("click");
          Promise.resolve(wrapper)
            .then(() => wrapper.update())
            .then(() => {
              wrapper.update();
              expect(window.location.hash).toEqual(
                "place=geoId%2F05&statsVar=Median_Age_Person%2C0%2C2"
              );
              expect(wrapper.state().statsVarInfo).toEqual({
                Median_Age_Person: {
                  md: "",
                  mprop: "age",
                  pt: "Person",
                  pvs: {},
                },
              });
              expect(wrapper.state().statsVarTitle).toEqual({
                Median_Age_Person: "Median age",
              });
              expect(
                pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
              ).toMatchSnapshot();
              expect(
                pretty(wrapper.find("#drill").getDOMNode().innerHTML)
              ).toMatchSnapshot();
              // TODO(Lijuan): delete last statsVar by clicking checkbox
            });
        });
    });
});

// // TODO(Lijuan): two places and one statsVar, statsVar valid for one, invalid for the other

test("statsVar not in PV-tree", () => {
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
  // There are 3 promises to resolve:
  // 1) all for [statsVarInfo, placeName, validStatsVar]
  // 2) get hierachy.json
  // 3) get stats
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
        pretty(wrapper.find("#drill").getDOMNode().innerHTML)
      ).toMatchSnapshot();
    });
});

test("chart options", () => {
  // test if the chart options are correctly set
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
  // There are 3 promises to resolve:
  // 1) all for [statsVarInfo, placeName, validStatsVar]
  // 2) get hierachy.json
  // 3) get stats
  return Promise.resolve(wrapper)
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => wrapper.update())
    .then(() => {
      wrapper.update();
      // set per capita to True
      wrapper.find("#chart-region .perCapitaCheckbox").simulate("click");
      Promise.resolve(wrapper)
        .then(() => wrapper.update())
        .then(() => {
          wrapper.update();
          expect(window.location.hash).toBe(
            "place=geoId%2F05&statsVar=Median_Age_Person&chart=%7B%22age%22%3A%7B%22pc%22%3Atrue%7D%7D"
          );
          expect(
            pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
          ).toMatchSnapshot();

          // remove the statsVar
          wrapper.find("#drill .checkbox.checked").simulate("click");
          expect(wrapper.find("#chart-region").length).toBe(0); // chart deleted
          expect(window.location.hash).toBe(
            "place=geoId%2F05&statsVar=&chart=%7B%22age%22%3A%7B%22pc%22%3Afalse%7D%7D"
          );

          // TODO: look into the mock functions
          // Note: when the same url is called the second time, the returned value is {}
          axios_mock();
          // add the same statsVar back
          wrapper.find("#drill .checkbox").at(1).simulate("click");
          expect(axios.get).toHaveBeenLastCalledWith(
            "/api/stats/stats-var-property?dcid=Median_Age_Person"
          );
          expect(window.location.hash).toBe(
            "place=geoId%2F05&statsVar=Median_Age_Person%2C0%2C2&chart=%7B%22age%22%3A%7B%22pc%22%3Afalse%7D%7D"
          );

          Promise.resolve(wrapper)
            .then(() => wrapper.update())
            .then(() => {
              wrapper.update();
              expect(
                pretty(wrapper.find("#chart-region").getDOMNode().innerHTML)
              ).toMatchSnapshot();
            });
        });
    });
});
