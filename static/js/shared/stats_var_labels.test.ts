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

import { STATS_VAR_LABEL } from "./stats_var_labels";
import chartConfig from "../../../server/chart_config.json";

test("stats var label", () => {
  for (const section of chartConfig) {
    for (const chart of section.charts) {
      for (const statsVar of chart.statsVars) {
        expect(STATS_VAR_LABEL[statsVar]).toBeTruthy();
      }
    }
    for (const child of section.children) {
      for (const chart of child.charts) {
        for (const statsVar of chart.statsVars) {
          expect(STATS_VAR_LABEL[statsVar]).toBeTruthy();
        }
      }
    }
  }
});
