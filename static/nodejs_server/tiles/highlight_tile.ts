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
 * Functions for getting results for a highlight tile
 */

import _ from "lodash";

import {
  fetchData,
  getDescription,
  HighlightData,
  HighlightTilePropType,
} from "../../js/components/tiles/highlight_tile";
import { NamedTypedPlace, StatVarSpec } from "../../js/shared/types";
import { TileConfig } from "../../js/types/subject_page_proto_types";
import { TileResult } from "../types";
import { getSources } from "./utils";

function getTileProp(
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  statVarSpec: StatVarSpec,
  apiRoot: string
): HighlightTilePropType {
  return {
    apiRoot,
    description: tileConfig.description,
    place,
    statVarSpec,
  };
}

function getDataCsv(
  props: HighlightTilePropType,
  highlightData: HighlightData
): string {
  const header = `variable,place,value`;
  const data = `${props.statVarSpec.statVar},${props.place.name},${highlightData.value}`;
  return `${header}\r\n${data}`;
}

/**
 * Gets the Tile Result for a highlight tile
 * @param id id of the chart
 * @param tileConfig tile config to get result for
 * @param place place to show the tile for
 * @param statVarSpec stat var spec to show in the tile
 * @param apiRoot API root to use to fetch data
 */
export async function getHighlightTileResult(
  id: string,
  tileConfig: TileConfig,
  place: NamedTypedPlace,
  statVarSpec: StatVarSpec,
  apiRoot: string
): Promise<TileResult> {
  const tileProp = getTileProp(tileConfig, place, statVarSpec, apiRoot);
  try {
    const highlightData = await fetchData(tileProp);
    const result: TileResult = {
      data_csv: getDataCsv(tileProp, highlightData),
      highlight: {
        date: highlightData.date,
        value: highlightData.value,
      },
      places: [place.dcid],
      srcs: getSources(highlightData.sources),
      title: getDescription(highlightData, tileProp),
      type: "HIGHLIGHT",
      unit: highlightData.unitDisplayName,
      vars: [statVarSpec.statVar],
    };
    return result;
  } catch (e) {
    console.log("Failed to get highlight tile result for: " + id);
    return null;
  }
}
