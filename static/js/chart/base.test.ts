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

import { formatYAxisTicks, shouldFillInValues } from "./base";
import { setLocaleForTest } from "../i18n/i18n";
import * as d3 from "d3";

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

function hexEncode(str: string): string {
  var hex, i;

  var result = "";
  for (i = 0; i < str.length; i++) {
    hex = str.charCodeAt(i).toString(16);
    result += "\\u00" + hex;
    // console.log(("000" + hex).slice(-4));
    // result += ("\\u000" + hex).slice(-4);
  }

  return result;
}

function hexDecode(str: string): string {
  var j;
  var hexes = str.match(/.{1,4}/g) || [];
  var back = "";
  for (j = 0; j < hexes.length; j++) {
    back += String.fromCharCode(parseInt(hexes[j], 16));
  }

  return back;
}

test("formatYAxisTicks", () => {
  const cases: {
    value: number;
    domain: number[];
    unit?: string;
    expected: { [lang: string]: string };
  }[] = [
    {
      value: 150000000,
      domain: [0, 175000000],
      expected: {
        en: "150M",
        de: "150\xa0Mio.",
        es: "150\xa0M",
        fr: "150\xa0M", // \xa0 is a non-breaking space
        hi: "15\xa0क॰",
        it: "150\xa0Mln",
        ja: "1.5億",
        ko: "1.5억",
        ru: "150\xa0млн",
      },
    },
    {
      value: 800000,
      domain: [0, 1400000],
      expected: {
        en: "800K", // Ideally: 0.8M
        de: "800.000",
        es: "800\xa0mil",
        fr: "800\xa0k",
        hi: "8\xa0लाख",
        it: "800.000",
        ja: "80万",
        ko: "80만",
        ru: "800\xa0тыс.",
      },
    },
    {
      value: 2000,
      domain: [0, 3500],
      expected: {
        en: "2K",
        de: "2000",
        es: "2\xa0mil",
        fr: "2\xa0k",
        hi: "2\xa0हज़ार",
        it: "2000",
        ja: "2000",
        ko: "2천",
        ru: "2\xa0тыс.",
      },
    },
    {
      value: 0.05,
      domain: [0, 0.06],
      expected: {
        en: "0.05",
        de: "0,05",
        es: "0,05",
        fr: "0,05",
        hi: "0.05",
        it: "0,05",
        ja: "0.05",
        ko: "0.05",
        ru: "0,05",
      },
    },
    {
      value: 35000000000,
      domain: [0, 30000000],
      unit: "$",
      expected: {
        en: "$35B",
        de: "35\xa0Mrd.\xa0$",
        es: "35\xa0mil\xa0M$",
        fr: "35\xa0Md\xa0$",
        hi: "$35\xa0अ॰",
        it: "35\xa0Mrd\xa0$",
        ja: "$350億",
        ko: "$350억",
        ru: "35\xa0млрд\xa0$",
      },
    },
    {
      value: 25000,
      domain: [0, 30000],
      unit: "$",
      expected: {
        en: "$25K",
        de: "25.000\xa0$",
        es: "25\xa0mil\xa0$",
        fr: "25\xa0k\xa0$",
        hi: "$25\xa0हज़ार",
        it: "25.000\xa0$",
        ja: "$2.5万",
        ko: "$2.5만",
        ru: "25\xa0тыс.\xa0$",
      },
    },
    {
      value: 0.25,
      domain: [0, 0.35],
      unit: "%",
      expected: {
        en: "0.25%",
        de: "0,25\xa0%",
        es: "0,25\xa0%",
        fr: "0,25\xa0%",
        hi: "0.25%",
        it: "0,25%",
        ja: "0.25%",
        ko: "0.25%",
        ru: "0,25\xa0%",
      },
    },
    {
      value: 30,
      domain: [0, 100],
      unit: "%",
      expected: {
        en: "30%",
        de: "30\xa0%",
        es: "30\xa0%",
        fr: "30\xa0%",
        hi: "30%",
        it: "30%",
        ja: "30%",
        ko: "30%",
        ru: "30\xa0%",
      },
    },
    {
      value: 20,
      domain: [0, 25],
      unit: "t",
      expected: {
        en: "20 t",
        de: "20 t",
        es: "20 t",
        fr: "20 t",
        hi: "20 t",
        it: "20 t",
        ja: "20 t",
        ko: "20 t",
        ru: "20 t",
      },
    },
    {
      value: 150000000,
      domain: [0, 200000000],
      unit: "g",
      expected: {
        en: "150M g",
        de: "150\xa0Mio. g",
        es: "150\xa0M g",
        fr: "150\xa0M g", // \xa0 is a non-breaking space
        hi: "15\xa0क॰ g",
        it: "150\xa0Mln g",
        ja: "1.5億 g",
        ko: "1.5억 g",
        ru: "150\xa0млн g",
      },
    },
    {
      value: 0.05,
      domain: [0, 0.06],
      unit: "kWh",
      expected: {
        en: "0.05 kWh",
        de: "0,05 kWh",
        es: "0,05 kWh",
        fr: "0,05 kWh",
        hi: "0.05 kWh",
        it: "0,05 kWh",
        ja: "0.05 kWh",
        ko: "0.05 kWh",
        ru: "0,05 kWh",
      },
    },
  ];

  for (let c of cases) {
    for (let [lang, result] of Object.entries(c.expected)) {
      setLocaleForTest(lang, {});

      let yScale = d3.scaleLinear().domain(c.domain);
      let text = formatYAxisTicks(c.value, yScale, c.unit);
      try {
        expect(text).toEqual(result);
      } catch (e) {
        console.log(
          `Failed for ${c.value}, ${lang}: return value = ${hexEncode(text)}`
        );
        throw e;
      }
    }
  }
});
