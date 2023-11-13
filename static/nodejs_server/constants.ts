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
 * Constants used by the nodejs server
 */

import {
  LEGEND_IMG_WIDTH,
  LEGEND_MARGIN_RIGHT,
  LEGEND_TICK_LABEL_MARGIN,
} from "../js/chart/draw_map_utils";

// Height of the svg to render.
export const SVG_HEIGHT = 300;
// Width of the svg to render.
export const SVG_WIDTH = 500;
export const SVG_PADDING = 25;
export const DOM_ID = "dom-id";
// id to use for drawing charts.
export const CHART_ID = "chart-id";
// Font family to use for all the text on the charts. If this is updated, need
// to also update CHAR_WIDTHS and CHAR_AVG_WIDTHS.
export const FONT_FAMILY = "Roboto";
// Font size to use for all the text on the charts. If this is updated, need to
// also update CHAR_WIDTHS, CHAR_AVG_WIDTHS, and CHAR_HEIGHT.
export const FONT_SIZE = "10px";
// Width of the constant sized part of the map legend
export const MAP_LEGEND_CONSTANT_WIDTH =
  LEGEND_IMG_WIDTH + LEGEND_MARGIN_RIGHT + LEGEND_TICK_LABEL_MARGIN;
// Url params used for getting a single chart
export const CHART_URL_PARAMS = {
  TILE_CONFIG: "config",
  PLACE: "place",
  ENCLOSED_PLACE_TYPE: "enclosedPlaceType",
  STAT_VAR_SPEC: "svSpec",
  EVENT_TYPE_SPEC: "eventTypeSpec",
};
