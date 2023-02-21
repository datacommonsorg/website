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

import axios from "axios";
import _ from "lodash";

import { GeoJsonData } from "../chart/types";
import {
  NL_LARGE_TILE_CLASS,
  NL_MED_TILE_CLASS,
  NL_NUM_TILES_SHOWN,
  NL_SMALL_TILE_CLASS,
} from "../constants/app/nl_interface_constants";
import { NamedPlace, NamedTypedPlace } from "../shared/types";
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
 * Gets the id for a specific component on a subject page.
 * @param parentId id of the parent component.
 * @param componentIdPrefix prefix for this component's part of the id.
 * @param componentIdx the index of this component within the parent component.
 */
export function getId(
  parentId: string,
  componentIdPrefix: string,
  componentIdx: number
): string {
  return `${parentId}${componentIdPrefix}${componentIdx}`;
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

/**
 * Get promise for geojson data
 * @param selectedPlace the enclosing place to get geojson data for
 * @param placeType the place type to get geojson data for
 * @param parentPlaces parent places of the selected place
 */
export function fetchGeoJsonData(
  selectedPlace: NamedTypedPlace,
  placeType: string,
  parentPlaces?: NamedPlace[]
): Promise<GeoJsonData> {
  let enclosingPlace = selectedPlace.dcid;
  let enclosedPlaceType = placeType;
  if (
    !enclosedPlaceType &&
    !_.isEmpty(parentPlaces) &&
    !_.isEmpty(selectedPlace.types)
  ) {
    // set enclosing place to be the parent place and the enclosed place type to
    // be the place type of the selected place.
    enclosingPlace = parentPlaces[0].dcid;
    enclosedPlaceType = selectedPlace.types[0];
  }
  return axios
    .get<GeoJsonData>("/api/choropleth/geojson", {
      params: {
        placeDcid: enclosingPlace,
        placeType: enclosedPlaceType,
      },
    })
    .then((resp) => resp.data as GeoJsonData)
    .catch(() => {
      return {
        type: "FeatureCollection",
        features: [],
        properties: {
          current_geo: enclosingPlace,
        },
      };
    });
}
