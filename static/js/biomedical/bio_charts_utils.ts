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
import * as d3 from "d3";

import { DiseaseGeneAssociationData } from "./disease/types";
import { ProteinNumData } from "./protein/chart";
import { DiseaseAssociationType } from "./protein/page";
import { InteractionLink, ProteinNode } from "./protein/types";
export const MARGIN = { top: 30, right: 30, bottom: 90, left: 160 };
// number to select top data points for large data
export const NUM_DATA_POINTS = 10;
// tooltip constant for all charts
export const TOOL_TIP = d3
  .select("#main")
  .append("div")
  .attr("class", "tooltip");
// shift in tooltip positions
export const TOOL_TIP_SHIFT = 60;
// default brightness for barcharts
export const DEFAULT_BRIGHTEN_PERCENTAGE = "112%";
// x axis label shift
export const X_LABEL_SHIFT = 40;
export type Datum =
  | DiseaseGeneAssociationData
  | ProteinNumData
  | ProteinNode
  | InteractionLink
  | DiseaseAssociationType;
export const GRAPH_BROWSER_REDIRECT = "/browser/";
/**
 * When mouse first enters element specified by given id, brighten it and update/display the global tooltip.
 */
export function onMouseOver(
  elementID: string,
  toolTipText: string,
  brightenPercentage: string = DEFAULT_BRIGHTEN_PERCENTAGE
): void {
  // brighten element: https://stackoverflow.com/a/69610045
  d3.select(`#${elementID}`).style(
    "filter",
    `brightness(${brightenPercentage})`
  );
  // update and show tooltip text
  TOOL_TIP.html(toolTipText).style("display", "block");
}

/**
 * Update position of global tooltip to track mouse.
 */
export function onMouseMove(): void {
  TOOL_TIP.style("left", d3.event.pageX - TOOL_TIP_SHIFT + "px").style(
    "top",
    d3.event.pageY - TOOL_TIP_SHIFT + "px"
  );
}

/**
 * When mouse leaves element specified by given id, reset its brightness and hide the global tooltip.
 */
export function onMouseOut(elementID: string): void {
  // reset element brightness
  d3.select(`#${elementID}`).style("filter", "brightness(100%)");
  // hide tooltip
  TOOL_TIP.style("display", "none");
}

/**
 * On mouse hover, select hovered element and
 *  1) highlight it
 *  2) update the global tooltip
 *  3) show the global tooltip.
 *
 * Unhighlight and hide the global tooltip when the mouse leaves.
 */
export function handleMouseEvents(
  selection: d3.Selection<SVGElement, any, any, any>,
  idFunc: (index: number) => string,
  toolTipFunc: (datum: Datum) => string,
  brightenPercentage: string = DEFAULT_BRIGHTEN_PERCENTAGE
): void {
  selection
    .on("mouseover", (d, i) => {
      onMouseOver(idFunc(i), toolTipFunc(d), brightenPercentage);
    })
    .on("mousemove", onMouseMove)
    .on("mouseout", (d, i) => onMouseOut(idFunc(i)));
}

/**
 * Get function that takes an index and returns an ID containing the chart ID, element name, and index.
 */
export function getElementIDFunc(
  chartID: string,
  elementName: string
): (index: number) => string {
  return (index) => `${chartID}-${elementName}${index}`;
}

/**
 * Adds the x label to a graph based on user's input of width and height
 */
export function addXLabel(
  width: number,
  height: number,
  labelText: string,
  svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>
): void {
  svg
    .attr("class", "axis-label")
    .append("text")
    .attr(
      "transform",
      "translate(" +
        width / 2 +
        " ," +
        (height + MARGIN.top + X_LABEL_SHIFT) +
        ")"
    )
    .text(labelText);
}

/**
 * Adds the y label to a graph based on user's input of width and height
 */
export function addYLabel(
  height: number,
  labelText: string,
  svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>
): void {
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .text(labelText);
}

/**
 * Creates the page redirection link of the input entity
 * @param dcid entity dcid
 * @returns redirection link
 */
export function getEntityLink(dcid: string): string {
  const entityLink = GRAPH_BROWSER_REDIRECT + dcid;
  return entityLink;
}
