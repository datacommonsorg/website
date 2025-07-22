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

import { expect, jest } from "@jest/globals";
import { cleanup } from "@testing-library/react";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import Enzyme, { shallow } from "enzyme";
import _ from "lodash";
import React from "react";

import { getStatVarSearchResults } from "../utils/search_utils";
import {
  MAX_INITIAL_RESULTS,
  MAX_TOTAL_RESULTS,
  StatVarHierarchySearch,
} from "./stat_var_search";

Enzyme.configure({ adapter: new Adapter() });
test("getResultCountString", () => {
  const wrapper = shallow(
    <StatVarHierarchySearch entities={[]} onSelectionChange={_.noop} />
  );
  const cases: {
    numSv: number;
    numSvg: number;
    wantString: string;
  }[] = [
    {
      numSv: 3,
      numSvg: 2,
      wantString: "Matches 2 groups and 3 statistical variables",
    },
    {
      numSv: 1,
      numSvg: 2,
      wantString: "Matches 2 groups and 1 statistical variable",
    },
    {
      numSv: 3,
      numSvg: 1,
      wantString: "Matches 1 group and 3 statistical variables",
    },
    {
      numSv: 3,
      numSvg: 0,
      wantString: "Matches 3 statistical variables",
    },
    {
      numSv: 1,
      numSvg: 0,
      wantString: "Matches 1 statistical variable",
    },
    {
      numSv: 0,
      numSvg: 3,
      wantString: "Matches 3 groups",
    },
    {
      numSv: 0,
      numSvg: 1,
      wantString: "Matches 1 group",
    },
  ];
  for (const c of cases) {
    const resultCountString = (
      wrapper.instance() as StatVarHierarchySearch
    ).getResultCountString(c.numSvg, c.numSv);
    try {
      expect(resultCountString).toEqual(c.wantString);
    } catch (e) {
      console.log(
        `Got different result count string than expected for <numSvg: ${c.numSvg}, numSv: ${c.numSv}>`
      );
      throw e;
    }
  }
});

jest.mock("../utils/search_utils", () => {
  const originalModule = jest.requireActual(
    "../utils/search_utils"
  ) as typeof import("../utils/search_utils");
  return {
    getStatVarSearchResults: jest.fn(),
    getHighlightedJSX: originalModule.getHighlightedJSX,
  };
});

