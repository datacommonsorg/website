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
import { StatsVarNode } from "../statvar_menu/util";
import _ from "lodash";

const USA_STATE_CHILD_TYPES = ["County"];
const USA_COUNTRY_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];

export const USA_CHILD_PLACE_TYPES = {
  Country: USA_COUNTRY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
};

const URL_PARAM_KEYS = {
  ENCLOSED_PLACE_TYPE: "pt",
  ENCLOSING_PLACE_DCID: "pd",
  ENLCOSING_PLACE_NAME: "pn",
  PER_CAPITA: "pc",
  STAT_VAR_DCID: "sv",
  STAT_VAR_DENOM: "svd",
  STAT_VAR_NAME: "svn",
  STAT_VAR_PATH: "svp",
};

export function applyHashStatVarInfo(params: URLSearchParams): StatVarInfo {
  const dcid = params.get(URL_PARAM_KEYS.STAT_VAR_DCID);
  if (!dcid) {
    return { name: "", perCapita: false, statVar: {} };
  }
  const path = params.get(URL_PARAM_KEYS.STAT_VAR_PATH);
  const denominator = params.get(URL_PARAM_KEYS.STAT_VAR_DENOM);
  const statVarNode: StatsVarNode = {
    [dcid]: {
      denominators: denominator ? [denominator] : [],
      paths: path ? [path.split("-")] : [],
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
  const enclosingPlaceDcid = params.get(URL_PARAM_KEYS.ENCLOSING_PLACE_DCID);
  const enclosingPlaceName = params.get(URL_PARAM_KEYS.ENLCOSING_PLACE_NAME);
  const enclosedPlaceType = params.get(URL_PARAM_KEYS.ENCLOSED_PLACE_TYPE);
  return {
    enclosingPlace: {
      dcid: enclosingPlaceDcid ? enclosingPlaceDcid : "",
      name: enclosingPlaceName ? enclosingPlaceName : "",
    },
    enclosedPlaces: [],
    enclosedPlaceType: enclosedPlaceType ? enclosedPlaceType : "",
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
        ? node.paths[0].join("-")
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
  if (_.isEmpty(placeInfo.enclosingPlace.dcid)) {
    return hash;
  }
  let params = `&${URL_PARAM_KEYS.ENCLOSING_PLACE_DCID}=${placeInfo.enclosingPlace.dcid}&${URL_PARAM_KEYS.ENLCOSING_PLACE_NAME}=${placeInfo.enclosingPlace.name}`;
  if (!_.isEmpty(placeInfo.enclosedPlaceType)) {
    params = `${params}&${URL_PARAM_KEYS.ENCLOSED_PLACE_TYPE}=${placeInfo.enclosedPlaceType}`;
  }
  return hash + params;
}
