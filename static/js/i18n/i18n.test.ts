/**
 * Copyright 2023 Google LLC
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

import {
  formatDate,
  formatNumber,
  loadLocaleData,
  translateUnit,
} from "./i18n";

/**
 * Prints a string as hex - useful to displaying non-breaking spaces and other
 * characters that do not print well.
 */
function hexEncode(str: string): string {
  let hex;

  let result = "";
  for (let i = 0; i < str.length; i++) {
    hex = str.charCodeAt(i).toString(16);
    result += "\\u00" + hex;
  }

  return result;
}

test("formatNumber", async () => {
  const cases: {
    value: number;
    unit?: string;
    expected: { [lang: string]: string };
  }[] = [
    {
      value: 150000000,
      expected: {
        de: "150\xa0Mio.",
        en: "150M",
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
      expected: {
        de: "800.000",
        en: "800K", // Ideally: 0.8M
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
      expected: {
        de: "2000",
        en: "2K",
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
      expected: {
        de: "0,05",
        en: "0.05",
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
      unit: "$",
      expected: {
        de: "35\xa0Mrd.\xa0USD",
        en: "USD\xa035B",
        es: "35\xa0mil\xa0MUSD",
        fr: "35\xa0Md\xa0USD",
        hi: "USD\xa035\xa0अ॰",
        it: "35\xa0Mrd\xa0USD",
        ja: "USD\xa0350億",
        ko: "USD\xa0350억",
        ru: "35\xa0млрд\xa0USD",
      },
    },
    {
      value: 25000,
      unit: "$",
      expected: {
        de: "25.000\xa0USD",
        en: "USD\xa025K",
        es: "25\xa0mil\xa0USD",
        fr: "25\xa0k\xa0USD",
        hi: "USD\xa025\xa0हज़ार",
        it: "25.000\xa0USD",
        ja: "USD\xa02.5万",
        ko: "USD\xa02.5만",
        ru: "25\xa0тыс.\xa0USD",
      },
    },
    {
      value: 0.25,
      unit: "%",
      expected: {
        de: "0,25 %",
        en: "0.25%",
        es: "0,25\xa0%",
        fr: "0,25 %",
        hi: "0.25%",
        it: "0,25%",
        ja: "0.25%",
        ko: "0.25%",
        ru: "0,25 %",
      },
    },
    {
      value: 30,
      unit: "%",
      expected: {
        de: "30 %",
        en: "30%",
        es: "30\xa0%",
        fr: "30 %",
        hi: "30%",
        it: "30%",
        ja: "30%",
        ko: "30%",
        ru: "30 %",
      },
    },
    {
      value: 20,
      unit: "t",
      expected: {
        de: "20 t",
        en: "20 t",
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
      unit: "kWh",
      expected: {
        de: "0,05 kWh",
        en: "0.05 kWh",
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
      unit: "g",
      expected: {
        de: "130\xa0Mio. g",
        en: "130M g",
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
      unit: "kg",
      expected: {
        de: "1,2\xa0Mrd. kg",
        en: "1.2B kg",
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
      unit: "L",
      expected: {
        de: "-0,5 l",
        en: "-0.5 L",
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

  for (const locale of ["de", "en", "es", "fr", "hi", "it", "ja", "ko", "ru"]) {
    await loadLocaleData(locale, [
      import(`../i18n/compiled-lang/${locale}/units.json`),
    ]);
    for (const c of cases) {
      const text = formatNumber(c.value, c.unit);
      try {
        expect(text).toEqual(c.expected[locale]);
      } catch (e) {
        console.log(
          `Failed for ${c.value}, ${locale}: return value = ${hexEncode(text)}`
        );
        throw e;
      }
    }
  }
});

test("translateUnit", async () => {
  const cases: {
    unit: string;
    expected: { [lang: string]: string };
  }[] = [
    {
      unit: "$",
      expected: {
        de: "USD",
        en: "USD",
        es: "USD",
        fr: "USD",
        hi: "USD",
        it: "USD",
        ja: "USD",
        ko: "USD",
        ru: "USD",
      },
    },
    {
      unit: "%",
      expected: {
        de: "%",
        en: "%",
        es: "%",
        fr: "%",
        hi: "%",
        it: "%",
        ja: "%",
        ko: "%",
        ru: "%",
      },
    },
    {
      unit: "t",
      expected: {
        de: "Tonnen",
        en: "Metric tons",
        es: "Toneladas",
        fr: "Tonnes",
        hi: "मीट्रिक टन",
        it: "Tonnellate metriche",
        ja: "トン",
        ko: "메트릭 톤",
        ru: "Тонны",
      },
    },
    {
      unit: "kWh",
      expected: {
        de: "Kilowattstunden",
        en: "Kilowatt-hours",
        es: "Kilovatios-hora",
        fr: "Kilowattheures",
        hi: "किलोवॉट घंटे",
        it: "Chilowattora",
        ja: "キロワット時",
        ko: "킬로와트시",
        ru: "Киловатт-часы",
      },
    },
    {
      unit: "g",
      expected: {
        de: "Gramm",
        en: "Grams",
        es: "Gramos",
        fr: "Grammes",
        hi: "ग्राम",
        it: "Grammi",
        ja: "グラム",
        ko: "그램",
        ru: "Граммы",
      },
    },
    {
      unit: "kg",
      expected: {
        de: "Kilogramm",
        en: "Kilograms",
        es: "Kilogramos",
        fr: "Kilogrammes",
        hi: "किलोग्राम",
        it: "Chilogrammi",
        ja: "キログラム",
        ko: "킬로그램",
        ru: "Килограммы",
      },
    },
    {
      unit: "L",
      expected: {
        de: "Liter",
        en: "Liters",
        es: "Litros",
        fr: "Litres",
        hi: "लीटर",
        it: "Litri",
        ja: "リットル",
        ko: "리터",
        ru: "Литры",
      },
    },
    {
      unit: "foo",
      expected: {
        de: "foo",
        en: "foo",
        es: "foo",
        fr: "foo",
        hi: "foo",
        it: "foo",
        ja: "foo",
        ko: "foo",
        ru: "foo",
      },
    },
  ];

  for (const locale of ["de", "en", "es", "fr", "hi", "it", "ja", "ko", "ru"]) {
    await loadLocaleData(locale, [
      import(`../i18n/compiled-lang/${locale}/units.json`),
    ]);
    for (const c of cases) {
      const text = translateUnit(c.unit);
      try {
        expect(text).toEqual(c.expected[locale]);
      } catch (e) {
        console.log(`Failed for ${c.unit}, ${locale}: return value = ${text}`);
        throw e;
      }
    }
  }
});

test("formatDate", async () => {
  const cases: {
    date: string;
    expected: { [lang: string]: string };
  }[] = [
    {
      date: "2024",
      expected: {
        en: "2024",
        de: "2024",
      },
    },
    {
      date: "2024-11",
      expected: {
        en: "Nov 2024",
        de: "Nov. 2024",
      },
    },
    {
      date: "2024-11-01",
      expected: {
        en: "Nov 1, 2024",
        de: "1. Nov. 2024",
      },
    },
  ];

  for (const locale of ["en", "de"]) {
    for (const c of cases) {
      const text = formatDate(c.date, locale);
      expect(text).toEqual(c.expected[locale]);
    }
  }
});
