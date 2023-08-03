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
 * Svg related helper functions
 */

import * as d3 from "d3";

import { SVGNS, XHTMLNS, XLINKNS } from "../constants/svg_constants";

const CHART_PADDING = 10;

/**
 * Get the svg for an html string
 * @param htmlString the html in string form to convert to an svg
 * @param svgWidth the width of the svg
 * @param svgHeight the height of the svg
 * @param svgClass additional classes to add to the svg
 * @param styles additional styles to add to the svg
 */
export function htmlToSvg(
  htmlString: string,
  svgWidth: number,
  svgHeight: number,
  svgClass?: string,
  styles?: { [name: string]: string }
): SVGSVGElement {
  const svg = d3
    .create("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", svgWidth)
    .attr("height", svgHeight);

  svg
    .append("g")
    .attr("transform", `translate(${CHART_PADDING})`)
    .append("svg")
    .append("foreignObject")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("font-family", "sans-serif")
    .append("xhtml:div")
    .attr("xmlns", XHTMLNS)
    .html(htmlString);

  if (svgClass) {
    svg.attr("class", svgClass);
  }
  if (styles) {
    Object.keys(styles).forEach((name: string) => {
      svg.style(name, styles[name]);
    });
  }

  return svg.node();
}
