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

import { urlToDomain } from "../js/shared/util";
import { FONT_FAMILY, FONT_SIZE } from "./constants";

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
 * Processes and serializes a svg for a chart.
 * @param chartSvg the svg element for the chart to process
 */
export function getProcessedSvg(chartSvg: SVGSVGElement): string {
  if (!chartSvg) {
    return "";
  }
  // Set the font for all the text in the svg to match the font family and size
  // used for getBBox calculations.
  chartSvg.querySelectorAll("text").forEach((node) => {
    node.setAttribute("font-family", FONT_FAMILY);
    node.setAttribute("font-size", FONT_SIZE);
  });
  // Get and return the svg as an xml string
  const svgXml = xmlserializer.serializeToString(chartSvg);
  return "data:image/svg+xml," + encodeURIComponent(svgXml);
}
