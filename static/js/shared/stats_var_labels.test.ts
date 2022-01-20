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

import { loadLocaleData } from "../i18n/i18n";
import enLabels from "../i18n/strings/en/stats_var_labels.json";
import { getStatsVarLabel } from "./stats_var_labels";
import { placeExplorerCategories } from "./util";

test("stats var label: marked for translation", async () => {
  for (const file of placeExplorerCategories) {
    const chartConfig = await import(
      `../../../server/config/chart_config/${file}.json`
    );
    const category = chartConfig[0].cateogry;
    for (const chart of chartConfig) {
      expect(chart.category).toBe(category);
      if (!("aggregate" in chart)) {
        for (const statsVar of chart.statsVars) {
          expect(Boolean(enLabels[statsVar])).toBe(true);
        }
      }
    }
  }
});

test("stats var label: compiled to en", async () => {
  await loadLocaleData("en", [
    import("../i18n/compiled-lang/en/stats_var_labels.json"),
  ]);
  for (const file of placeExplorerCategories) {
    const chartConfig = await import(
      `../../../server/config/chart_config/${file}.json`
    );
    for (const chart of chartConfig) {
      if (!("aggregate" in chart)) {
        for (const statsVar of chart.statsVars) {
          const label = getStatsVarLabel(statsVar);
          expect(label).not.toEqual(statsVar);
        }
      }
    }
  }
  expect(
    getStatsVarLabel("Count_HousingUnit_HouseholderRaceWhiteAlone")
  ).toEqual("White Alone");
});

test("stats var label: compiled to es", async () => {
  loadLocaleData("es", [
    import("../i18n/compiled-lang/es/stats_var_labels.json"),
    import("../i18n/compiled-lang/en/stats_var_labels.json"),
  ]);
  for (const file of placeExplorerCategories) {
    const chartConfig = await import(
      `../../../server/config/chart_config/${file}.json`
    );
    for (const chart of chartConfig) {
      if (!("aggregate" in chart)) {
        for (const statsVar of chart.statsVars) {
          const label = getStatsVarLabel(statsVar);
          expect(label).not.toEqual(statsVar);
        }
      }
    }
  }
  expect(
    getStatsVarLabel("Count_HousingUnit_HouseholderRaceWhiteAlone")
  ).toEqual("White Alone");
});
