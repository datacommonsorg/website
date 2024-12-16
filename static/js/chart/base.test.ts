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

import { DataGroup, DataPoint, shouldFillInValues, wrap } from "./base";

test("minOfNullValues", () => {
  const group = new DataGroup("label", [
    new DataPoint("2011", null),
    new DataPoint("2011", 100),
    new DataPoint("2011", 300),
  ]);
  expect(group.min()).toBe(100);
});

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
  (window.SVGElement as any).prototype.getComputedTextLength =
    function (): number {
      // Title elements don't contribute to width
      if (this.tagName === "title") {
        return 0;
      }
      return this.textContent.length;
    };

  // JSDom does not define SVGTSpanElements, and use SVGElement instead. Defines
  // a shim for getBBox (only returns width) where each character is 1 px wide.
  (window.SVGElement as any).prototype.getBBox = function () {
    let maxWidth = 0;
    const children = this.childNodes;
    for (let i = 0; i < children.length; i++) {
      maxWidth = Math.max(children[i].getComputedTextLength(), maxWidth);
    }
    return { width: maxWidth };
  };
});

describe("wrap tests", () => {
  test.each`
    width | label                             | expectedLabels                              | shouldOverflow
    ${4}  | ${"ab-d e f"}                     | ${["ab-", "d e", "f"]}                      | ${false}
    ${10} | ${"a-b c"}                        | ${["a-b c"]}                                | ${false}
    ${10} | ${"a b-c"}                        | ${["a b-c"]}                                | ${false}
    ${2}  | ${"a-b c"}                        | ${["a-", "b", "c"]}                         | ${false}
    ${3}  | ${"New York, NY"}                 | ${["New", "York,", "NY"]}                   | ${true}
    ${3}  | ${"Queens, NY"}                   | ${["Queens,", "NY"]}                        | ${true}
    ${3}  | ${"Queens-NY"}                    | ${["Queens-", "NY"]}                        | ${true}
    ${6}  | ${"United-States-of-America"}     | ${["United-", "States-", "of-", "America"]} | ${true}
    ${6}  | ${"United States of America"}     | ${["United", "States", "of", "America"]}    | ${true}
    ${10} | ${"United States of America"}     | ${["United", "States of", "America"]}       | ${false}
    ${1}  | ${"アメリカ合衆国"}               | ${["アメリカ合衆国"]}                       | ${true}
    ${1}  | ${"ブロンクス区, ニューヨーク州"} | ${["ブロンクス区,", "ニューヨーク州"]}      | ${true}
    ${10} | ${"ニューヨーク, ニューヨーク州"} | ${["ニューヨーク,", "ニューヨーク州"]}      | ${false}
  `("wraps $label", ({ width, label, expectedLabels, shouldOverflow }) => {
    document.body.innerHTML = `<svg width=100><text>${label}</text></svg>`;
    wrap(d3.selectAll("text"), width);

    d3.selectAll("tspan").each(function (a, i) {
      const tspanText = d3.select(this).text();
      expect(tspanText).toBe(expectedLabels[i]);
    });
    expect(d3.selectAll("tspan").size()).toBe(expectedLabels.length);
    d3.selectAll("tspan").each(function (d, i) {
      expect(d3.select(this).text()).toBe(expectedLabels[i]);
    });
    expect(d3.selectAll("text").filter("[wrap-overflow='1']").size() > 0).toBe(
      shouldOverflow
    );
  });
});
