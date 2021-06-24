/**
 * Copyright 2021 Google LLC
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
 * Utility functions shared across different components of map explorer.
 */

import { StatVarInfo, PlaceInfo } from "./context";
import { StatVarNode } from "../statvar_menu/util";
import _ from "lodash";

const USA_STATE_CHILD_TYPES = ["County"];
const USA_COUNTRY_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];

export const USA_CHILD_PLACE_TYPES = {
  Country: USA_COUNTRY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
  County: ["County"],
};

const URL_PARAM_VALUE_SEPARATOR = "-";

const URL_PARAM_KEYS = {
  SELECTED_PLACE_DCID: "pd",
  SELECTED_PLACE_NAME: "pn",
  SELECTED_PLACE_TYPES: "pt",
  ENCLOSED_PLACE_TYPE: "ept",
  PER_CAPITA: "pc",
  STAT_VAR_DCID: "sv",
  STAT_VAR_DENOM: "svd",
  STAT_VAR_NAME: "svn",
  STAT_VAR_PATH: "svp",
};

export const MAP_REDIRECT_PREFIX = "/tools/map";

export function applyHashStatVarInfo(params: URLSearchParams): StatVarInfo {
  const dcid = params.get(URL_PARAM_KEYS.STAT_VAR_DCID);
  if (!dcid) {
    return { name: "", perCapita: false, statVar: {} };
  }
  const path = params.get(URL_PARAM_KEYS.STAT_VAR_PATH);
  const denominator = params.get(URL_PARAM_KEYS.STAT_VAR_DENOM);
  const statVarNode: StatVarNode = {
    [dcid]: {
      denominators: denominator ? [denominator] : [],
      paths: path ? [path.split(URL_PARAM_VALUE_SEPARATOR)] : [],
    },
  };
  const statVarName = params.get(URL_PARAM_KEYS.STAT_VAR_NAME);
  const perCapita = params.get(URL_PARAM_KEYS.PER_CAPITA);
  return {
    name: statVarName ? statVarName : dcid,
    perCapita: perCapita && perCapita === "1" ? true : false,
    statVar: statVarNode,
  };
}

export function applyHashPlaceInfo(params: URLSearchParams): PlaceInfo {
  const selectedPlaceDcid = params.get(URL_PARAM_KEYS.SELECTED_PLACE_DCID);
  const selectedPlaceName = params.get(URL_PARAM_KEYS.SELECTED_PLACE_NAME);
  const selectedPlaceTypes = params.get(URL_PARAM_KEYS.SELECTED_PLACE_TYPES);
  const enclosedPlaceType = params.get(URL_PARAM_KEYS.ENCLOSED_PLACE_TYPE);
  return {
    selectedPlace: {
      dcid: selectedPlaceDcid ? selectedPlaceDcid : "",
      name: selectedPlaceName ? selectedPlaceName : "",
      types: selectedPlaceTypes
        ? selectedPlaceTypes.split(URL_PARAM_VALUE_SEPARATOR)
        : [],
    },
    enclosingPlace: {
      dcid: "",
      name: "",
    },
    enclosedPlaces: [],
    enclosedPlaceType: enclosedPlaceType ? enclosedPlaceType : "",
    parentPlaces: null,
  };
}

export function updateHashStatVarInfo(
  hash: string,
  statVarInfo: StatVarInfo
): string {
  if (_.isEmpty(statVarInfo.statVar)) {
    return hash;
  }
  const statVarDcid = _.findKey(statVarInfo.statVar);
  if (statVarDcid) {
    const node = statVarInfo.statVar[statVarDcid];
    const paramMapping = {
      [URL_PARAM_KEYS.STAT_VAR_DCID]: statVarDcid,
      [URL_PARAM_KEYS.STAT_VAR_PATH]: !_.isEmpty(node.paths)
        ? node.paths[0].join(URL_PARAM_VALUE_SEPARATOR)
        : "",
      [URL_PARAM_KEYS.STAT_VAR_DENOM]: !_.isEmpty(node.denominators)
        ? node.denominators[0]
        : "",
      [URL_PARAM_KEYS.STAT_VAR_NAME]: statVarInfo.name,
      [URL_PARAM_KEYS.PER_CAPITA]: statVarInfo.perCapita ? "1" : "0",
    };
    let param = "";
    for (const paramKey in paramMapping) {
      param += `&${paramKey}=${paramMapping[paramKey]}`;
    }
    return hash + param;
  }
  return hash;
}

export function updateHashPlaceInfo(
  hash: string,
  placeInfo: PlaceInfo
): string {
  if (_.isEmpty(placeInfo.selectedPlace.dcid)) {
    return hash;
  }
  const selectedPlaceTypes = !_.isEmpty(placeInfo.selectedPlace.types)
    ? placeInfo.selectedPlace.types.join(URL_PARAM_VALUE_SEPARATOR)
    : "";
  let params =
    `&${URL_PARAM_KEYS.SELECTED_PLACE_DCID}=${placeInfo.selectedPlace.dcid}` +
    `&${URL_PARAM_KEYS.SELECTED_PLACE_NAME}=${placeInfo.selectedPlace.name}` +
    `&${URL_PARAM_KEYS.SELECTED_PLACE_TYPES}=${selectedPlaceTypes}`;
  if (!_.isEmpty(placeInfo.enclosedPlaceType)) {
    params = `${params}&${URL_PARAM_KEYS.ENCLOSED_PLACE_TYPE}=${placeInfo.enclosedPlaceType}`;
  }
  return hash + params;
}
