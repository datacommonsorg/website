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

interface TestCase {
  input: string;
  calls?: DcCalls;
  expected: string;
}

const FACT_CHECK_ICON_HTML =
  '<span class="material-icons-outlined">fact_check</span>';

const DISCLAIMER_TOOLTIP_HTML =
  '<div class="dc-stat-tooltip">' +
  '<div class="dc-stat-tooltip-title">Data Commons · Fact Check</div>' +
  '<div class="dc-stat-tooltip-value">' +
  "No reference found or available on Data Commons." +
  "</div>" +
  "</div>";

test("processText", () => {
  // TODO pass calls too

  const testCases: TestCase[] = [
    // DC stat and DC response
    // -> inline DC stat plus DC stat tooltip
    {
      input:
        "Median household income:** [__DC__#1(116068 USD [1]* || $98,588)]",
      calls: {
        "1": {
          dcResponse: "Median Household Income in United States",
          dcStat: "116068 USD",
        },
      } as unknown as DcCalls,
      expected:
        "Median household income:** " +
        '<span class="annotation annotation-1 inline-stat">' +
        '<span class="llm-stat"> $98,588' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        '<div class="dc-stat-tooltip">' +
        '<div class="dc-stat-tooltip-title">Data Commons · Fact Check</div>' +
        '<div class="dc-stat-tooltip-value">' +
        "116068 USD - Median Household Income in United States" +
        "</div>" +
        "</div>" +
        "</span>",
    },

    // DC stat and DC response, plus footnote in input
    // -> inline DC stat plus DC stat tooltip with footnote info
    {
      input:
        "Median household income:** [__DC__#1(116068 USD [1]* || $98,588)]" +
        "\n ### FOOTNOTES ### \n[1] - Per census.gov, value was 116068 USD in 2021. " +
        "See more at datacommons.org/something",
      calls: {
        "1": {
          dcResponse: "Median Household Income in United States",
          dcStat: "116068 USD",
        },
      } as unknown as DcCalls,
      expected:
        "Median household income:** " +
        '<span class="annotation annotation-1 inline-stat">' +
        '<span class="llm-stat"> $98,588' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        '<div class="dc-stat-tooltip">' +
        '<div class="dc-stat-tooltip-title">Data Commons · Fact Check</div>' +
        '<div class="dc-stat-tooltip-value">' +
        "116068 USD - Median Household Income in United States; [REF] census.gov (2021)" +
        "</div>" +
        '<div class="dc-stat-tooltip-link">' +
        '<a target="_blank" href="datacommons.org/something">' +
        "View more on Data Commons" +
        "</a>" +
        "</div>" +
        "</div>" +
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
          dcStat: "128184 Infl. adj. USD (CY)",
        },
      } as unknown as DcCalls,
      expected:
        "Average household income:** " +
        '<span class="annotation annotation-2 inline-stat">' +
        '<span class="llm-stat"> $108,748' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        '<div class="dc-stat-tooltip">' +
        '<div class="dc-stat-tooltip-title">Data Commons · Fact Check</div>' +
        '<div class="dc-stat-tooltip-value">128184 Infl. adj. USD (CY)</div>' +
        "</div>" +
        "</span>",
    },

    // DC stat but no call info for this call ID
    // -> disclaimer tooltip (since DC stat is taken from calls only)
    {
      input:
        "Average household income:** [__DC__#2(128184 Infl. adj. USD (CY) [2]* || $108,748)]",
      calls: {
        "1": {
          dcResponse: "mismatched",
          dcStat: "128184 Infl. adj. USD (CY)",
        },
      } as unknown as DcCalls,
      expected:
        "Average household income:** " +
        '<span class="annotation annotation-2 inline-stat annotation-no-dc-stat">' +
        '<span class="llm-stat"> $108,748' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        DISCLAIMER_TOOLTIP_HTML +
        "</span>",
    },

    // DC stat but no call info for any calls
    // -> disclaimer tooltip (since DC stat is taken from calls only)
    {
      input:
        "Average household income:** [__DC__#2(128184 Infl. adj. USD (CY) [2]* || $108,748)]",
      expected:
        "Average household income:** " +
        '<span class="annotation annotation-2 inline-stat annotation-no-dc-stat">' +
        '<span class="llm-stat"> $108,748' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        DISCLAIMER_TOOLTIP_HTML +
        "</span>",
    },

    // Empty DC stats
    // -> disclaimer tooltips
    {
      input:
        "the amount of new credit issued increasing from [__DC__#1($1.8 trillion)] " +
        "to [__DC__#2($27 trillion)] in 2023. This represents a " +
        "[__DC__#3(133%)] increase over the past two decades",
      expected:
        "the amount of new credit issued increasing from " +
        '<span class="annotation annotation-1 inline-stat annotation-no-dc-stat">' +
        '<span class="llm-stat">$1.8 trillion' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        DISCLAIMER_TOOLTIP_HTML +
        "</span>" +
        " to " +
        '<span class="annotation annotation-2 inline-stat annotation-no-dc-stat">' +
        '<span class="llm-stat">$27 trillion' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        DISCLAIMER_TOOLTIP_HTML +
        "</span>" +
        " in 2023. This represents a " +
        '<span class="annotation annotation-3 inline-stat annotation-no-dc-stat">' +
        '<span class="llm-stat">133%' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        DISCLAIMER_TOOLTIP_HTML +
        "</span>" +
        " increase over the past two decades",
    },

    // Empty DC stat, non-empty DC response
    // -> disclaimer tooltip
    {
      input: "China ([__DC__#1(245 billion kWh)])",
      calls: {
        "1": {
          dcResponse: "should not be used",
        },
      } as unknown as DcCalls,
      expected:
        "China (" +
        '<span class="annotation annotation-1 inline-stat annotation-no-dc-stat">' +
        '<span class="llm-stat">245 billion kWh' +
        FACT_CHECK_ICON_HTML +
        "</span>" +
        DISCLAIMER_TOOLTIP_HTML +
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
