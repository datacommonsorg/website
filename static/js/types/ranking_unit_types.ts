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
}
