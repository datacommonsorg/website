/**
 * Copyright 2022 Google LLC
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
 * Util functions used by tile components.
 */

import axios from "axios";
import _ from "lodash";

import { getStatsVarLabel } from "../shared/stats_var_labels";
import { StatVarSpec } from "../shared/types";
import { EventTypeSpec, TileConfig } from "../types/subject_page_proto_types";
import { stringifyFn } from "./axios";

export interface ReplacementStrings {
  placeName?: string;
  date?: string;
  statVar?: string;
  xDate?: string;
  yDate?: string;
  placeDcid?: string;
}

/**
 * Formats a string with replacement strings.
 * NOTE: unspecified keys will not be replaced / removed from the string.
 *
 * @param s The string to format
 * @param rs The replacement strings to use
 */
export function formatString(s: string, rs: ReplacementStrings): string {
  let formattedString = s;
  for (const key in rs) {
    const re = new RegExp(`\\$\\{${key}\\}`, "g");
    formattedString = formattedString.replace(re, rs[key]);
  }
  return formattedString;
}

/**
 * Gets the stat var name to display
 * @param statVarDcid dcid of the stat var to get the name for
 * @param statVarSpecs list of available stat var specs
 * @param isPerCapita whether or not the name is for a per capita stat var
 */
export function getStatVarName(
  statVarDcid: string,
  statVarSpecs: StatVarSpec[],
  isPerCapita?: boolean
): string {
  for (const svs of statVarSpecs) {
    if (svs.statVar === statVarDcid) {
      if (svs.name) {
        return svs.name;
      }
      break;
    }
  }
  const label = getStatsVarLabel(statVarDcid);
  if (isPerCapita) {
    return `${label} Per Capita`;
  }
  return label;
}

/**
 * Gets the stat var names to display via node/propvals api call for all stat
 * vars in a statVarSpec collection.
 * Different from getStatVarName() in that if a stat var's name is not provided
 * in its spec, will try to query the name though an api call.
 * @param statVarSpecs specs of stat vars to get names for
 * @param apiRoot api root to use for api
 */
export async function getStatVarNames(
  statVarSpec: StatVarSpec[],
  apiRoot?: string
): Promise<{ [key: string]: string }> {
  if (_.isEmpty(statVarSpec)) {
    return Promise.resolve({});
  }
  const statVarDcids: string[] = [];
  const statVarNames: Record<string, string> = {};
  // If a name is already provided by statVarSpec, use that name
  statVarSpec.forEach((spec) => {
    if (spec.name && spec.name != "") {
      statVarNames[spec.statVar] = spec.name;
    } else {
      statVarDcids.push(spec.statVar);
    }
  });

  // If all names were provided by statVarSpec, skip api call
  if (_.isEmpty(statVarDcids)) {
    return Promise.resolve(statVarNames);
  }

  try {
    const resp = await axios.get(`${apiRoot || ""}/api/node/propvals/out`, {
      params: {
        dcids: statVarDcids,
        prop: "name",
      },
      paramsSerializer: stringifyFn,
    });
    for (const statVar in resp.data) {
      // If the api call can't find a name for the stat var (api returns []),
      // default to using its dcid
      statVarNames[statVar] = _.isEmpty(resp.data[statVar])
        ? statVar
        : resp.data[statVar][0].value;
    }
    return statVarNames;
  } catch (error) {
    console.log(error);
    return await Promise.reject(error);
  }
}

interface SVGInfo {
  // the svg as an xml string
  svgXml: string;
  // height of the svg
  height: number;
  // width of the svg
  width: number;
}

/**
 * Gets a single svg that merges all the svgs within a containing html div.
 * @param svgContainer
 */
export function getMergedSvg(svgContainer: HTMLDivElement): SVGInfo {
  const svgElemList = svgContainer.getElementsByTagName("svg");
  // Create new svg element to return which will hold all the svgs coming from
  // containerRef
  const mergedSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  let width = 0;
  let height = 0;
  // Set embedSvgHeight as the max height of all svgs
  Array.from(svgElemList).forEach((svg) => {
    height = Math.max(svg.getBBox().height, height);
  });
  // Add each svg from svgElemList to embedSvg
  for (const svg of Array.from(svgElemList)) {
    const svgBBox = svg.getBBox();
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    // Set height of current svg to the height of the embedSvg
    clonedSvg.setAttribute("height", `${height}`);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // Move current svg to the right of svgs that have already been added to
    // embedSvg
    g.setAttribute("transform", `translate(${width})`);
    g.appendChild(clonedSvg);
    mergedSvg.appendChild(g);
    // Update width of embedSvg to include current svg width
    width += svgBBox.width + svgBBox.x;
  }
  mergedSvg.setAttribute("height", String(height));
  mergedSvg.setAttribute("width", String(width));
  const s = new XMLSerializer();
  const svgXml = !_.isEmpty(svgElemList) ? s.serializeToString(mergedSvg) : "";
  return { svgXml, height, width };
}

/**
 * Gets the chart title for a tile
 * @param title the title from the tile config
 * @param rs replacement strings to use to format the title
 */
export function getChartTitle(title: string, rs: ReplacementStrings): string {
  return title ? formatString(title, rs) : "";
}

/**
 * Gets the relevant event type specs for a disaster event tile (a tile that is
 * rendered in a disaster event block)
 * @param eventTypeSpec the full collection of event type specs
 * @param tile tile to get the event type specs for
 */
export function getTileEventTypeSpecs(
  eventTypeSpec: Record<string, EventTypeSpec>,
  tile: TileConfig
): Record<string, EventTypeSpec> {
  const relevantEventSpecs = {};
  if (tile.disasterEventMapTileSpec) {
    const pointEventTypeKeys =
      tile.disasterEventMapTileSpec.pointEventTypeKey || [];
    const polygonEventTypeKeys =
      tile.disasterEventMapTileSpec.polygonEventTypeKey || [];
    const pathEventTypeKeys =
      tile.disasterEventMapTileSpec.pathEventTypeKey || [];
    [
      ...pointEventTypeKeys,
      ...polygonEventTypeKeys,
      ...pathEventTypeKeys,
    ].forEach((specId) => {
      relevantEventSpecs[specId] = eventTypeSpec[specId];
    });
  }
  if (tile.topEventTileSpec) {
    const specId = tile.topEventTileSpec.eventTypeKey;
    relevantEventSpecs[specId] = eventTypeSpec[specId];
  }
  if (tile.histogramTileSpec) {
    const specId = tile.histogramTileSpec.eventTypeKey;
    relevantEventSpecs[specId] = eventTypeSpec[specId];
  }
  return relevantEventSpecs;
}
