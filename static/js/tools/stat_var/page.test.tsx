/**
 * Copyright 2026 Google LLC
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

import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import React from "react";

import { getStatVarInfo } from "../../shared/util";
import { Page } from "./page";

jest.mock("axios");
jest.mock("../../shared/util", () => ({
  ...jest.requireActual("../../shared/util"),
  getStatVarInfo: jest.fn(),
}));
jest.mock("../shared/stat_var_widget", () => ({
  StatVarWidget: (): null => null,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetStatVarInfo = getStatVarInfo as jest.MockedFunction<
  typeof getStatVarInfo
>;

const STAT_VAR = "Count_Person";

describe("Page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    window.location.hash = `#sv=${STAT_VAR}`;
  });

  // Test: Provenance source URLs render when the URL fetch resolves after the
  //   summary fetch.
  // Situation: The URL propvals request resolves on a later tick than the
  //   summary and sources requests, with no subsequent re-renders.
  // Expectation: The provenance card renders the "Source:" link once the URL
  //   request resolves.
  it("renders provenance source URLs when the URL request resolves after the summary", async () => {
    let resolveUrls: (value: unknown) => void;
    const urlPromise = new Promise((resolve) => {
      resolveUrls = resolve;
    });

    mockedAxios.get.mockImplementation((url, config) => {
      if (url.startsWith("/api/node/propvals/in")) {
        return Promise.resolve({ data: {} }) as ReturnType<typeof axios.get>;
      }
      const prop = config?.params?.prop;
      if (prop === "description") {
        return Promise.resolve({
          data: { [STAT_VAR]: [{ value: "Total population" }] },
        }) as ReturnType<typeof axios.get>;
      }
      if (prop === "name") {
        return Promise.resolve({
          data: { [STAT_VAR]: [{ value: "Population" }] },
        }) as ReturnType<typeof axios.get>;
      }
      if (prop === "url") {
        return urlPromise as ReturnType<typeof axios.get>;
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    mockedGetStatVarInfo.mockResolvedValue({
      data: {
        [STAT_VAR]: {
          placeTypeSummary: {},
          provenanceSummary: {
            "dc/base/CensusPEP": {
              importName: "CensusPEP",
              observationCount: 10,
              timeSeriesCount: 2,
              seriesSummary: [],
            },
          },
        },
      },
    } as Awaited<ReturnType<typeof getStatVarInfo>>);

    const { container } = render(<Page />);

    // Flush the summary/name/description promises first so any premature
    // setState runs before the URL response arrives.
    await new Promise((resolve) => setTimeout(resolve, 0));

    resolveUrls({
      data: {
        "dc/base/CensusPEP": [{ value: "https://www.census.gov/pep" }],
      },
    });

    await waitFor(() => {
      const link = container.querySelector(
        '.provenance-summary a[href="https://www.census.gov/pep"]'
      );
      expect(link).not.toBeNull();
      expect(link?.textContent).toBe("census.gov");
    });
  });

  // Test: Stale fetchSummary responses do not update state after the URL hash
  //   changes to a different statVar.
  // Situation: The URL hash changes to another statVar while the provenance
  //   URL request for Count_Person is still in flight.
  // Expectation: When Count_Person's URL request resolves, it does not render
  //   Count_Person.
  it("ignores stale fetchSummary responses when the URL hash changes", async () => {
    let resolveUrls: (value: unknown) => void;
    const urlPromise = new Promise((resolve) => {
      resolveUrls = resolve;
    });

    mockedAxios.get.mockImplementation((url, config) => {
      if (url.startsWith("/api/node/propvals/in")) {
        return Promise.resolve({ data: {} }) as ReturnType<typeof axios.get>;
      }
      const prop = config?.params?.prop;
      if (prop === "description" || prop === "name") {
        return Promise.resolve({
          data: { [STAT_VAR]: [{ value: "Population" }] },
        }) as ReturnType<typeof axios.get>;
      }
      if (prop === "url") {
        return urlPromise as ReturnType<typeof axios.get>;
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    mockedGetStatVarInfo.mockResolvedValue({
      data: {
        [STAT_VAR]: {
          placeTypeSummary: {},
          provenanceSummary: {
            "dc/base/CensusPEP": {
              importName: "CensusPEP",
              observationCount: 10,
              timeSeriesCount: 2,
              seriesSummary: [],
            },
          },
        },
      },
    } as Awaited<ReturnType<typeof getStatVarInfo>>);

    const { container } = render(<Page />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.history.replaceState(null, "", "#sv=Median_Age_Person");
    resolveUrls({
      data: {
        "dc/base/CensusPEP": [{ value: "https://www.census.gov/pep" }],
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.querySelector("#stat-var-explorer")).toBeNull();
  });
});
