/**
 * Copyright 2026 Google LLC
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

import { CategoryConfig } from "../types/subject_page_proto_types";
import { RankingPagePropType } from "./ranking_page";

/**
 * Build category config for the ranking page.
 */
export function getCategoryConfig(
  props: RankingPagePropType,
  statVarName: string
): CategoryConfig {
  // Build statVarSpec
  const statVarSpec = {};
  statVarSpec[props.statVarDcid] = {
    statVar: props.statVarDcid,
    denom: props.isPerCapita ? "Count_Person" : "",
    unit: props.unit,
    scaling: props.scaling,
    log: false,
    name: statVarName,
    date: props.date,
  };

  return {
    title: "",
    statVarSpec,
    blocks: [
      {
        title: "",
        description: "",
        columns: [
          {
            tiles: [
              {
                type: "RANKING",
                title: "",
                description: "",
                statVarKey: [props.statVarDcid],
                rankingTileSpec: {
                  showHighest: true,
                  showLowest: false,
                  rankingCount: 100, // Start with first 100 entries
                },
              },
            ],
          },
        ],
      },
    ],
  };
}
