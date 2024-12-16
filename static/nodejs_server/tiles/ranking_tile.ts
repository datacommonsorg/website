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
import ReactDOMServer from "react-dom/server";

import { getPointsList } from "../../js/components/ranking_unit";
import {
  fetchData,
  RankingTilePropType,
} from "../../js/components/tiles/ranking_tile";
import {
  getRankingUnit,
  getRankingUnitPoints,
  getRankingUnitTitle,
} from "../../js/components/tiles/sv_ranking_units";
import { StatVarSpec } from "../../js/shared/types";
import { RankingGroup } from "../../js/types/ranking_unit_types";
import { TileConfig } from "../../js/types/subject_page_proto_types";
import { rankingPointsToCsv } from "../../js/utils/chart_csv_utils";
import { getPlaceNames } from "../../js/utils/place_utils";
import { htmlToSvg } from "../../js/utils/svg_utils";
import {
  CHART_ID,
  FONT_FAMILY,
  FONT_SIZE,
  SVG_HEIGHT,
  SVG_WIDTH,
} from "../constants";
import { TileResult } from "../types";
import { getProcessedSvg, getSources } from "./utils";

function getTileProp(
  id: string,
  tileConfig: TileConfig,
  place: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): RankingTilePropType {
  return {
    id,
    title: tileConfig.title,
    parentPlace: place,
    enclosedPlaceType,
    variables: statVarSpec,
    rankingMetadata: tileConfig.rankingTileSpec,
    apiRoot,
  };
}

function getRankingChartSvg(
  rankingGroup: RankingGroup,
  sv: string,
  enclosedPlaceType: string,
  tileConfig: TileConfig,
  apiRoot: string,
  statVarSpecs: StatVarSpec[],
  containerRef: React.RefObject<HTMLElement>
): SVGSVGElement {
  const rankingHtml = ReactDOMServer.renderToString(
    getRankingUnit(
      tileConfig.title,
      sv,
      enclosedPlaceType,
      rankingGroup,
      tileConfig.rankingTileSpec,
      tileConfig.rankingTileSpec.showHighest,
      apiRoot,
      statVarSpecs,
      containerRef
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
  place: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[]
): TileResult {
  const { topPoints, bottomPoints } = getRankingUnitPoints(
    tileConfig?.rankingTileSpec,
    isHighest,
    rankingGroup
  );
  const pointsList = getPointsList(
    topPoints,
    bottomPoints,
    isHighest,
    rankingGroup.numDataPoints
  );
  const result: TileResult = {
    dataCsv: rankingPointsToCsv(pointsList.flat(), rankingGroup.svName),
    placeType: enclosedPlaceType,
    places: [place],
    srcs: getSources(rankingGroup.sources),
    title: getRankingUnitTitle(
      tileConfig.title,
      tileConfig.rankingTileSpec,
      rankingGroup,
      false,
      sv
    ),
    type: "TABLE",
    unit:
      !_.isEmpty(rankingGroup.unit) && rankingGroup.unit.length == 1
        ? rankingGroup.unit[0]
        : "",
    vars: statVarSpec.map((spec) => spec.statVar),
  };
  // Currently cannot draw ranking table in nodejs
  /*
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
      place,
      urlSvSpec,
      enclosedPlaceType,
      null,
      urlRoot,
      apikey
    );
    return result;
  }
  const svg = getRankingChartSvg(
    rankingGroup,
    sv,
    enclosedPlaceType,
    tileConfig,
    apiRoot
  );
  result.svg = getSvgXml(svg);*/
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
  place: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string,
  urlRoot: string,
  useChartUrl: boolean,
  apikey?: string
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
    const placeDcids = new Set<string>();
    Object.values(rankingData).forEach((rankingGroup) => {
      rankingGroup.points.forEach((point) => {
        placeDcids.add(point.placeDcid);
      });
    });
    const placeNames = await getPlaceNames(Array.from(placeDcids).sort(), {
      apiRoot,
    });
    const tileResults: TileResult[] = [];
    for (const sv of Object.keys(rankingData)) {
      const rankingGroup = _.cloneDeep(rankingData[sv]);
      rankingGroup.points.forEach(
        (point) => (point.placeName = placeNames[point.placeDcid])
      );
      if (
        tileConfig.rankingTileSpec.showHighestLowest ||
        tileConfig.rankingTileSpec.showHighest
      ) {
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
            useChartUrl,
            apiRoot,
            apikey
          )
        );
      }
      // If showHighestLowest in a single ranking unit, should not also show
      // lowest ranking unit.
      if (tileConfig.rankingTileSpec.showHighestLowest) {
        continue;
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
            useChartUrl,
            apiRoot
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
  place: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string,
  containerRef: React.RefObject<HTMLElement>
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
      return getRankingChartSvg(
        rankingGroup,
        sv,
        enclosedPlaceType,
        tileConfig,
        apiRoot,
        statVarSpec,
        containerRef
      );
    }
  } catch (e) {
    console.log("Failed to get ranking chart");
    return null;
  }
}
