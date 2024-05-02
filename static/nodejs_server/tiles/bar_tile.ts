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
 * Functions for getting results for a bar tile
 */

import _ from "lodash";

import {
  BarChartData,
  BarTilePropType,
  draw,
  fetchData,
  getReplacementStrings,
} from "../../js/components/tiles/bar_tile";
import { StatVarSpec } from "../../js/shared/types";
import { TileConfig } from "../../js/types/subject_page_proto_types";
import { dataGroupsToCsv } from "../../js/utils/chart_csv_utils";
import { getChartTitle } from "../../js/utils/tile_utils";
import { CHART_ID, DOM_ID, SVG_HEIGHT, SVG_WIDTH } from "../constants";
import { TileResult } from "../types";
import { getChartUrl, getProcessedSvg, getSources, getSvgXml } from "./utils";

function getPlaces(tileConfig: TileConfig, place: string): string[] {
  return tileConfig.comparisonPlaces || [place];
}

function getTileProp(
  id: string,
  tileConfig: TileConfig,
  place: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): BarTilePropType {
  const barTileSpec = tileConfig.barTileSpec || {};
  return {
    apiRoot,
    id,
    enclosedPlaceType,
    horizontal: barTileSpec.horizontal || false,
    places: getPlaces(tileConfig, place),
    stacked: barTileSpec.stacked || false,
    svgChartHeight: SVG_HEIGHT,
    title: tileConfig.title,
    useLollipop: barTileSpec.useLollipop || false,
    variables: statVarSpec,
  };
}

function getBarChartSvg(
  tileProp: BarTilePropType,
  chartData: BarChartData,
  chartTitle: string
): SVGSVGElement {
  const tileContainer = document.createElement("div");
  tileContainer.setAttribute("id", tileProp.id);
  document.getElementById(DOM_ID).appendChild(tileContainer);
  draw(tileProp, chartData, tileContainer, SVG_WIDTH, true, chartTitle);
  const chartSvg = tileContainer.querySelector("svg");
  // viewBox attribute throws off sizing in node server
  chartSvg.removeAttribute("viewBox");
  return getProcessedSvg(tileContainer.querySelector("svg"));
}

/**
 * Gets the Tile Result for a bar tile
 * @param id id of the chart
 * @param tileConfig config for the bar tile
 * @param place place to show the bar chart for
 * @param enclosedPlaceType enclosed place type to use for bar chart
 * @param statVarSpec list of stat var specs to show in the bar chart
 * @param apiRoot API root to use to fetch data
 */
export async function getBarTileResult(
  id: string,
  tileConfig: TileConfig,
  place: string,
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
      getReplacementStrings(chartData)
    );
    let legend = [];
    if (
      !_.isEmpty(chartData.dataGroup) &&
      !_.isEmpty(chartData.dataGroup[0].value)
    ) {
      legend = chartData.dataGroup[0].value.map((dp) => dp.label);
    }
    const result: TileResult = {
      data_csv: dataGroupsToCsv(chartData.dataGroup),
      placeType: enclosedPlaceType,
      places: getPlaces(tileConfig, place),
      srcs: getSources(chartData.sources),
      legend,
      title: chartTitle,
      type: "BAR",
      unit: chartData.unit,
      vars: statVarSpec.map((spec) => spec.statVar),
    };
    if (useChartUrl) {
      result.chartUrl = getChartUrl(
        tileConfig,
        place,
        statVarSpec,
        enclosedPlaceType,
        null,
        urlRoot,
        apikey
      );
      return result;
    }
    const svg = getBarChartSvg(tileProp, chartData, chartTitle);
    result.svg = getSvgXml(svg);
    return result;
  } catch (e) {
    console.log("Failed to get bar tile result for: " + id);
    return null;
  }
}

/**
 * Gets the bar chart for a given tile config
 * @param tileConfig the tile config for the chart
 * @param place the place to get the chart for
 * @param enclosedPlaceType the enclosed place type to get the chart for
 * @param statVarSpec list of stat var specs to show in the chart
 * @param apiRoot API root to use to fetch data
 */
export async function getBarChart(
  tileConfig: TileConfig,
  place: string,
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
      getReplacementStrings(chartData)
    );
    return getBarChartSvg(tileProp, chartData, chartTitle);
  } catch (e) {
    console.log("Failed to get bar chart");
    return null;
  }
}
