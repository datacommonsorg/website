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
import { Menu } from "./statsvar_menu";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import pretty from "pretty";
import { TimelineStatsVarFilter } from "./commons";

let container = null;
beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement("div");
  document.body.appendChild(container);
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
        selectedNodePaths={[["0", "0"]]}
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
        selectedNodePaths={[["0", "0"]]}
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
        selectedNodePaths={[["0", "0"]]}
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
});

// Todo(Lijuan): add test for setting statsVar titles
