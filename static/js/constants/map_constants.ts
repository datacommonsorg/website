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
 * Constants used by map tile and map tool components.
 */

// Use non-DP geojsons for drawing borders to avoid mismatched edges between
// the border and enclosed places
export const BORDER_GEOJSON_PROPERTY = "geoJsonCoordinates";

// list of enclosed place types that don't cover enclosing places completely
// used for determining if the enclosing place's borders should be drawn
export const NO_FULL_COVERAGE_PLACE_TYPES = [
  "City",
  "CensusZipCodeTabulationArea",
];

// Color to use to draw enclosing place borders
export const BORDER_STROKE_COLOR = "#C8C8C8";
