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
 * Component for rendering a entity overview tile.
 */

import React from "react";
import { URI_PREFIX } from "../../browser/constants";

interface EntityOverviewTilePropType {
  entity: string;
}

export function EntityOverviewTile(
  props: EntityOverviewTilePropType
): JSX.Element {
  if (!props.entity) {
    return null;
  }

  return (
    <>
      <div className="chart-container entity-overview-tile">
        Entity overview tile for&nbsp;
        <a href={URI_PREFIX + props.entity}>{props.entity}</a>
      </div>
    </>
  );
}
