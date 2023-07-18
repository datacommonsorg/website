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
 * Functions for getting results for a ranking tile
 */

import _ from "lodash";
import React from "react";
import ReactDOMServer from "react-dom/server";

import {
  fetchData,
  RankingTilePropType,
} from "../js/components/tiles/ranking_tile";
import {
  getRankingUnit,
  getRankingUnitTitle,
} from "../js/components/tiles/sv_ranking_units";
import { NamedTypedPlace, StatVarSpec } from "../js/shared/types";
import { RankingGroup } from "../js/types/ranking_unit_types";
import { TileConfig } from "../js/types/subject_page_proto_types";
import { rankingPointsToCsv } from "../js/utils/chart_csv_utils";
import { htmlToSvg } from "../js/utils/svg_utils";
import {
  CHART_ID,
  FONT_FAMILY,
  FONT_SIZE,
  SVG_HEIGHT,
  SVG_WIDTH,
} from "./constants";
import { TileResult } from "./types";
import { getChartUrl, getProcessedSvg, getSources, getSvgXml } from "./utils";

function getTileProp(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): RankingTilePropType {
  return {
    id,
    title: tileConfig.title,
    place,
    enclosedPlaceType,
    statVarSpec,
    rankingMetadata: tileConfig.rankingTileSpec,
    apiRoot,
  };
}

function getRankingChartSvg(
  rankingGroup: RankingGroup,
  sv: string,
  tileConfig: TileConfig
): SVGSVGElement {
  const rankingHtml = ReactDOMServer.renderToString(
    getRankingUnit(
      tileConfig.title,
      sv,
      rankingGroup,
      tileConfig.rankingTileSpec,
      tileConfig.rankingTileSpec.showHighest
    )
  );
  const style = {
    "font-family": FONT_FAMILY,
    "font-size": FONT_SIZE,
  };
  const svg = htmlToSvg(rankingHtml, SVG_WIDTH, SVG_HEIGHT, "", style);
  svg.querySelector("table").style.fontFamily = FONT_FAMILY;
  svg.querySelector("table").style.fontSize = FONT_SIZE;
  return getProcessedSvg(svg);
}

/**
 * Get the result for a single ranking unit
 */
function getRankingUnitResult(
  tileConfig: TileConfig,
  rankingGroup: RankingGroup,
  sv: string,
  isHighest: boolean,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  urlRoot: string,
  useChartUrl: boolean
): TileResult {
  const result: TileResult = {
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

  if (useChartUrl) {
    // Get a tile config to pass in the chart url so that only one ranking unit
    // will be created. i.e., only one of highest or lowest.
    const urlTileConfig = _.cloneDeep(tileConfig);
    urlTileConfig.rankingTileSpec = {
      ...tileConfig.rankingTileSpec,
      showHighest: isHighest,
      showLowest: !isHighest,
    };
    // Get a list of stat var specs so that only one ranking unit will be created.
    // i.e., If the tile is a multi-column tile, use the entire list of stat var
    // specs, otherwise, only use the spec for the current stat var.
    const urlSvSpec = tileConfig.rankingTileSpec.showMultiColumn
      ? statVarSpec
      : statVarSpec.filter((spec) => spec.statVar === sv);
    result.chartUrl = getChartUrl(
      urlTileConfig,
      place.dcid,
      urlSvSpec,
      enclosedPlaceType,
      null,
      urlRoot
    );
    return result;
  }
  const svg = getRankingChartSvg(rankingGroup, sv, tileConfig);
  result.svg = getSvgXml(svg);
  return result;
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
  apiRoot: string,
  urlRoot: string,
  useChartUrl: boolean
): Promise<TileResult[]> {
  const tileProp = getTileProp(
    id,
    tileConfig,
    place,
    enclosedPlaceType,
    statVarSpec,
    apiRoot
  );
  try {
    const rankingData = await fetchData(tileProp);
    const tileResults: TileResult[] = [];
    for (const sv of Object.keys(rankingData)) {
      const rankingGroup = rankingData[sv];
      if (tileConfig.rankingTileSpec.showHighest) {
        tileResults.push(
          getRankingUnitResult(
            tileConfig,
            rankingGroup,
            sv,
            true,
            place,
            enclosedPlaceType,
            statVarSpec,
            urlRoot,
            useChartUrl
          )
        );
      }
      if (tileConfig.rankingTileSpec.showLowest) {
        tileResults.push(
          getRankingUnitResult(
            tileConfig,
            rankingGroup,
            sv,
            false,
            place,
            enclosedPlaceType,
            statVarSpec,
            urlRoot,
            useChartUrl
          )
        );
      }
    }
    return tileResults;
  } catch (e) {
    console.log("Failed to get ranking tile result for: " + id);
    return null;
  }
}

/**
 * Gets the ranking chart for a given tile config. Assumes that the tile config
 * is only going to create a single ranking unit.
 * @param tileConfig the tile config for the chart
 * @param place the place to get the chart for
 * @param enclosedPlaceType the enclosed place type to get the chart for
 * @param statVarSpec list of stat var specs to show in the chart
 * @param apiRoot API root to use to fetch data
 */
export async function getRankingChart(
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): Promise<SVGSVGElement> {
  const tileProp = getTileProp(
    CHART_ID,
    tileConfig,
    place,
    enclosedPlaceType,
    statVarSpec,
    apiRoot
  );
  try {
    const rankingData = await fetchData(tileProp);
    for (const sv of Object.keys(rankingData)) {
      const rankingGroup = rankingData[sv];
      return getRankingChartSvg(rankingGroup, sv, tileConfig);
    }
  } catch (e) {
    console.log("Failed to get ranking chart");
    return null;
  }
}
