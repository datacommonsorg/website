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
 * Functions for getting tile result for a line tile
 */

import {
  draw,
  fetchData,
  getReplacementStrings,
} from "../js/components/tiles/line_tile";
import { NamedTypedPlace, StatVarSpec } from "../js/shared/types";
import { TileConfig } from "../js/types/subject_page_proto_types";
import { dataGroupsToCsv } from "../js/utils/chart_csv_utils";
import { getChartTitle } from "../js/utils/tile_utils";
import { DOM_ID, SVG_HEIGHT, SVG_WIDTH } from "./constants";
import { TileResult } from "./types";
import { getProcessedSvg, getSources } from "./utils";

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
  apiRoot: string
): Promise<TileResult> {
  const tileProp = {
    apiRoot,
    id,
    place,
    statVarSpec,
    svgChartHeight: SVG_HEIGHT,
    svgChartWidth: SVG_WIDTH,
    title: tileConfig.title,
  };
  try {
    const chartData = await fetchData(tileProp);
    const tileContainer = document.createElement("div");
    tileContainer.setAttribute("id", id);
    document.getElementById(DOM_ID).appendChild(tileContainer);
    draw(tileProp, chartData, tileContainer);
    const svg = getProcessedSvg(tileContainer.querySelector("svg"));
    tileContainer.remove();
    return {
      svg,
      data_csv: dataGroupsToCsv(chartData.dataGroup),
      srcs: getSources(chartData.sources),
      legend: chartData.dataGroup.map((dg) => dg.label || "A"),
      title: getChartTitle(tileConfig.title, getReplacementStrings(tileProp)),
      type: "LINE",
    };
  } catch (e) {
    console.log("Failed to get line tile result for: " + id);
    return null;
  }
}
