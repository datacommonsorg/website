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

import { fetchDisasterEventData } from "../../js/components/subject_page/disaster_event_block";
import {
  DisasterEventMapTilePropType,
  DisasterMapChartData,
  draw,
  fetchChartData,
  getReplacementStrings,
} from "../../js/components/tiles/disaster_event_map_tile";
import { NamedTypedPlace } from "../../js/shared/types";
import { DisasterEventPointData } from "../../js/types/disaster_event_map_types";
import {
  EventTypeSpec,
  TileConfig,
} from "../../js/types/subject_page_proto_types";
import {
  getDate,
  getSeverityFilters,
} from "../../js/utils/disaster_event_map_utils";
import { getChartTitle } from "../../js/utils/tile_utils";
import { CHART_ID, SVG_HEIGHT, SVG_WIDTH } from "../constants";
import { TileResult } from "../types";
import { getChartUrl, getProcessedSvg, getSources, getSvgXml } from "./utils";

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

function getDisasterMapSvg(
  tileProp: DisasterEventMapTilePropType,
  chartData: DisasterMapChartData,
  eventTypeSpec: Record<string, EventTypeSpec>
): SVGSVGElement {
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
  return getProcessedSvg(svg, true);
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
  urlRoot: string,
  useChartUrl: boolean,
  apikey?: string
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
    const result: TileResult = {
      legend: Object.values(eventTypeSpec).map((spec) => spec.name),
      placeType: enclosedPlaceType,
      places: [place.dcid],
      srcs: getSources(chartData.sources),
      title: getChartTitle(tileConfig.title, getReplacementStrings(tileProp)),
      type: "EVENT_MAP",
      vars: [],
    };
    if (useChartUrl) {
      result.chartUrl = getChartUrl(
        tileConfig,
        place.dcid,
        [],
        enclosedPlaceType,
        eventTypeSpec,
        urlRoot,
        apikey
      );
      return result;
    }
    const svg = getDisasterMapSvg(tileProp, chartData, eventTypeSpec);
    result.svg = getSvgXml(svg);
    return result;
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
): Promise<SVGSVGElement> {
  try {
    const disasterEventData = await fetchDisasterEventData(
      eventTypeSpec,
      place.dcid,
      // TODO: update the endpoint to also take a date for the tile
      getDate(CHART_ID, {}, place),
      getSeverityFilters(eventTypeSpec, CHART_ID),
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
    return getDisasterMapSvg(tileProp, chartData, eventTypeSpec);
  } catch (e) {
    console.log("Failed to get disaster map chart.");
    return null;
  }
}
