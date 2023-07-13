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
 * Util functions used by node js server
 */

import * as xmlserializer from "xmlserializer";

import { StatVarSpec } from "../js/shared/types";
import { urlToDomain } from "../js/shared/util";
import {
  EventTypeSpec,
  TileConfig,
} from "../js/types/subject_page_proto_types";
import { CHART_URL_PARAMS, FONT_FAMILY, FONT_SIZE } from "./constants";

/**
 * Gets a list of source objects with name and url from a set of source urls.
 * @param sources set of source urls
 */
export function getSources(
  sources: Set<string>
): { name: string; url: string }[] {
  return Array.from(sources).map((src) => {
    return {
      name: urlToDomain(src),
      url: src,
    };
  });
}

/**
 * Processes and serializes a svg for a chart and returns the image element for
 * that chart.
 * @param chartSvg the svg element for the chart to process
 */
export function getProcessedSvg(chartSvg: SVGSVGElement): SVGSVGElement {
  if (!chartSvg) {
    return null;
  }
  // Set the font for all the text in the svg to match the font family and size
  // used for getBBox calculations.
  chartSvg.querySelectorAll("text").forEach((node) => {
    node.setAttribute("font-family", FONT_FAMILY);
    node.setAttribute("font-size", FONT_SIZE);
  });
  return chartSvg;
}

/**
 * Get the serialized xml string for an svg element
 * @param chartSvg the svg element to get the xml for
 */
export function getSvgXml(chartSvg: SVGSVGElement): string {
  if (!chartSvg) {
    return "";
  }
  const svgXml = xmlserializer.serializeToString(chartSvg);
  return "data:image/svg+xml," + encodeURIComponent(svgXml);
}

/**
 * Gets the url that will return a chart for a specific set of properties.
 * @param tileConfig tile config of the chart
 * @param placeDcid place to use for the chart
 * @param statVarSpec list of stat var specs to use for the chart
 * @param enclosedPlaceType enclosed place type to use for the chart
 * @param eventTypeSpec map of event type to its event type spec to use for the
 *                      chart
 * @param urlRoot url root to use for the returned url
 */
export function getChartUrl(
  tileConfig: TileConfig,
  placeDcid: string,
  statVarSpec: StatVarSpec[],
  enclosedPlaceType: string,
  eventTypeSpec: Record<string, EventTypeSpec>,
  urlRoot: string
): string {
  const paramMapping = {
    [CHART_URL_PARAMS.EVENT_TYPE_SPEC]: JSON.stringify(eventTypeSpec),
    [CHART_URL_PARAMS.PLACE]: placeDcid,
    [CHART_URL_PARAMS.ENCLOSED_PLACE_TYPE]: enclosedPlaceType,
    [CHART_URL_PARAMS.STAT_VAR_SPEC]: JSON.stringify(statVarSpec),
    [CHART_URL_PARAMS.TILE_CONFIG]: JSON.stringify(tileConfig),
  };
  let url = `${urlRoot}/nodejs/chart?`;
  Object.keys(paramMapping)
    .sort()
    .forEach((paramKey, idx) => {
      const paramVal = paramMapping[paramKey];
      if (!paramVal) {
        return;
      }
      url += `${idx === 0 ? "" : "&"}${paramKey}=${paramVal}`;
    });
  // manually escape the # because encodeURI will not escape it
  url = url.replaceAll("#", "%23");
  return encodeURI(url);
}
