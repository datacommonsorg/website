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

import _ from "lodash";

import {
  draw,
  fetchData,
  getReplacementStrings,
  LineChartData,
  LineTilePropType,
} from "../../js/components/tiles/line_tile";
import { NamedTypedPlace, StatVarSpec } from "../../js/shared/types";
import { TileConfig } from "../../js/types/subject_page_proto_types";
import { dataGroupsToCsv } from "../../js/utils/chart_csv_utils";
import { getChartTitle, getComparisonPlaces } from "../../js/utils/tile_utils";
import {
  CHART_ID,
  DOM_ID,
  SVG_HEIGHT,
  SVG_WIDTH,
  TOOLFORMER_RAG_MODE,
} from "../constants";
import { TileResult } from "../types";
import { getChartUrl, getProcessedSvg, getSources, getSvgXml } from "./utils";

function getTileProp(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): LineTilePropType {
  const comparisonPlaces = getComparisonPlaces(tileConfig, place);
  return {
    apiRoot,
    id,
    place,
    statVarSpec,
    svgChartHeight: SVG_HEIGHT,
    svgChartWidth: SVG_WIDTH,
    title: tileConfig.title,
    comparisonPlaces,
    startDate: tileConfig.lineTileSpec?.startDate,
    endDate: tileConfig.lineTileSpec?.endDate,
    highlightDate: tileConfig.lineTileSpec?.highlightDate,
  };
}

function getLineChartSvg(
  tileProp: LineTilePropType,
  chartData: LineChartData,
  chartTitle: string
): SVGSVGElement {
  const tileContainer = document.createElement("div");
  tileContainer.setAttribute("id", CHART_ID);
  document.getElementById(DOM_ID).appendChild(tileContainer);
  draw(tileProp, chartData, tileContainer, true, chartTitle);
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
  useChartUrl: boolean,
  apikey?: string,
  mode?: string
): Promise<TileResult> {
  const tileProp = getTileProp(id, tileConfig, place, statVarSpec, apiRoot);
  try {
    const chartData = await fetchData(tileProp);
    const chartTitle = getChartTitle(
      tileConfig.title,
      getReplacementStrings(tileProp, chartData)
    );
    const csvLabelHeader = mode === TOOLFORMER_RAG_MODE ? "date" : undefined;
    const result: TileResult = {
      dataCsv: dataGroupsToCsv(chartData.dataGroup, csvLabelHeader),
      legend: chartData.dataGroup.map((dg) => dg.label || "A"),
      places: tileProp.comparisonPlaces || [place.dcid],
      srcs: getSources(chartData.sources),
      title: chartTitle,
      type: "LINE",
      unit: chartData.unit,
      vars: statVarSpec.map((spec) => spec.statVar),
    };
    // If it is a single line chart, add highlight information.
    if (chartData.dataGroup && chartData.dataGroup.length === 1) {
      const dataPoints = _.cloneDeep(chartData.dataGroup[0].value);
      const highlightDate = statVarSpec[0].date;
      let highlightPoint = null;
      if (!_.isEmpty(dataPoints) && highlightDate) {
        // TODO: consider handling incompatible date granularity. e.g., if one
        // date is monthly and the other is yearly but they have the same year.
        highlightPoint = dataPoints.find(
          (point) => point.label === highlightDate
        );
        // If there is a date specified, but the date is not in the list of
        // datapoints, skip returning the result for this chart
        if (!highlightPoint) {
          console.log(
            `Skipping line tile result for ${id} because missing specified date.`
          );
          return null;
        }
      } else if (!_.isEmpty(dataPoints)) {
        dataPoints.sort((a, b) => {
          const fieldToCompare =
            a.time && b.time ? "time" : a.date && b.date ? "date" : "label";
          return a[fieldToCompare] > b[fieldToCompare] ? -1 : 1;
        });
        highlightPoint = dataPoints[0];
      }
      if (highlightPoint) {
        result.highlight = {
          date: highlightPoint.label,
          value: highlightPoint.value,
        };
      }
    }
    if (useChartUrl) {
      result.chartUrl = getChartUrl(
        tileConfig,
        place.dcid,
        statVarSpec,
        "",
        null,
        urlRoot,
        apikey
      );
      return result;
    }
    const svg = getLineChartSvg(tileProp, chartData, chartTitle);
    result.svg = getSvgXml(svg);
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
    const chartTitle = getChartTitle(
      tileConfig.title,
      getReplacementStrings(tileProp, chartData)
    );
    return getLineChartSvg(tileProp, chartData, chartTitle);
  } catch (e) {
    console.log("Failed to get line chart");
    return null;
  }
}
