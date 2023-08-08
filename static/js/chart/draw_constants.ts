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
 * Shared constants used in the draw functions for chart tiles
 */

export const AXIS_TEXT_FILL = "#2b2929";

export const LEGEND = {
  ratio: 0.2,
  minTextWidth: 100,
  dashWidth: 30,
  lineMargin: 10,
  marginLeft: 10,
  marginTop: 40,
  defaultColor: "#000",
};

export const MARGIN = {
  top: 20, // margin between chart and top edge
  right: 10, // margin between chart and right edge
  bottom: 30, // margin between chart and bottom edge
  left: 0, // margin between chart and left edge
  grid: 10, // margin between y-axis and chart content
};

export const NUM_Y_TICKS = 5;

export const SVGNS = "http://www.w3.org/2000/svg";

export const TEXT_FONT_FAMILY = "Roboto";

export const TOOLTIP_ID = "draw-tooltip";

export const XLINKNS = "http://www.w3.org/1999/xlink";
