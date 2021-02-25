/**
 * Copyright 2020 Google LLC
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

import * as d3 from "d3";
import { shouldFillInValues, wrap } from "./base";

test("shouldFillInValues", () => {
  let series = [
    [2000, null],
    [2001, 1],
    [2002, null],
  ];
  expect(shouldFillInValues(series)).toBe(false);

  series = [
    [2001, 1],
    [2002, 1],
    [2003, null],
  ];
  expect(shouldFillInValues(series)).toBe(false);

  series = [
    [2000, null],
    [2001, 1],
    [2002, 1],
  ];
  expect(shouldFillInValues(series)).toBe(false);

  series = [
    [2000, null],
    [2001, 1],
    [2002, 1],
    [2003, null],
  ];
  expect(shouldFillInValues(series)).toBe(false);

  series = [
    [2000, null],
    [2001, 1],
    [2002, null],
    [2003, 1],
    [2004, null],
  ];
  expect(shouldFillInValues(series)).toBe(true);

  series = [
    [2000, null],
    [2001, 1],
    [2002, 1],
    [2003, null],
    [2004, 1],
    [2005, null],
  ];
  expect(shouldFillInValues(series)).toBe(true);
});

beforeEach(() => {
  // JSDom does not define SVGTSpanElements, and use SVGElement instead. Defines
  // a shim for getComputedTextLength where each character is 1 px wide.
  (window.SVGElement as any).prototype.getComputedTextLength = function () {
    return this.textContent.length;
  };
});

describe("wrap tests", () => {
  interface TestData {
    width: number;
    label: string;
    expectedLabels: string[];
  }
  test.each`
    width | label                             | expectedLabels
    ${4}  | ${"ab-d e f"}                     | ${["ab-", "d e", "f"]}
    ${10} | ${"a-b c"}                        | ${["a-b c"]}
    ${10} | ${"a b-c"}                        | ${["a b-c"]}
    ${2}  | ${"a-b c"}                        | ${["a-", "b", "c"]}
    ${3}  | ${"New York, NY"}                 | ${["New", "York,", "NY"]}
    ${3}  | ${"Queens, NY"}                   | ${["Queens,", "NY"]}
    ${3}  | ${"Queens-NY"}                    | ${["Queens-", "NY"]}
    ${6}  | ${"United-States-of-America"}     | ${["United-", "States-", "of-", "America"]}
    ${6}  | ${"United States of America"}     | ${["United", "States", "of", "America"]}
    ${10} | ${"United States of America"}     | ${["United", "States of", "America"]}
    ${1}  | ${"アメリカ合衆国"}               | ${["アメリカ合衆国"]}
    ${1}  | ${"ブロンクス区, ニューヨーク州"} | ${["ブロンクス区,", "ニューヨーク州"]}
  `("wraps $label", ({ width, label, expectedLabels }) => {
    document.body.innerHTML = `<svg width=100><text>${label}</text></svg>`;
    wrap(d3.selectAll("text"), width);

    expect(d3.selectAll("text").text()).toBe(expectedLabels.join(""));
    expect(d3.selectAll("tspan").size()).toBe(expectedLabels.length);
    d3.selectAll("tspan").each(function (d, i) {
      expect(d3.select(this).text()).toBe(expectedLabels[i]);
    });
  });
});
