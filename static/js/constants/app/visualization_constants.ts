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
 * Constants used by the visualization app.
 */

export const URL_PATH = "/tools/visualization";
export const URL_PARAMS = {
  VIS_TYPE: "visType",
  PLACE: "place",
  ENCLOSED_PLACE_TYPE: "placeType",
  STAT_VAR: "sv",
  DISPLAY: "display",
};
export const PARAM_VALUE_SEP = "___";
export const PARAM_VALUE_TRUE = "1";
export const STAT_VAR_PARAM_KEYS = {
  DCID: "dcid",
  PER_CAPITA: "pc",
  LOG: "log",
  DATE: "date",
  DENOM: "denom",
};
export const DISPLAY_PARAM_KEYS = {
  SCATTER_QUADRANTS: "q",
  SCATTER_LABELS: "l",
};
