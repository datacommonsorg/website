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

import { StatVarMetadata } from "../types/stat_var";
import { StatVarMetadataMap } from "./topic_config";

// Provider for stat var metadata in a category.
// TODO: move data fetching from individual tiles here.

export class StatVarProvider {
  _statVarMetadataMap: StatVarMetadataMap;

  constructor(svmMap: StatVarMetadataMap) {
    this._statVarMetadataMap = svmMap;
  }

  getMetadata(key: string): StatVarMetadata {
    return this._statVarMetadataMap[key] || null;
  }

  getMetadataList(keys: string[]): StatVarMetadata[] {
    return keys.map((k) => this._statVarMetadataMap[k]);
  }
}