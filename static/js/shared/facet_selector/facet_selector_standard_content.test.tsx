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
import { render } from "@testing-library/react";
import React from "react";

import theme from "../../theme/theme";
import { FacetSelectorStandardContent } from "./facet_selector_standard_content";

describe("FacetSelectorStandardContent", () => {
  // Test: Grouping of facet options by provenanceId when importName is absent.
  // Situation: Three facets have numeric IDs ("100", "200", "300") where "100"
  //   and "300" share a provenanceId and "200" has a different provenanceId.
  // Expectation: Facets with the same provenanceId ("100" and "300") are
  //   grouped together rather than interleaved by numeric facetId order.
  it("groups facet options by provenanceId when importName is missing", () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <FacetSelectorStandardContent
          facetList={[
            {
              dcid: "Count_Person",
              name: "Population",
              metadataMap: {
                "100": {
                  provenanceId: "dc/base/CensusACS5YearSurvey",
                  provenanceName: "U.S. Census Bureau",
                  observationPeriod: "P5Y",
                },
                "200": {
                  provenanceId: "dc/base/WikidataPopulation",
                  provenanceName: "Wikidata",
                },
                "300": {
                  provenanceId: "dc/base/CensusACS5YearSurvey",
                  provenanceName: "U.S. Census Bureau",
                  observationPeriod: "P1Y",
                },
              },
            },
          ]}
          modalSelections={{ ["Count_Person"]: "" }}
          onSelectionChange={jest.fn()}
        />
      </ThemeProvider>
    );

    const radioInputs = Array.from(
      container.querySelectorAll('input[type="radio"]')
    );
    const optionIds = radioInputs.map((input) => input.id);
    expect(optionIds).toEqual([
      "Count_Person-default-option",
      "Count_Person-100-option",
      "Count_Person-300-option",
      "Count_Person-200-option",
    ]);
  });
});
