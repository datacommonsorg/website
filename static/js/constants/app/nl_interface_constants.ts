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
 * Constants used by nl_interface.
 */

export const NL_SMALL_TILE_CLASS = "tile-sm";
export const NL_MED_TILE_CLASS = "tile-md";
export const NL_LARGE_TILE_CLASS = "tile-lg";
// Number of tiles to show.
export const NL_NUM_TILES_SHOWN = 3;
export const NL_SOURCE_REPLACEMENTS = {
  "https://www.datacommons.org/": "https://www.google.com",
  "https://datacommons.org/": "https://www.google.com",
  "https://www.datacommons.org": "https://www.google.com",
  "https://datacommons.org": "https://www.google.com",
};

export const NL_URL_PARAMS = {
  DETECTOR: "detector",
  IDX: "idx",
};

export const NL_INDEX_VALS = {
  SMALL: "small",
  MEDIUM_FT: "medium_ft",
};

export const NL_DETECTOR_VALS = {
  HEURISTIC: "heuristic",
  HYBRID: "hybrid",
  LLM: "llm",
};

export const MAX_QUERY_COUNT = 10;

export const SVG_CHART_HEIGHT = 200;
