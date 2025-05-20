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

import { StatMetadata } from "../shared/stat_types";
import { StatVarFacetMap } from "../shared/types";

/**
 * Types used by RankingUnit component
 */

// TODO: move this as a general data type.
export interface RankingPoint {
  placeDcid: string;
  placeName?: string;
  // Only one of value or values should be set. If values are set, then multi-col is rendered.
  value?: number;
  values?: number[];
  /**
   * If not provided, the component will calculate the rank based on the order of the input points.
   */
  rank?: number;
  date?: string;
}

export interface RankingGroup {
  points: RankingPoint[];
  // If only value is used in RankingPoint - then there will only be one unit,
  // scaling, and svName set. Otherwise, will match the order of values[].
  unit: string[];
  scaling: number[];
  svName: string[];
  // A set of string sources (URLs)
  sources: Set<string>;
  // A full set of the facets used within the chart
  facets?: Record<string, StatMetadata>;
  // A mapping of which stat var used which facets
  statVarToFacets?: StatVarFacetMap;
  numDataPoints?: number;
  dateRange: string;
  // Optional for storing the processed rankingData
  rankingData?: { lowest: RankingPoint[]; highest: RankingPoint[] };
}

export interface RankingData {
  [statVarDcid: string]: RankingGroup;
}
