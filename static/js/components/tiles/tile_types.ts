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

import { StatVarSpec } from "../../shared/types";

/**
 * Types and interfaces shared by tiles
 */

export interface TileProp {
  // API root
  apiRoot?: string;
  // Extra classes to add to the container.
  className?: string;
  // Id for the chart
  id: string;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  // Title of the chart
  title: string;
  // Optional: Override sources for this tile
  sources?: string[];
}

/**
 * Options available for chart-type tiles:
 *  - BAR, DONUT, GAUGE, LINE, MAP
 */
export interface ChartOptions {
  // colors to use when plotting
  colors?: string[];
  // footnote to add the the bottom
  footnote?: string;
  // text to put under title
  subtitle?: string;
  // height, in px, for the SVG chart
  svgChartHeight: number;
  // TODO: implement placeNameProp for GAUGE and DONUT.
  // TODO: implement getProcessedSVNameFn for DONUT, GAUGE, MAP, SCATTER.
  // TODO: implement colors for SCATTER.
}

/**
 * Single Place, Single Variable Tiles
 *  - GAUGE, HIGHLIGHT
 */
export interface SinglePlaceSingleVariableTileProp extends TileProp {
  place: string;
  variable: StatVarSpec;
}

/**
 * Single Place, Multiple Variable Tiles
 *  - DONUT
 */
export interface SinglePlaceMultiVariableTileProp extends TileProp {
  place: string;
  variables: StatVarSpec[];
}

/**
 * Multiple Place, Single Variable Tiles
 *  - TODO: Implement multi-place, single var for donut tile
 */
export interface MultiPlaceSingleVariableTileProp extends TileProp {
  places: string[];
  variable: StatVarSpec;
}

/**
 * Multiple Place, Multiple Variable Tiles
 *  - BAR, LINE
 */
export interface MultiPlaceMultiVariableTileProp extends TileProp {
  places: string[];
  variables: StatVarSpec[];
}

/**
 * Contained-In a Place, Single Variable Tiles
 *  - MAP
 */
export interface ContainedInPlaceSingleVariableTileProp extends TileProp {
  enclosedPlaceType: string;
  parentPlace: string;
  variable: StatVarSpec;
}

/**
 * Contained-In a Place, Multiple Variable Tiles
 *  - BAR, LINE, RANKING, SCATTER
 */
export interface ContainedInPlaceMultiVariableTileProp extends TileProp {
  enclosedPlaceType: string;
  parentPlace: string;
  variables: StatVarSpec[];
}

/**
 * Allow both multiple places or contained-in places
 *  - BAR, LINE
 */
export type MultiOrContainedInPlaceMultiVariableTileType =
  | MultiPlaceMultiVariableTileProp
  | ContainedInPlaceMultiVariableTileProp;

/**
 * DataSpec options for Map Tile
 * TODO: Extend this for other tile types
 *       and deprecate the *TileProp interfaces
 */
export interface ContainedInPlaceSingleVariableDataSpec {
  enclosedPlaceType: string;
  parentPlace: string;
  variable: StatVarSpec;
}
