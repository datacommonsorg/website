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
 * Functions for getting results for a disaster map tile
 */

import _ from "lodash";

import { fetchDisasterEventData } from "../js/components/subject_page/disaster_event_block";
import {
  DisasterEventMapTilePropType,
  draw,
  fetchChartData,
  getReplacementStrings,
} from "../js/components/tiles/disaster_event_map_tile";
import { NamedTypedPlace } from "../js/shared/types";
import { DisasterEventPointData } from "../js/types/disaster_event_map_types";
import {
  EventTypeSpec,
  TileConfig,
} from "../js/types/subject_page_proto_types";
import { getChartTitle } from "../js/utils/tile_utils";
import { CHART_ID, SVG_HEIGHT, SVG_WIDTH } from "./constants";
import { TileResult } from "./types";
import { getChartUrl, getProcessedSvg, getSources } from "./utils";

function getTileProp(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  eventTypeSpec: Record<string, EventTypeSpec>,
  eventData: Record<string, DisasterEventPointData>,
  apiRoot: string
): DisasterEventMapTilePropType {
  return {
    id,
    title: tileConfig.title,
    place,
    enclosedPlaceType,
    eventTypeSpec,
    disasterEventData: eventData,
    tileSpec: tileConfig.disasterEventMapTileSpec,
    apiRoot,
  };
}

/**
 * Gets the Tile Result for a disaster map tile
 * @param id id of the chart
 * @param tileConfig config for the tile
 * @param place place to show the tile for
 * @param enclosedPlaceType enclosed place type to use for tile
 * @param eventTypeSpec event type specs to use for tile
 * @param disasterEventDataPromise promise that will return disaster event point data
 * @param apiRoot API root to use to fetch data
 */
export async function getDisasterMapTileResult(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  eventTypeSpec: Record<string, EventTypeSpec>,
  disasterEventDataPromise: Promise<Record<string, DisasterEventPointData>>,
  apiRoot: string,
  urlRoot: string
): Promise<TileResult> {
  let tileEventData = null;
  try {
    const disasterEventData = await disasterEventDataPromise;
    tileEventData = {};
    Object.keys(eventTypeSpec).forEach((specId) => {
      tileEventData[specId] = disasterEventData[specId];
    });
    const tileProp = getTileProp(
      id,
      tileConfig,
      place,
      enclosedPlaceType,
      eventTypeSpec,
      disasterEventData,
      apiRoot
    );
    const chartData = await fetchChartData(tileProp);
    return {
      chartUrl: getChartUrl(
        tileConfig,
        place.dcid,
        [],
        enclosedPlaceType,
        eventTypeSpec,
        urlRoot
      ),
      legend: Object.values(eventTypeSpec).map((spec) => spec.name),
      srcs: getSources(chartData.sources),
      title: getChartTitle(tileConfig.title, getReplacementStrings(tileProp)),
      type: "EVENT_MAP",
    };
  } catch (e) {
    console.log("Failed to get disaster event map tile result for: " + id);
    return null;
  }
}

/**
 * Gets the disaster map chart for a given tile config
 * @param tileConfig the tile config for the chart
 * @param place the place to get the chart for
 * @param enclosedPlaceType the enclosed place type to get the chart for
 * @param eventTypeSpec map of event types to show in the chart to their specs
 * @param apiRoot API root to use to fetch data
 */
export async function getDisasterMapChart(
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  eventTypeSpec: Record<string, EventTypeSpec>,
  apiRoot: string
): Promise<string> {
  try {
    const disasterEventData = await fetchDisasterEventData(
      CHART_ID,
      eventTypeSpec,
      place.dcid,
      null,
      apiRoot
    );
    const tileProp = getTileProp(
      CHART_ID,
      tileConfig,
      place,
      enclosedPlaceType,
      eventTypeSpec,
      disasterEventData,
      apiRoot
    );
    const chartData = await fetchChartData(tileProp);
    const mapContainer = document.createElement("div");
    draw(
      tileProp,
      chartData,
      mapContainer,
      new Set(Object.keys(eventTypeSpec)),
      SVG_HEIGHT,
      SVG_WIDTH
    );
    const svg = mapContainer.querySelector("svg");
    svg.style.background = "#eee";
    return getProcessedSvg(svg);
  } catch (e) {
    return "Failed to get disaster map chart.";
  }
}
