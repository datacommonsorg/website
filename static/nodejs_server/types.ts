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
 * Types used for nodejs server
 */

// The result for a single tile
export interface TileResult {
  // The svg for the chart in the tile as an xml string
  svg: string;
  // List of sources of the data in the chart
  srcs: { name: string; url: string }[];
  // The title of the tile
  title: string;
  // The type of the tile
  type: string;
  // List of legend labels
  legend?: string[];
  // The data for the chart in the tile as a csv string
  data_csv?: string;
}