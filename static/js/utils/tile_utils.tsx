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

import _ from "lodash";

import { getStatsVarLabel } from "../shared/stats_var_labels";
import { StatVarSpec } from "../shared/types";

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
