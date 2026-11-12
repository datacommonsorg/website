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

import "@testing-library/jest-dom";

import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import React from "react";

import { ObservationChartSection } from "./observation_chart_section";

jest.mock("axios");
jest.mock("./observation_chart", () => ({
  ObservationChart: function MockObservationChart(): JSX.Element {
    return <div data-testid="mock-obs-chart" />;
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const STAT_VAR_ID = "Count_BirthEvent_LiveBirth";

describe("ObservationChartSection", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders provenanceUrl as a clickable new-window link with icon", async () => {
    const provUrl = "https://wonder.cdc.gov/natality.html";
    mockedAxios.get.mockResolvedValue({
      data: {
        data: {
          [STAT_VAR_ID]: {
            "geoId/12086": [
              {
                facet: "facet1",
                series: [{ date: "2024", value: 28150 }],
              },
            ],
          },
        },
        facets: {
          facet1: {
            observationPeriod: "P1Y",
            provenanceUrl: provUrl,
          },
        },
      },
    });

    const { container } = render(
      <ObservationChartSection
        placeDcid="geoId/12086"
        statVarId={STAT_VAR_ID}
        placeName="Miami-Dade County"
      />
    );

    await waitFor(() => {
      const link = container.querySelector("a.external-url-link");
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute("href", provUrl);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.textContent).toBe(provUrl);
      expect(link.querySelector("svg")).not.toBeNull();
    });
  });

  it("renders non-URL provenance string as plain text", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        data: {
          [STAT_VAR_ID]: {
            "geoId/12086": [
              {
                facet: "facet2",
                series: [{ date: "2024", value: 28150 }],
              },
            ],
          },
        },
        facets: {
          facet2: {
            observationPeriod: "P1Y",
            provenanceUrl: "Internal Dataset Source",
          },
        },
      },
    });

    const { container } = render(
      <ObservationChartSection
        placeDcid="geoId/12086"
        statVarId={STAT_VAR_ID}
        placeName="Miami-Dade County"
      />
    );

    await waitFor(() => {
      expect(container.textContent).toContain(
        "provenance: Internal Dataset Source"
      );
      expect(container.querySelector("a.external-url-link")).toBeNull();
    });
  });
});
