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

import { ThemeProvider } from "@emotion/react";
import { render, RenderResult, screen } from "@testing-library/react";
import React from "react";

import theme from "../../theme/theme";
import { FacetOptionContent } from "./facet_option_content";

describe("FacetOptionContent", () => {
  const renderWithTheme = (ui: React.ReactElement): RenderResult =>
    render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

  // Test: Primary title derivation from provenanceName and no detail pollution.
  // Situation: Facet has provenanceName and provenanceId, but no sourceName or importName.
  // Expectation: Title displays provenanceName; the raw provenanceId segment is not rendered as a detail item.
  it("renders provenanceName as title and does not leak provenanceId segment into details", () => {
    renderWithTheme(
      <FacetOptionContent
        metadata={{
          provenanceName: "U.S. Census Bureau",
          provenanceId: "dc/base/Census",
        }}
      />
    );

    expect(screen.getByText("U.S. Census Bureau")).toBeTruthy();
    expect(screen.queryByText("Census")).toBeNull();
  });

  // Test: Fallback to displayName.
  // Situation: Facet lacks provenanceName, but displayName is supplied.
  // Expectation: Title displays displayName.
  it("renders displayName as title when provenanceName is absent", () => {
    renderWithTheme(
      <FacetOptionContent
        displayName="Custom Display Source"
        metadata={{
          provenanceId: "dc/base/Census",
        }}
      />
    );

    expect(screen.getByText("Custom Display Source")).toBeTruthy();
  });

  // Test: Fallback to sourceName.
  // Situation: Facet has sourceName but no provenanceName or displayName.
  // Expectation: Title displays sourceName.
  it("renders sourceName as title when provenanceName is absent", () => {
    renderWithTheme(
      <FacetOptionContent
        metadata={{
          sourceName: "Census.gov",
          provenanceId: "dc/base/Census",
        }}
      />
    );

    expect(screen.getByText("Census.gov")).toBeTruthy();
  });

  // Test: Precedence of importName over provenanceId segment.
  // Situation: Facet has importName and provenanceId, but no provenanceName or sourceName.
  // Expectation: Title displays importName.
  it("renders importName as title over raw provenanceId segment", () => {
    renderWithTheme(
      <FacetOptionContent
        metadata={{
          importName: "CensusACS5YearSurvey",
          provenanceId: "dc/base/Census",
        }}
      />
    );

    expect(screen.getByText("CensusACS5YearSurvey")).toBeTruthy();
    expect(screen.queryByText("Census")).toBeNull();
  });

  // Test: Fallback to trailing segment of provenanceId.
  // Situation: Enrichment failed; provenanceName, sourceName, and importName are all absent, but provenanceId exists.
  // Expectation: Title displays the trailing segment of provenanceId.
  it("renders trailing segment of provenanceId when all human-readable names are absent", () => {
    renderWithTheme(
      <FacetOptionContent
        metadata={{
          provenanceId: "dc/base/EurostatData",
        }}
      />
    );

    expect(screen.getByText("EurostatData")).toBeTruthy();
  });

  // Test: Fallback to measurementMethod when provenance identifiers are missing.
  // Situation: Facet lacks all provenance names and provenanceId, but has measurementMethod.
  // Expectation: Title displays measurementMethod and does not duplicate it in the details list.
  it("renders measurementMethod as title when provenance identifiers are absent and deduplicates in details", () => {
    const { container } = renderWithTheme(
      <FacetOptionContent
        metadata={{
          measurementMethod: "CensusSurvey",
        }}
      />
    );

    expect(screen.getByText("CensusSurvey")).toBeTruthy();
    const detailItems = container.querySelectorAll("ul li");
    expect(detailItems.length).toBe(0);
  });

  // Test: Legitimate secondary detail rendering.
  // Situation: Facet has both provenanceName and sourceName.
  // Expectation: Primary title is provenanceName; detail list contains sourceName.
  it("renders sourceName as detail item when provenanceName is the primary title", () => {
    renderWithTheme(
      <FacetOptionContent
        metadata={{
          provenanceName: "U.S. Census Bureau",
          sourceName: "Census.gov",
          provenanceId: "dc/base/Census",
        }}
      />
    );

    expect(screen.getByText("U.S. Census Bureau")).toBeTruthy();
    expect(screen.getByText("Census.gov")).toBeTruthy();
    expect(screen.queryByText("Census")).toBeNull();
  });

  // Test: Empty metadata renders combined dataset option.
  // Situation: Empty metadata object provided for chart and download modes.
  // Expectation: Renders localized combined dataset messages for charts and download respectively.
  it("renders combined dataset option message when metadata is empty", () => {
    const { rerender } = renderWithTheme(
      <FacetOptionContent metadata={{}} mode="chart" />
    );
    expect(
      screen.getByText(
        "Plot data points using one or more of the facets below to maximize coverage."
      )
    ).toBeTruthy();

    rerender(
      <ThemeProvider theme={theme}>
        <FacetOptionContent metadata={{}} mode="download" />
      </ThemeProvider>
    );
    expect(
      screen.getByText(
        "Combine data using one or more of the facets below to maximize coverage."
      )
    ).toBeTruthy();
  });

  // Test: Unit display formatting and symbol preservation.
  // Situation: Facet has unit symbol (e.g. "%") without unitDisplayName.
  // Expectation: Renders raw unit symbol without stripping via startCase.
  it("renders raw unit symbol when unitDisplayName is absent", () => {
    renderWithTheme(
      <FacetOptionContent
        metadata={{
          provenanceId: "dc/base/Census",
          unit: "%",
        }}
      />
    );

    expect(screen.getByText("Unit • %")).toBeTruthy();
  });

  // Test: Unit display name formatting with startCase.
  // Situation: Facet has unitDisplayName.
  // Expectation: Applies startCase to unitDisplayName.
  it("applies startCase to unitDisplayName", () => {
    renderWithTheme(
      <FacetOptionContent
        metadata={{
          provenanceId: "dc/base/Census",
          unitDisplayName: "metric_ton",
        }}
      />
    );

    expect(screen.getByText("Unit • Metric Ton")).toBeTruthy();
  });
});
