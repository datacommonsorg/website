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

import { SVGNS, XLINKNS } from "../../js/constants/svg_constants";
import { urlToDisplayText } from "../../js/shared/util";
import {
  FONT_FAMILY,
  FONT_SIZE,
  SVG_HEIGHT,
  SVG_PADDING,
  SVG_WIDTH,
} from "../constants";

/**
 * Gets a list of source objects with name and url from a set of source urls.
 * @param sources set of source urls
 */
export function getSources(
  sources: Set<string>
): { name: string; url: string }[] {
  return Array.from(sources).map((src) => {
    return {
      name: urlToDisplayText(src),
      url: src,
    };
  });
}

/**
 * Processes and serializes a svg for a chart and returns the image element for
 * that chart.
 * @param chartSvg the svg element for the chart to process
 */
export function getProcessedSvg(
  chartSvg: SVGSVGElement,
  isDisasterMapTile?: boolean
): SVGSVGElement {
  if (!chartSvg) {
    return null;
  }
  const height = Number(chartSvg.getAttribute("height")) || SVG_HEIGHT;
  chartSvg.setAttribute("xmlns", SVGNS);
  chartSvg.setAttribute("xmlns:xlink", XLINKNS);

  // TODO (juliawu): Setting padding, height/width, and transform is a hacky
  //                 workaround for getting axes labels to show up in pngs.
  //                 Need to switch to dynamically setting svg size.
  const svgWidth = SVG_WIDTH + 2 * SVG_PADDING;
  const svgHeight = height + 2 * SVG_PADDING;
  chartSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  chartSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Add a white background by adding a white rect element
  const backgroundElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect"
  );
  backgroundElement.setAttribute("width", `${svgWidth + SVG_PADDING}`);
  backgroundElement.setAttribute("height", `${svgHeight + SVG_PADDING}`);
  backgroundElement.setAttribute(
    "transform",
    `translate(-${SVG_PADDING}, -${SVG_PADDING})`
  );
  backgroundElement.setAttribute("fill", "white");
  chartSvg.insertBefore(backgroundElement, chartSvg.firstChild);

  if (!isDisasterMapTile) {
    // Disaster event map tiles are already centered in the SVG.
    // Translate to center all other tile types.
    chartSvg.setAttribute(
      "transform",
      `translate(${SVG_PADDING}, ${SVG_PADDING})`
    );
  }

  // Set the font for all the text in the svg to match the font family and size
  // used for getBBox calculations.
  chartSvg.style.removeProperty("font-family");
  chartSvg.querySelectorAll("text").forEach((node) => {
    node.style.removeProperty("font-family");
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
