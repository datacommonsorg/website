/**
 * Copyright 2020 Google LLC
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
 * Utility functions shared across different components of stat var hierarchy.
 */

import * as d3 from "d3";

import { Boundary } from "../shared/types";

export const TOOLTIP_ID = "tree-widget-tooltip";
// id value of the div that holds this stat var hierarchy section.
export const SV_HIERARCHY_SECTION_ID = "stat-var-hierarchy-section";

/** Function to make tooltip show up given the html for the tooltip and position
 * to display the tooltip at.
 */
export function showTooltip(html: string, position: Boundary): void {
  d3.select(`#${TOOLTIP_ID}`)
    .style("visibility", "visible")
    .style("left", position.left ? position.left + "px" : null)
    .style("right", position.right ? position.right + "px" : null)
    .style("top", position.top ? position.top + "px" : null)
    .style("bottom", position.bottom ? position.bottom + "px" : null)
    .html(html);
}

/** Function to hide the tooltip.
 */
export function hideTooltip(): void {
  d3.select("#tree-widget-tooltip").style("visibility", "hidden");
}
