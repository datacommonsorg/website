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

import { StatVarSpec } from "../js/shared/types";
import {
  EventTypeSpec,
  TileConfig,
} from "../js/types/subject_page_proto_types";

/**
 * Types used for nodejs server
 */

// The result for a single tile
export interface TileResult {
  // List of sources of the data in the chart
  srcs: { name: string; url: string }[];
  // The title of the tile
  title: string;
  // The type of the tile
  type: string;
  // Dcids of the stat vars shown in the chart
  vars: string[];
  // Dcids of the places shown in the chart. If it's a chart that shows children
  // places such as map or ranking, this is the dcid of the parent place.
  places: string[];
  // Type of place shown in the chart if it's a chart that shows children places
  placeType?: string;
  // List of legend labels
  legend?: string[];
  // The data for the chart in the tile as a csv string
  data_csv?: string;
  // The url to get the chart in the tile. One of chartUrl or svg should be set.
  chartUrl?: string;
  // The svg for the chart in the tile as an xml string. One of chartUrl or svg should be set.
  svg?: string;
  // The unit of the data in the chart if it's a single unit.
  unit?: string;
  // The data point to highlight. Only returned for single line line charts and highlight charts
  highlight?: {
    value: number;
    date: string;
  };
  // The link to the data commons explore page for this result.
  dcUrl?: string;
}

// Properties to use for drawing a single chart
export interface ChartProps {
  place: string;
  enclosedPlaceType: string;
  statVarSpec: StatVarSpec[];
  tileConfig: TileConfig;
  eventTypeSpec: Record<string, EventTypeSpec>;
}

// Debug info to return in /nodejs/query response
export interface DebugInfo {
  timing: {
    getNlResult: number;
    getTileResults: number;
    total: number;
  };
  // debug info from detect-and-fulfill endpoint
  debug: Record<string, any>;
}

// The result to return in /nodejs/query
export interface QueryResult {
  charts?: TileResult[];
  err?: string;
  debug?: DebugInfo;
  relatedQuestions?: string[];
}
