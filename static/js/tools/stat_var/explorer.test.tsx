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

import { render } from "@testing-library/react";
import React from "react";

import { ProvenanceSummary } from "../../shared/types";
import { Explorer } from "./explorer";

function summary(importName?: string): ProvenanceSummary {
  return {
    importName,
    observationCount: 1,
    timeSeriesCount: 1,
    seriesSummary: [],
  };
}

describe("Explorer", () => {
  // Test: Provenance cards render and sort when importName is missing.
  // Situation: One provenance has importName "Census"; two lack importName and
  //   are keyed by "dc/base/WikidataPopulation" and "dc/base/BLS_LAUS".
  // Expectation: Cards render without throwing, headers fall back to the last
  //   provenance id segment, and all are sorted by display name.
  it("falls back to the provenance id segment for display and sorting when importName is missing", () => {
    const { container } = render(
      <Explorer
        description=""
        displayName="Population"
        statVar="Count_Person"
        summary={{
          placeTypeSummary: {},
          provenanceSummary: {
            "dc/base/WikidataPopulation": summary(),
            "dc/base/CensusPEP": summary("Census"),
            "dc/base/BLS_LAUS": summary(),
          },
        }}
        urls={{}}
      />
    );

    const headers = Array.from(
      container.querySelectorAll(".provenance-summary h4")
    ).map((h) => h.textContent);
    expect(headers).toEqual(["BLS_LAUS", "Census", "WikidataPopulation"]);
  });
});
