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
 * Functions for getting results for the scatter tile
 */

// This import is unused in this file, but needed for draw functions
import * as Canvas from "canvas";

import {
  draw,
  fetchData,
  getReplacementStrings,
  ScatterTilePropType,
} from "../../js/components/tiles/scatter_tile";
import { NamedTypedPlace, StatVarSpec } from "../../js/shared/types";
import { TileConfig } from "../../js/types/subject_page_proto_types";
import { scatterDataToCsv } from "../../js/utils/chart_csv_utils";
import { getChartTitle } from "../../js/utils/tile_utils";
import { CHART_ID, SVG_HEIGHT, SVG_WIDTH } from "../constants";
import { TileResult } from "../types";
import { getChartUrl, getProcessedSvg, getSources, getSvgXml } from "./utils";

function getTileProp(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): ScatterTilePropType {
  return {
    id,
    title: tileConfig.title,
    place,
    enclosedPlaceType,
    statVarSpec,
    svgChartHeight: SVG_HEIGHT,
    scatterTileSpec: tileConfig.scatterTileSpec,
    apiRoot,
  };
}

/**
 * Gets the Tile Result for a scatter tile
 * @param id id of the chart
 * @param tileConfig config for the tile
 * @param place place to show the tile for
 * @param enclosedPlaceType enclosed place type to use in the tile
 * @param statVarSpec list of stat var specs to show in the tile
 * @param apiRoot API root to use to fetch data
 */
export async function getScatterTileResult(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string,
  urlRoot: string,
  useChartUrl: boolean,
  apikey?: string
): Promise<TileResult> {
  const tileProp = getTileProp(
    id,
    tileConfig,
    place,
    enclosedPlaceType,
    statVarSpec,
    apiRoot
  );

  try {
    const chartData = await fetchData(tileProp);
    const chartTitle = getChartTitle(
      tileConfig.title,
      getReplacementStrings(tileProp, chartData)
    );
    const result: TileResult = {
      dataCsv: scatterDataToCsv(
        chartData.xStatVar.statVar,
        chartData.xStatVar.denom,
        chartData.yStatVar.statVar,
        chartData.yStatVar.denom,
        chartData.points
      ),
      placeType: enclosedPlaceType,
      places: [place.dcid],
      srcs: getSources(chartData.sources),
      title: chartTitle,
      type: "SCATTER",
      vars: statVarSpec.map((spec) => spec.statVar),
    };
    if (useChartUrl) {
      result.chartUrl = getChartUrl(
        tileConfig,
        place.dcid,
        statVarSpec,
        enclosedPlaceType,
        null,
        urlRoot,
        apikey
      );
      return result;
    }
    const svgContainer = document.createElement("div");
    draw(
      chartData,
      svgContainer,
      SVG_HEIGHT,
      null /* tooltipHtml */,
      tileConfig.scatterTileSpec,
      SVG_WIDTH,
      chartTitle
    );
    const svg = getProcessedSvg(svgContainer.querySelector("svg"));
    result.svg = getSvgXml(svg);
    return result;
  } catch (e) {
    console.log("Failed to get scatter tile result for: " + id);
    return null;
  }
}

/**
 * Gets the scatter chart for a given tile config
 * @param tileConfig the tile config for the chart
 * @param place the place to get the chart for
 * @param enclosedPlaceType the enclosed place type to get the chart for
 * @param statVarSpec list of stat var specs to show in the chart
 * @param apiRoot API root to use to fetch data
 */
export async function getScatterChart(
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
    const chartData = await fetchData(tileProp);
    const chartTitle = getChartTitle(
      tileConfig.title,
      getReplacementStrings(tileProp, chartData)
    );
    const svgContainer = document.createElement("div");
    draw(
      chartData,
      svgContainer,
      SVG_HEIGHT,
      null /* tooltipHtml */,
      tileConfig.scatterTileSpec,
      SVG_WIDTH,
      chartTitle
    );
    return getProcessedSvg(svgContainer.querySelector("svg"));
  } catch (e) {
    console.log("Failed to get scatter chart.");
    return null;
  }
}
