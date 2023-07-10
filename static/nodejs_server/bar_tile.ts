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
 * Functions for getting tile result for a bar tile
 */

import _ from "lodash";

import {
  draw,
  fetchData,
  getReplacementStrings,
} from "../js/components/tiles/bar_tile";
import { SELF_PLACE_DCID_PLACEHOLDER } from "../js/constants/subject_page_constants";
import { NamedTypedPlace, StatVarSpec } from "../js/shared/types";
import { TileConfig } from "../js/types/subject_page_proto_types";
import { dataGroupsToCsv } from "../js/utils/chart_csv_utils";
import { getChartTitle } from "../js/utils/tile_utils";
import { DOM_ID, SVG_HEIGHT, SVG_WIDTH } from "./constants";
import { TileResult } from "./types";
import { getProcessedSvg, getSources } from "./utils";

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
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  apiRoot: string
): Promise<TileResult> {
  const comparisonPlaces = tileConfig.comparisonPlaces
    ? tileConfig.comparisonPlaces.map((p) =>
        p == SELF_PLACE_DCID_PLACEHOLDER ? place.dcid : p
      )
    : undefined;
  const useLollipop =
    tileConfig.barTileSpec && tileConfig.barTileSpec.useLollipop;
  const tileProp = {
    id,
    title: tileConfig.title,
    place,
    enclosedPlaceType,
    statVarSpec,
    apiRoot,
    svgChartHeight: SVG_HEIGHT,
    comparisonPlaces,
    useLollipop,
  };
  try {
    const chartData = await fetchData(tileProp);
    const tileContainer = document.createElement("div");
    tileContainer.setAttribute("id", id);
    document.getElementById(DOM_ID).appendChild(tileContainer);
    draw(tileProp, chartData, tileContainer, SVG_WIDTH);
    let legend = [];
    if (
      !_.isEmpty(chartData.dataGroup) &&
      !_.isEmpty(chartData.dataGroup[0].value)
    ) {
      legend = chartData.dataGroup[0].value.map((dp) => dp.label);
    }
    const svg = getProcessedSvg(tileContainer.querySelector("svg"));
    tileContainer.remove();
    return {
      svg,
      data_csv: dataGroupsToCsv(chartData.dataGroup),
      srcs: getSources(chartData.sources),
      legend,
      title: getChartTitle(
        tileConfig.title,
        getReplacementStrings(tileProp, chartData)
      ),
      type: "BAR",
    };
  } catch (e) {
    console.log("Failed to get bar tile result for: " + id);
    return null;
  }
}
