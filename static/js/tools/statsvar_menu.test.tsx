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

import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import Enzyme, { mount } from "enzyme";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import pretty from "pretty";

import { Menu } from "./statsvar_menu";
import { TimelineStatsVarFilter } from "./commons";
import { mock_hierarchy_complete } from "./mock_functions";

Enzyme.configure({ adapter: new Adapter() });
jest.mock("axios");

let container = null;
beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement("div");
  document.body.appendChild(container);
  mock_hierarchy_complete();
});

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it("filtering the menu", () => {
  // input: one valid statsVar selected
  // expecting: menu filtered, node Demographics expanded, node Count_Person checked
  act(() => {
    render(
      <Menu
        selectedNodes={{ Count_Person: { paths: [["0", "0"]] } }}
        setStatsVarTitle={jest.fn()}
        addStatsVar={jest.fn()}
        removeStatsVar={jest.fn()}
        statsVarFilter={new TimelineStatsVarFilter(new Set(["Count_Person"]))}
      />,
      container
    );
  });
  expect(pretty(container.innerHTML)).toMatchSnapshot();

  // input: non-valid statsVar, expecting: empty menu
  act(() => {
    render(
      <Menu
        selectedNodes={{ Count_Person: { paths: [["0", "0"]] } }}
        setStatsVarTitle={jest.fn()}
        addStatsVar={jest.fn()}
        removeStatsVar={jest.fn()}
        statsVarFilter={new TimelineStatsVarFilter(new Set([]))}
      />,
      container
    );
  });
  expect(pretty(container.innerHTML)).toMatchSnapshot();

  // input: selected statsVar Count_Person is not valid
  // expecting: Medium Age expanded, Count_Person not shown
  act(() => {
    render(
      <Menu
        selectedNodes={{ Count_Person: { paths: [["0", "0"]] } }}
        setStatsVarTitle={jest.fn()}
        addStatsVar={jest.fn()}
        removeStatsVar={jest.fn()}
        statsVarFilter={
          new TimelineStatsVarFilter(new Set(["Median_Age_Person"]))
        }
      />,
      container
    );
  });
  expect(pretty(container.innerHTML)).toMatchSnapshot();

  // test the set StatsVar titles
  const setTitle = jest.fn((x) => x);
  act(() => {
    render(
      <Menu
        selectedNodes={{ Count_Person: { paths: [["0", "0"]] } }}
        setStatsVarTitle={setTitle}
        addStatsVar={jest.fn()}
        removeStatsVar={jest.fn()}
        statsVarFilter={new TimelineStatsVarFilter(new Set(["Count_Person"]))}
      />,
      container
    );
  });
});

test("mount with one statsVar", () => {
  const setTitle = jest.fn();
  const wrapper = mount(
    <Menu
      selectedNodes={{ Count_Person: { paths: [["0", "0"]] } }}
      setStatsVarTitle={setTitle}
      addStatsVar={jest.fn()}
      removeStatsVar={jest.fn()}
      statsVarFilter={
        new TimelineStatsVarFilter(
          new Set(["Count_Person", "Median_Age_Person"])
        )
      }
    />
  );
  Promise.resolve(wrapper).then(() => {
    // make sure setTitle is called
    expect(setTitle).toHaveBeenCalledWith({ Count_Person: "Population" });
    // add one statsVar by clicking checkbox
    wrapper.find("#drill .checkbox").at(1).simulate("click");
    expect(wrapper.find("#drill").getDOMNode().innerHTML).toMatchSnapshot();
    // remove one statsVar by clicking checkbox
    wrapper.find("#drill .checkbox").at(1).simulate("click");
    expect(wrapper.find("#drill").getDOMNode().innerHTML).toMatchSnapshot();
  });
});

test("mount with multiple statsVars", () => {
  const setTitle = jest.fn();
  const wrapper = mount(
    <Menu
      selectedNodes={{
        Count_Person: { paths: [["0", "0"]] },
        Median_Age_Person: { paths: [["0", "2"]] },
        Count_Person_Upto5Years: { paths: [["0", "6", "0"]] },
      }}
      setStatsVarTitle={setTitle}
      addStatsVar={jest.fn()}
      removeStatsVar={jest.fn()}
      statsVarFilter={
        new TimelineStatsVarFilter(
          new Set([
            "Count_Person",
            "Count_Person_Upto5Years",
            "Median_Age_Person",
          ])
        )
      }
    />
  );

  Promise.resolve(wrapper).then(() => {
    // make sure setTitle is called
    expect(setTitle).toHaveBeenCalledWith({
      Count_Person: "Population",
      Median_Age_Person: "Median age",
      Count_Person_Upto5Years: "Less than 5 Years",
    });
  });
});
