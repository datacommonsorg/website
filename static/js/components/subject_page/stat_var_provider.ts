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
import _ from "lodash";

import { StatVarSpec } from "../../shared/types";
import { StatVarSpecMap } from "../../types/subject_page_proto_types";

// Provider for stat var spec in a category.
// TODO: move data fetching from individual tiles here.

export class StatVarProvider {
  _statVarSpecMap: StatVarSpecMap;

  constructor(svsMap: StatVarSpecMap) {
    this._statVarSpecMap = svsMap;
  }

  // Gets the stat var spec for a key. If blockDenom is non empty, set the denom
  // of the stat var spec.
  getSpec(
    key: string,
    options?: { blockDenom?: string; blockDate?: string }
  ): StatVarSpec {
    if (!(key in this._statVarSpecMap)) {
      return null;
    }
    const spec = _.cloneDeep(this._statVarSpecMap[key]);
    if (options?.blockDenom && !spec.noPerCapita) {
      spec.denom = options.blockDenom;
    }
    if (options?.blockDate) {
      spec.date = options.blockDate;
    }
    return spec;
  }

  // Gets the stat var spec for a list of keys. If blockDenom is non empty, set
  // the denom of each stat var spec in the list.
  getSpecList(
    keys: string[],
    options?: { blockDenom?: string; blockDate?: string }
  ): StatVarSpec[] {
    return keys
      .map((k) => this.getSpec(k, options))
      .filter((svSpec) => !_.isEmpty(svSpec));
  }
}
