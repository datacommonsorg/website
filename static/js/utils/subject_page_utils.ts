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

import {
  NL_LARGE_TILE_CLASS,
  NL_MED_TILE_CLASS,
  NL_NUM_TILES_SHOWN,
  NL_SMALL_TILE_CLASS,
} from "../constants/app/nl_interface_constants";
import { ColumnConfig } from "../types/subject_page_proto_types";
import { isNlInterface } from "./nl_interface_utils";

/**
 * Util functions used by subject page components.
 */

/**
 * Gets the relative link using the title of a section on the subject page
 * @param title title of the section to get the relative link for
 */
export function getRelLink(title: string) {
  return title.replace(/ /g, "-");
}

/**
 * Gets the minimum tile index that should be hidden.
 */
export function getMinTileIdxToHide(): number {
  if (isNlInterface()) {
    return NL_NUM_TILES_SHOWN;
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Gets the column width to be used for a list of columns in a block.
 * @param columns list of columns in a block
 */
export function getColumnWidth(columns: ColumnConfig[]): string {
  return columns ? `${(100 / columns.length).toFixed(2)}%` : "0";
}

/**
 * Gets a className that should be included in all the tiles in a column.
 * @param column the column to get the className for
 */
export function getColumnTileClassName(column: ColumnConfig): string {
  let tileClassName = "";
  // HACK for NL tile layout. Regularly, tile size should depend on
  // number of columns in config.
  if (isNlInterface()) {
    if (column.tiles.length > 2) {
      tileClassName = NL_SMALL_TILE_CLASS;
    } else {
      tileClassName =
        column.tiles.length === 1 ? NL_LARGE_TILE_CLASS : NL_MED_TILE_CLASS;
    }
  }
  return tileClassName;
}
