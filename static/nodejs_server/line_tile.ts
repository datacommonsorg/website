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
 * Functions for getting results for the line tile
 */

import {
  draw,
  fetchData,
  getReplacementStrings,
  LineChartData,
  LineTilePropType,
} from "../js/components/tiles/line_tile";
import { NamedTypedPlace, StatVarSpec } from "../js/shared/types";
import { TileConfig } from "../js/types/subject_page_proto_types";
import { dataGroupsToCsv } from "../js/utils/chart_csv_utils";
import { getChartTitle } from "../js/utils/tile_utils";
import { CHART_ID, DOM_ID, SVG_HEIGHT, SVG_WIDTH } from "./constants";
import { TileResult } from "./types";
import { getChartUrl, getProcessedSvg, getSources, getSvgXml } from "./utils";

function getTileProp(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): LineTilePropType {
  return {
    apiRoot,
    id,
    place,
    statVarSpec,
    svgChartHeight: SVG_HEIGHT,
    svgChartWidth: SVG_WIDTH,
    title: tileConfig.title,
  };
}

function getLineChartSvg(
  tileProp: LineTilePropType,
  chartData: LineChartData
): SVGSVGElement {
  const tileContainer = document.createElement("div");
  tileContainer.setAttribute("id", CHART_ID);
  document.getElementById(DOM_ID).appendChild(tileContainer);
  draw(tileProp, chartData, tileContainer);
  return getProcessedSvg(tileContainer.querySelector("svg"));
}

/**
 * Gets the Tile Result for a line tile
 * @param id id of the chart
 * @param tileConfig config for the tile
 * @param place place to show the tile for
 * @param statVarSpec list of stat var specs to show in the tile
 * @param apiRoot API root to use to fetch data
 */
export async function getLineTileResult(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  statVarSpec: StatVarSpec[],
  apiRoot: string,
  urlRoot: string,
  useChartUrl: boolean
): Promise<TileResult> {
  const tileProp = getTileProp(id, tileConfig, place, statVarSpec, apiRoot);
  try {
    const chartData = await fetchData(tileProp);
    const result: TileResult = {
      data_csv: dataGroupsToCsv(chartData.dataGroup),
      srcs: getSources(chartData.sources),
      legend: chartData.dataGroup.map((dg) => dg.label || "A"),
      title: getChartTitle(tileConfig.title, getReplacementStrings(tileProp)),
      type: "LINE",
    };
    if (useChartUrl) {
      result.chartUrl = getChartUrl(
        tileConfig,
        place.dcid,
        statVarSpec,
        "",
        null,
        urlRoot
      );
    } else {
      const svg = getLineChartSvg(tileProp, chartData);
      result.svg = getSvgXml(svg);
    }
    return result;
  } catch (e) {
    console.log("Failed to get line tile result for: " + id);
    return null;
  }
}

/**
 * Gets the line chart for a given tile config
 * @param tileConfig the tile config for the line chart
 * @param place the place to get the line chart for
 * @param statVarSpec list of stat var specs to show in the chart
 * @param apiRoot API root to use to fetch data
 */
export async function getLineChart(
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): Promise<SVGSVGElement> {
  const tileProp = getTileProp(
    CHART_ID,
    tileConfig,
    place,
    statVarSpec,
    apiRoot
  );
  try {
    const chartData = await fetchData(tileProp);
    return getLineChartSvg(tileProp, chartData);
  } catch (e) {
    console.log("Failed to get line chart");
    return null;
  }
}
