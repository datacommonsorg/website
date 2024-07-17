/**
 * Copyright 2024 Google LLC
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
import { DcCalls } from "./types";
import { processText } from "./util";

test("processText", () => {
  // TODO pass calls too

  const testCases = [
    // DC stat and DC response
    // -> inline DC stat plus DC stat tooltip
    {
      input:
        "Median household income:** [__DC__#1(116068 USD [1]* || $98,588)]",
      calls: {
        "1": {
          dcResponse: "Median Household Income in United States",
        },
      } as unknown as DcCalls,
      expected:
        "Median household income:** " +
        '<span class="annotation annotation-1">' +
        '<span class="llm-stat"> $98,588</span>' +
        '<span class="dc-stat-tooltip">' +
        '<span class="dc-stat-tooltip-label">Median Household Income in United States</span>: ' +
        '<span class="dc-stat-tooltip-value">116068 USD [1]* </span>' +
        "</span>" +
        "</span>",
    },

    // DC stat but no DC response
    // -> tooltip with stat only (empty label)
    {
      input:
        "Average household income:** [__DC__#2(128184 Infl. adj. USD (CY) [2]* || $108,748)]",
      calls: {
        "2": {
          dcResponse: "",
        },
      } as unknown as DcCalls,
      expected:
        "Average household income:** " +
        '<span class="annotation annotation-2">' +
        '<span class="llm-stat"> $108,748</span>' +
        '<span class="dc-stat-tooltip">' +
        '<span class="dc-stat-tooltip-label"></span>: ' +
        '<span class="dc-stat-tooltip-value">128184 Infl. adj. USD (CY) [2]* </span>' +
        "</span>" +
        "</span>",
    },

    // DC stat but no call info for this call ID
    // -> tooltip with stat only (empty label)
    {
      input:
        "Average household income:** [__DC__#2(128184 Infl. adj. USD (CY) [2]* || $108,748)]",
      calls: {
        "1": {
          dcResponse: "mismatched",
        },
      } as unknown as DcCalls,
      expected:
        "Average household income:** " +
        '<span class="annotation annotation-2">' +
        '<span class="llm-stat"> $108,748</span>' +
        '<span class="dc-stat-tooltip">' +
        '<span class="dc-stat-tooltip-label"></span>: ' +
        '<span class="dc-stat-tooltip-value">128184 Infl. adj. USD (CY) [2]* </span>' +
        "</span>" +
        "</span>",
    },

    // DC stat but no call info for any calls
    // -> tooltip with stat only (empty label)
    {
      input:
        "Average household income:** [__DC__#2(128184 Infl. adj. USD (CY) [2]* || $108,748)]",
      expected:
        "Average household income:** " +
        '<span class="annotation annotation-2">' +
        '<span class="llm-stat"> $108,748</span>' +
        '<span class="dc-stat-tooltip">' +
        '<span class="dc-stat-tooltip-label"></span>: ' +
        '<span class="dc-stat-tooltip-value">128184 Infl. adj. USD (CY) [2]* </span>' +
        "</span>" +
        "</span>",
    },

    // Empty DC stats
    // -> no tooltips
    {
      input:
        "the amount of new credit issued increasing from [__DC__#1($1.8 trillion)] " +
        "to [__DC__#2($27 trillion)] in 2023. This represents a " +
        "[__DC__#3(133%)] increase over the past two decades",
      expected:
        "the amount of new credit issued increasing from " +
        '<span class="annotation annotation-1 annotation-no-dc-stat">' +
        '<span class="llm-stat">$1.8 trillion</span>' +
        "</span>" +
        " to " +
        '<span class="annotation annotation-2 annotation-no-dc-stat">' +
        '<span class="llm-stat">$27 trillion</span></span>' +
        " in 2023. This represents a " +
        '<span class="annotation annotation-3 annotation-no-dc-stat">' +
        '<span class="llm-stat">133%</span></span>' +
        " increase over the past two decades",
    },

    // Empty DC stat, non-empty DC response
    // -> no tooltip
    {
      input: "China ([__DC__#1(245 billion kWh)])",
      calls: {
        "1": {
          dcResponse: "should not be used",
        },
      } as unknown as DcCalls,
      expected:
        "China (" +
        '<span class="annotation annotation-1 annotation-no-dc-stat">' +
        '<span class="llm-stat">245 billion kWh</span>' +
        "</span>" +
        ")",
    },
  ];
  for (const testCase of testCases) {
    expect(processText(testCase.input, testCase.calls)).toEqual(
      testCase.expected
    );
  }
});
