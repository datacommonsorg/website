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
 * Functions for getting tile result for a map tile
 */

// This import is unused in this file, but needed for draw functions
import * as Canvas from "canvas";
import _ from "lodash";

import { LEGEND_MARGIN_VERTICAL } from "../dist/js/chart/draw_map_utils";
import {
  draw,
  fetchData,
  getReplacementStrings,
} from "../js/components/tiles/map_tile";
import { NamedTypedPlace, StatVarSpec } from "../js/shared/types";
import { TileConfig } from "../js/types/subject_page_proto_types";
import { mapDataToCsv } from "../js/utils/chart_csv_utils";
import { getChartTitle } from "../js/utils/tile_utils";
import { MAP_LEGEND_CONSTANT_WIDTH, SVG_HEIGHT, SVG_WIDTH } from "./constants";
import { TileResult } from "./types";
import { getProcessedSvg, getSources } from "./utils";

/**
 * Gets the Tile Result for a map tile
 * @param id id of the chart
 * @param tileConfig config for the tile
 * @param place place to show the tile for
 * @param enclosedPlaceType enclosed place type to use in the tile
 * @param statVarSpec stat var spec to show in the tile
 * @param apiRoot API root to use to fetch data
 */
export async function getMapTileResult(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec,
  apiRoot: string
): Promise<TileResult[]> {
  const tileProp = {
    id,
    title: tileConfig.title,
    place,
    enclosedPlaceType,
    statVarSpec,
    svgChartHeight: SVG_HEIGHT - LEGEND_MARGIN_VERTICAL * 2,
    apiRoot,
  };
  try {
    const chartData = await fetchData(tileProp);
    const legendContainer = document.createElement("div");
    const mapContainer = document.createElement("div");
    draw(chartData, tileProp, null, legendContainer, mapContainer, SVG_WIDTH);
    // Get the width of the text in the legend
    let legendTextWidth = 0;
    Array.from(legendContainer.querySelectorAll("text")).forEach((node) => {
      legendTextWidth = Math.max(node.getBBox().width, legendTextWidth);
    });
    const legendWidth = legendTextWidth + MAP_LEGEND_CONSTANT_WIDTH;
    // Create a single merged svg to hold both the map and the legend svgs
    const mergedSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    mergedSvg.setAttribute("height", String(SVG_HEIGHT));
    mergedSvg.setAttribute("width", String(SVG_WIDTH));
    // Get the map svg and add it to the merged svg
    const mapSvg = mapContainer.querySelector("svg");
    const mapWidth = SVG_WIDTH - legendWidth;
    mapSvg.setAttribute("width", String(mapWidth));
    const mapG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mapG.appendChild(mapSvg);
    mergedSvg.appendChild(mapG);
    // Get the legend svg and add it to the merged svg
    const legendSvg = legendContainer.querySelector("svg");
    legendSvg.setAttribute("width", String(legendWidth));
    const legendG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    legendG.setAttribute("transform", `translate(${mapWidth})`);
    legendG.appendChild(legendSvg);
    mergedSvg.appendChild(legendG);

    return [
      {
        svg: getProcessedSvg(mergedSvg),
        data_csv: mapDataToCsv(chartData.geoJson, chartData.dataValues),
        srcs: getSources(chartData.sources),
        title: getChartTitle(
          tileConfig.title,
          getReplacementStrings(tileProp, chartData)
        ),
        type: "MAP",
      },
    ];
  } catch (e) {
    console.log("Failed to get map tile result for: " + id);
    return null;
  }
}
