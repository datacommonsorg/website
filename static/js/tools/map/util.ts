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

const USA_CHILD_PLACE_TYPES = {
  Country: USA_COUNTRY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
};

const URLParamKeys = {
  enclosedPlaceType: "pt",
  enclosingPlaceDcid: "pd",
  enclosingPlaceName: "pn",
  perCapita: "pc",
  statVarDcid: "sv",
  statVarDenominator: "svd",
  statVarName: "svn",
  statVarPath: "svp",
};

function applyHashStatVarInfo(params: URLSearchParams): StatVarInfo {
  const dcid = params.get(URLParamKeys.statVarDcid);
  if (!dcid) {
    return { name: "", perCapita: false, statVar: {} };
  }
  const statVarNode: StatsVarNode = {
    [dcid]: {
      denominators: [],
      paths: [],
    },
  };
  const path = params.get(URLParamKeys.statVarPath);
  if (path) {
    statVarNode[dcid].paths = [path.split("-")];
  }
  const denominator = params.get(URLParamKeys.statVarDenominator);
  if (denominator) {
    statVarNode[dcid].denominators = [denominator];
  }
  const statVarName = params.get(URLParamKeys.statVarName);
  const perCapita = params.get(URLParamKeys.perCapita);
  return {
    name: statVarName ? statVarName : dcid,
    perCapita: perCapita && perCapita === "1" ? true : false,
    statVar: statVarNode,
  };
}

function applyHashPlaceInfo(params: URLSearchParams): PlaceInfo {
  const enclosingPlaceDcid = params.get(URLParamKeys.enclosingPlaceDcid);
  const enclosingPlaceName = params.get(URLParamKeys.enclosingPlaceName);
  const enclosedPlaceType = params.get(URLParamKeys.enclosedPlaceType);
  return {
    enclosingPlace: {
      dcid: enclosingPlaceDcid ? enclosingPlaceDcid : "",
      name: enclosingPlaceName ? enclosingPlaceName : "",
    },
    enclosedPlaces: [],
    enclosedPlaceType: enclosedPlaceType ? enclosedPlaceType : "",
  };
}

function updateHashStatVarInfo(hash: string, statVarInfo: StatVarInfo): string {
  if (_.isEmpty(statVarInfo.statVar)) {
    return hash;
  }
  const statVarDcid = _.findKey(statVarInfo.statVar);
  if (statVarDcid) {
    hash = `${hash}&${URLParamKeys.statVarDcid}=${statVarDcid}`;
    const node = statVarInfo.statVar[statVarDcid];
    if (!_.isEmpty(node.paths)) {
      hash = `${hash}&${URLParamKeys.statVarPath}=${node.paths[0].join("-")}`;
    }
    if (!_.isEmpty(node.denominators)) {
      hash = `${hash}&${URLParamKeys.statVarDenominator}=${node.denominators[0]}`;
    }
    if (!_.isEmpty(statVarInfo.name)) {
      hash = `${hash}&${URLParamKeys.statVarName}=${statVarInfo.name}`;
    }
    hash = `${hash}&${URLParamKeys.perCapita}=${
      statVarInfo.perCapita ? "1" : "0"
    }`;
  }
  return hash;
}

function updateHashPlaceInfo(hash: string, placeInfo: PlaceInfo): string {
  if (_.isEmpty(placeInfo.enclosingPlace.dcid)) {
    return hash;
  }
  hash = `${hash}&${URLParamKeys.enclosingPlaceDcid}=${placeInfo.enclosingPlace.dcid}`;
  hash = `${hash}&${URLParamKeys.enclosingPlaceName}=${placeInfo.enclosingPlace.name}`;
  if (!_.isEmpty(placeInfo.enclosedPlaceType)) {
    hash = `${hash}&${URLParamKeys.enclosedPlaceType}=${placeInfo.enclosedPlaceType}`;
  }
  return hash;
}

export {
  applyHashStatVarInfo,
  applyHashPlaceInfo,
  updateHashStatVarInfo,
  updateHashPlaceInfo,
  USA_CHILD_PLACE_TYPES,
};
