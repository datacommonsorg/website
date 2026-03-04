/**
 * Copyright 2025 Google LLC
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

import PLACE_HIERARCHY from "./place_hierarchy.json";

/**
 * Constants for the place selector on our visualization tools
 *
 * Instead of reading data-availability in the KG, we hardcode which place types
 * are available for selection in the enclosed place type selector based on the
 * place type hierarchies defined in `place_hierarchy.json`. This helps us avoid showing place types
 * which would overload our servers or the user's browser (e.g. showing all cities in the world)
 *
 * By default, we limit the hierarchy to two levels deep (i.e.only taking place nodes that
 * are up to two containedInPlace levels away from the selected place type). We also have a
 * separate hierarchy for the map tool where we are limited by geojson availability.
 *
 * --- Documentation for `place_hierarchy.json` ---
 *
 * `place_hierarchy.json` dictates which child place types are available for selection for a given parent place type.
 * It is split into "standard" tools and "map" tools (which are restricted by geojson availability).
 *
 * 1. UNIVERSAL_CHILDREN / MAPS_UNIVERSAL_CHILDREN:
 *    Place types appended to ALL configurations for a given parent type
 *    (e.g., IPCCPlace_50 is a child of all countries).
 *    These are applied regardless of whether a country uses defaults or overrides.
 *
 * 2. GLOBAL_DEFAULTS / MAPS_GLOBAL_DEFAULTS:
 *    The standard fallback hierarchies used for any place that does not have a
 *    specific override defined.
 *
 * 3. DEFAULT_OVERRIDES / MAPS_OVERRIDES:
 *    Country-specific or region-specific overrides.
 *    Defined by mapping a place DCID (e.g., "country/USA", "europe") to its custom hierarchy.
 *    If a country has a map override but no default override, the standard tools
 *    will fall back to GLOBAL_DEFAULTS, but use the override in the Map Tool.
 */

/**
 * Mapping of place type of parent place -> place types of children.
 * This defines which place types are available for selection in the enclosed place type selector
 * based on the parent place type.
 */
type PlaceHierarchy = Record<string, string[]>;

/**
 * Country-specific or region-specific overrides
 * Maps place DCID -> PlaceHierarchy to use by default
 */
export const DEFAULT_OVERRIDES: Record<string, PlaceHierarchy> =
  PLACE_HIERARCHY.DEFAULT_OVERRIDES;

/**
 * Maps place DCID -> PlaceHierarchy to use for the map tool
 */
export const MAPS_OVERRIDES: Record<string, PlaceHierarchy> =
  PLACE_HIERARCHY.MAPS_OVERRIDES;

/**
 * Global default hierarchy to use across the application
 */
export const DEFAULT_HIERARCHY: PlaceHierarchy =
  PLACE_HIERARCHY.GLOBAL_DEFAULTS;

/**
 * Default hierarchy to use for the map tool specifically
 */
export const MAPS_DEFAULT_HIERARCHY: PlaceHierarchy =
  PLACE_HIERARCHY.MAPS_GLOBAL_DEFAULTS;

/**
 * Universal default appends used across all standard configs
 */
export const UNIVERSAL_CHILDREN: PlaceHierarchy =
  PLACE_HIERARCHY.UNIVERSAL_CHILDREN;

/**
 * Universal maps appends used across all map configs
 */
export const MAPS_UNIVERSAL_CHILDREN: PlaceHierarchy =
  PLACE_HIERARCHY.MAPS_UNIVERSAL_CHILDREN;
