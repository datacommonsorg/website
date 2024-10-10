/**
 * Copyright 2024 Google LLC
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
 * Data Commons client constants
 */

// Total population stat var
export const TOTAL_POPULATION_VARIABLE = "Count_Person";
// Name attribute for entities and variables
export const NAME_ATTRIBUTE = "name";
// ISO 3166-2 code property name for place entities
export const ISO_CODE_ATTRIBUTE = "isoCode";
// Fetch these entity and variable properties by default
export const DEFAULT_ENTITY_PROPS = [NAME_ATTRIBUTE, ISO_CODE_ATTRIBUTE];
export const DEFAULT_VARIABLE_PROPS = [NAME_ATTRIBUTE];
// GeoJSON is stored in this property name by default
export const DEFAULT_GEOJSON_PROPERTY_NAME = "geoJsonCoordinatesDP1";
// Default csv header field delimiter
export const DEFAULT_FIELD_DELIMITER = ".";
