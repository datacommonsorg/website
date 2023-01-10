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

import { StatVarSpec } from "../../shared/types";
import {
  StatVarSpecMap,
  TileConfig,
} from "../../types/subject_page_proto_types";

// Provider for stat var spec in a category.
// TODO: move data fetching from individual tiles here.

export class StatVarProvider {
  _statVarSpecMap: StatVarSpecMap;

  constructor(svsMap: StatVarSpecMap) {
    this._statVarSpecMap = svsMap;
  }

  getSpec(tileConfig: TileConfig, key: string): StatVarSpec {
    const svSpecMap = tileConfig.statVarSpec || this._statVarSpecMap;
    return svSpecMap[key] || null;
  }

  getSpecList(tileConfig: TileConfig, keys: string[]): StatVarSpec[] {
    const svSpecMap = tileConfig.statVarSpec || this._statVarSpecMap;
    return keys.map((k) => svSpecMap[k]);
  }
}
