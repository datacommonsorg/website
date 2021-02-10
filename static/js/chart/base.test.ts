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
import { loadLocaleData } from "../i18n/i18n";
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

/**
 * Prints a string as hex - useful to displaying non-breaking spaces and other
 * characters that do not print well.
 */
function hexEncode(str: string): string {
  var hex, i;

  var result = "";
  for (i = 0; i < str.length; i++) {
    hex = str.charCodeAt(i).toString(16);
    result += "\\u00" + hex;
  }

  return result;
}

test("formatYAxisTicks", async () => {
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
        hi: "20 मीट्रिक टन",
        it: "20 t",
        ja: "20 t",
        ko: "20t",
        ru: "20 т",
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
        ko: "0.05kWh",
        ru: "0,05 кВт⋅ч",
      },
    },
    {
      value: 130000000,
      domain: [0, 200000000],
      unit: "g",
      expected: {
        en: "130M g",
        de: "130\xa0Mio. g",
        es: "130\xa0M g",
        fr: "130\xa0M g",
        hi: "13\xa0क॰ ग्रा॰",
        it: "130\xa0Mln g",
        ja: "1.3億 g",
        ko: "1.3억g",
        ru: "130\xa0млн г",
      },
    },
    {
      value: 1200000000,
      domain: [0, 1750000000],
      unit: "kg",
      expected: {
        en: "1.2B kg",
        de: "1,2\xa0Mrd. kg",
        es: "1200\xa0M kg",
        fr: "1,2\xa0Md kg",
        hi: "1.2\xa0अ॰ कि॰ग्रा॰",
        it: "1,2\xa0Mrd kg",
        ja: "12億 kg",
        ko: "12억kg",
        ru: "1,2\xa0млрд кг",
      },
    },
    {
      value: -0.5,
      domain: [-0.5, 0.05],
      unit: "L",
      expected: {
        en: "-0.5 L",
        de: "-0,5 l",
        es: "-0,5 l",
        fr: "-0,5 l",
        hi: "-0.5 ली॰",
        it: "-0,5 l",
        ja: "-0.5 L",
        ko: "-0.5L",
        ru: "-0,5 л",
      },
    },
  ];

  for (let locale of [ "de", "en", "es", "fr", "hi", "it", "ja", "ko", "ru" ]) {
    await loadLocaleData(locale, [
      import(`../i18n/compiled-lang/${locale}/units.json`),
    ]);
      for (let c of cases) {
        let yScale = d3.scaleLinear().domain(c.domain);
        let text = formatYAxisTicks(c.value, yScale, c.unit);
        try {
          expect(text).toEqual(c.expected[locale]);
        } catch (e) {
          console.log(
            `Failed for ${c.value}, ${locale}: return value = ${hexEncode(
              text
            )}`
          );
          throw e;
        }
      }
  }
});
