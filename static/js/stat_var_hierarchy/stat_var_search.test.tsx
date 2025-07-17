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

describe("StatVarHierarchySearch Component - search method", () => {
  let wrapper: any;
  let instance: StatVarHierarchySearch;
  let mockGetStatVarSearchResults: jest.Mock;

  const createMockResponse = (numSvResults: number) => ({
    matches: [],
    statVarGroups: [],
    statVars: Array(numSvResults).fill({ name: "sv", dcid: "sv" }),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    wrapper = shallow(
      <StatVarHierarchySearch entities={[]} onSelectionChange={_.noop} />
    );
    instance = wrapper.instance() as StatVarHierarchySearch;

    mockGetStatVarSearchResults = getStatVarSearchResults as jest.Mock;

    jest.spyOn(instance, "setState");

    instance.state = {
      query: "",
      matches: [],
      showNoResultsMessage: false,
      showResults: true,
      svgResults: [],
      svResults: [],
      showLoadMoreButton: false,
      showMoreResultsLoading: false,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("showLoadMoreButton is false when less than MAX_INITIAL_RESULTS are returned", async () => {
    const query = "less_than_max";
    const returnedResults = MAX_INITIAL_RESULTS - 10;

    mockGetStatVarSearchResults.mockResolvedValue(
      createMockResponse(returnedResults)
    );

    wrapper.setState({
      query,
    });

    (instance as any).search(query, MAX_INITIAL_RESULTS)();

    await new Promise(process.nextTick);

    const setStateCall = (instance.setState as jest.Mock).mock.calls[0][0];

    expect(setStateCall.svResults.length).toEqual(returnedResults);
    expect(setStateCall.showLoadMoreButton).toBe(false);
    expect(setStateCall.showMoreResultsLoading).toBe(false);

    expect(mockGetStatVarSearchResults).toHaveBeenCalledWith(
      query,
      [],
      false,
      MAX_INITIAL_RESULTS
    );
  });

  test("showLoadMoreButton is true when exactly MAX_INITIAL_RESULTS are returned", async () => {
    const query = "exactly_max";
    const returnedResults = MAX_INITIAL_RESULTS;

    mockGetStatVarSearchResults.mockResolvedValue(
      createMockResponse(returnedResults)
    );

    wrapper.setState({
      query,
    });

    (instance as any).search(query, MAX_INITIAL_RESULTS)();

    await new Promise(process.nextTick);

    const setStateCall = (instance.setState as jest.Mock).mock.calls[0][0];

    expect(setStateCall.svResults.length).toEqual(returnedResults);
    expect(setStateCall.showLoadMoreButton).toBe(true);
    expect(setStateCall.showMoreResultsLoading).toBe(false);

    expect(mockGetStatVarSearchResults).toHaveBeenCalledWith(
      query,
      [],
      false,
      MAX_INITIAL_RESULTS
    );
  });

  test("showLoadMoreButton is false once more results are loaded", async () => {
    const query = "load_more_scenario";
    const returnedResults = MAX_TOTAL_RESULTS;

    mockGetStatVarSearchResults.mockResolvedValue(
      createMockResponse(returnedResults)
    );

    wrapper.setState({
      query,
      showResults: true,
      svResults: [{ name: "existing_sv", dcid: "existing_sv" }],
      showLoadMoreButton: true,
      showMoreResultsLoading: true,
    });

    (instance as any).search(query, MAX_TOTAL_RESULTS)();

    await new Promise(process.nextTick);

    const setStateCall = (instance.setState as jest.Mock).mock.calls[0][0];

    expect(setStateCall.svResults.length).toEqual(returnedResults);
    expect(setStateCall.showLoadMoreButton).toBe(false);
    expect(setStateCall.showMoreResultsLoading).toBe(false);

    expect(mockGetStatVarSearchResults).toHaveBeenCalledWith(
      query,
      [],
      false,
      returnedResults
    );
  });
});
