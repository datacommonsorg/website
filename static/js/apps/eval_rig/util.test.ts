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
import { processText } from "./util";

test("processText", () => {
  const testCases = [
    [
      "Median household income:** [__DC__#1(116068 USD [1]* || $98,588)]",
      'Median household income:** <span class="annotation annotation-1"><span class="dc-stat">116068 USD [1]* </span>||<span class="llm-stat"> $98,588</span></span>',
    ],
    [
      "Average household income:** [__DC__#2(128184 Infl. adj. USD (CY) [2]* || $108,748)]",
      'Average household income:** <span class="annotation annotation-2"><span class="dc-stat">128184 Infl. adj. USD (CY) [2]* </span>||<span class="llm-stat"> $108,748</span></span>',
    ],
    [
      "the amount of new credit issued increasing from [__DC__#1($1.8 trillion)] to [__DC__#2($27 trillion)] in 2023. This represents a [__DC__#3(133%)] increase over the past two decades",
      'the amount of new credit issued increasing from <span class="annotation annotation-1"><span class="dc-stat">&nbsp;&nbsp;</span>||<span class="llm-stat">$1.8 trillion</span></span> to <span class="annotation annotation-2"><span class="dc-stat">&nbsp;&nbsp;</span>||<span class="llm-stat">$27 trillion</span></span> in 2023. This represents a <span class="annotation annotation-3"><span class="dc-stat">&nbsp;&nbsp;</span>||<span class="llm-stat">133%</span></span> increase over the past two decades',
    ],
    [
      "China ([__DC__#1(245 billion kWh)])",
      `China (<span class="annotation annotation-1"><span class="dc-stat">&nbsp;&nbsp;</span>||<span class="llm-stat">245 billion kWh</span></span>)`,
    ],
  ];
  for (const testCase of testCases) {
    expect(processText(testCase[0])).toEqual(testCase[1]);
  }
});
