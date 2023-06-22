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

/**
 * Functions for getting tile result for a ranking tile
 */

import _ from "lodash";
import { fetchData } from "../js/components/tiles/ranking_tile";
import { NamedTypedPlace, StatVarSpec } from "../js/shared/types";
import { TileConfig } from "../js/types/subject_page_proto_types";
import { rankingPointsToCsv } from "../js/utils/chart_csv_utils";
import { FONT_FAMILY, FONT_SIZE, SVG_HEIGHT, SVG_WIDTH } from "./constants";
import { TileResult } from "./types";
import { getProcessedSvg, getSources } from "./utils";
import { RankingGroup } from "../js/types/ranking_unit_types";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { getRankingUnit, getRankingUnitTitle } from "../js/components/tiles/sv_ranking_units";
import { htmlToSvg } from "../js/utils/svg_utils";

/**
 * Get the result for a single ranking unit
 */
function getRankingUnitResult(
  tileConfig: TileConfig,
  rankingGroup: RankingGroup,
  sv: string,
  isHighest: boolean
): TileResult {
  const rankingHtml = ReactDOMServer.renderToString(
    getRankingUnit(
      tileConfig.title,
      sv,
      rankingGroup,
      tileConfig.rankingTileSpec,
      isHighest
    )
  );
  const style = {
    "font-family": FONT_FAMILY,
    "font-size": FONT_SIZE,
  };
  const svg = htmlToSvg(rankingHtml, SVG_WIDTH, SVG_HEIGHT, "", style);
  const processedSvg = getProcessedSvg(svg);
  return {
    svg: processedSvg,
    data_csv: rankingPointsToCsv(rankingGroup.points, rankingGroup.svName),
    srcs: getSources(rankingGroup.sources),
    title: getRankingUnitTitle(
      tileConfig.title,
      tileConfig.rankingTileSpec,
      rankingGroup,
      false,
      sv
    ),
    type: "TABLE",
  };
}

/**
 * Gets the Tile Result for a ranking tile
 * @param id id of the chart
 * @param tileConfig config for the tile
 * @param place place to show the tile for
 * @param enclosedPlaceType enclosed place type to use in the tile
 * @param statVarSpec list of stat var specs to show in the tile
 * @param apiRoot API root to use to fetch data
 */
export async function getRankingTileResult(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): Promise<TileResult[]> {
  const tileProp = {
    id,
    title: tileConfig.title,
    place,
    enclosedPlaceType,
    statVarSpec,
    rankingMetadata: tileConfig.rankingTileSpec,
    apiRoot,
  };
  try {
    const rankingData = await fetchData(tileProp);
    const tileResults: TileResult[] = [];
    for (const sv of Object.keys(rankingData)) {
      const rankingGroup = rankingData[sv];
      if (tileConfig.rankingTileSpec.showHighest) {
        tileResults.push(
          getRankingUnitResult(tileConfig, rankingGroup, sv, true)
        );
      }
      if (tileConfig.rankingTileSpec.showLowest) {
        tileResults.push(
          getRankingUnitResult(tileConfig, rankingGroup, sv, false)
        );
      }
    }
    return tileResults;
  } catch (e) {
    console.log("Failed to get ranking tile result for: " + id);
    return null;
  }
}