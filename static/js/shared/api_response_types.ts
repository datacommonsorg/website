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

// Represents a single node in the KG.
// Parameters match output of "nodes" from the triples API or "values" from the property values API.
export interface Node {
  provenanceId: string;
  dcid?: string;
  name?: string;
  value?: string;
  types?: Array<string>;
}

export interface PropertyValues {
  // Keyed by property, with values being a list of nodes
  [key: string]: Node[];
}