describe("StatVarHierarchySearch Component", () => {
  const wrapper: Enzyme.ShallowWrapper = shallow(
    <StatVarHierarchySearch entities={[]} onSelectionChange={_.noop} />
  );
  let mockGetStatVarSearchResults: jest.Mock;

  const createMockResponse = (numSvResults: number) => ({
    matches: [],
    statVarGroups: [],
    statVars: Array(numSvResults).fill({ name: "sv", dcid: "sv" }),
  });

  beforeEach(() => {
    jest.useFakeTimers(); // Enable Jest's fake timers to control setTimeout

    mockGetStatVarSearchResults = getStatVarSearchResults as jest.Mock;
  });

  afterEach(() => {
    cleanup();
    jest.runAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const simulateInput = (query: string) => {
    wrapper
      .find("input.statvar-search-input")
      .simulate("change", { target: { value: query } });
    wrapper.update();
  };

  it('Should not show the "Load More Results" button when less than MAX_INITIAL_RESULTS are returned', async () => {
    const query = "less_than_max";
    const numResults = MAX_INITIAL_RESULTS - 10;
    mockGetStatVarSearchResults.mockResolvedValueOnce(
      createMockResponse(numResults)
    );

    simulateInput(query);
    jest.advanceTimersByTime(300);
    expect(mockGetStatVarSearchResults).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    wrapper.update();

    expect(wrapper.find(".statvar-hierarchy-search-results").exists()).toBe(
      true
    );
    expect(wrapper.find(".sv-search-loading").exists()).toBe(false);
    expect(wrapper.find(".no-results-message").exists()).toBe(false);
    expect(wrapper.find(".sv-search-results").exists()).toBe(true);
    expect(wrapper.find(".search-result-value").length).toEqual(numResults);
    expect(wrapper.find(".load-more-button").exists()).toBe(false);

    expect(mockGetStatVarSearchResults).toHaveBeenCalledWith(
      query,
      [],
      false,
      MAX_INITIAL_RESULTS
    );
  });

  it('Should show the "Load More Results" button when exactly MAX_INITIAL_RESULTS are returned', async () => {
    const query = "exactly_max";
    mockGetStatVarSearchResults.mockResolvedValue(
      createMockResponse(MAX_INITIAL_RESULTS)
    );

    simulateInput(query);
    jest.advanceTimersByTime(300);
    await Promise.resolve();
    wrapper.update();

    expect(wrapper.find(".statvar-hierarchy-search-results").exists()).toBe(
      true
    );
    expect(wrapper.find(".sv-search-loading").exists()).toBe(false);
    expect(wrapper.find(".no-results-message").exists()).toBe(false);
    expect(wrapper.find(".sv-search-results").exists()).toBe(true);
    expect(wrapper.find(".search-result-value").length).toEqual(
      MAX_INITIAL_RESULTS
    );
    expect(wrapper.find(".load-more-button").exists()).toBe(true);
    expect(wrapper.find(".load-more-button").text()).toContain(
      "Load More Results"
    );
    expect(wrapper.find(".sv-search-loading").exists()).toBe(false);

    expect(mockGetStatVarSearchResults).toHaveBeenCalledWith(
      query,
      [],
      false,
      MAX_INITIAL_RESULTS
    );
  });

  it("Should load up to MAX_TOTAL_RESULTS and remove the button when the Load More button is clicked", async () => {
    const query = "load_all";
    mockGetStatVarSearchResults.mockResolvedValueOnce(
      createMockResponse(MAX_INITIAL_RESULTS)
    );
    mockGetStatVarSearchResults.mockResolvedValueOnce(
      createMockResponse(MAX_TOTAL_RESULTS)
    );

    simulateInput(query);
    jest.advanceTimersByTime(300);
    await Promise.resolve();
    wrapper.update();

    expect(wrapper.find(".search-result-value").length).toEqual(
      MAX_INITIAL_RESULTS
    );
    expect(wrapper.find(".load-more-button").exists()).toBe(true);
    expect(wrapper.find(".load-more-button").text()).toContain(
      "Load More Results"
    );
    expect(mockGetStatVarSearchResults).toHaveBeenCalledTimes(1);
    expect(mockGetStatVarSearchResults).toHaveBeenCalledWith(
      query,
      [],
      false,
      MAX_INITIAL_RESULTS
    );

    wrapper.find(".load-more-button").simulate("click");
    wrapper.update();

    expect(wrapper.find(".search-result-value").length).toEqual(
      MAX_INITIAL_RESULTS
    );
    expect(wrapper.find(".load-more-button").exists()).toBe(true);
    expect(wrapper.find(".load-more-button").text()).toContain("Loading");
    expect(wrapper.find(".load-more-button #sv-search-spinner").exists()).toBe(
      true
    );

    await Promise.resolve();
    wrapper.update();

    expect(mockGetStatVarSearchResults).toHaveBeenCalledTimes(2);
    expect(mockGetStatVarSearchResults).toHaveBeenCalledWith(
      query,
      [],
      false,
      MAX_TOTAL_RESULTS
    );

    expect(wrapper.find(".search-result-value").length).toEqual(
      MAX_TOTAL_RESULTS
    );
    expect(wrapper.find(".load-more-button").exists()).toBe(false);
    expect(wrapper.find(".sv-search-loading").exists()).toBe(false);
    expect(wrapper.find(".no-results-message").exists()).toBe(false);
  });
});
