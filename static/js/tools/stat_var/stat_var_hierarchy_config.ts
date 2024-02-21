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
 * Stat var hierarchy component config.
 **/
export interface StatVarHierarchyConfig {
  disableSearch?: boolean;
  nodes: {
    // Optional: Node name to display in hierarchy.
    // Default: absoluteName from /api/variable-group/info endpoint
    name?: string;
    // Node DCID. Default: "dc/g/Root"
    dcid: string;
    // Optional: Data Source. Filter the stat var group using this entity DCID.
    dataSourceDcid?: string;
  }[];
}

const DEFAULT_STAT_VAR_HIERARCHY_CONFIG: StatVarHierarchyConfig = {
  nodes: [
    {
      dcid: "dc/g/Root",
    },
  ],
};

const STAT_VAR_HIERARCHY_CONFIG = (globalThis.STAT_VAR_HIERARCHY_CONFIG ||
  DEFAULT_STAT_VAR_HIERARCHY_CONFIG) as StatVarHierarchyConfig;

export { STAT_VAR_HIERARCHY_CONFIG };
