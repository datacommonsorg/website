/**
 * Copyright 2020 Google LLC
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
import { getUrlVars, setSearchParam } from "./dc";
/**
 * add or delete statvars from url
 *
 * @param {string} dcid of statvar
 * @param {boolean} add = True, delete = False
 * @return void
 */
function updateUrlStatsVar(statvar, shouldAdd) {
  let vars = getUrlVars();
  let svList = [];
  if ("statsvar" in vars) {
    svList = vars["statsvar"].split("__");
  }
  if (shouldAdd) {
    if (!svList.includes(statvar)) {
      svList.push(statvar);
    }
  } else {
    if (svList.includes(statvar)) {
      svList.splice(svList.indexOf(statvar), 1);
    }
  }
  if (svList.length === 0) {
    delete vars["statsvar"];
  } else {
    vars["statsvar"] = svList.join("__");
  }
  setSearchParam(vars);
}

/**
 * add or delete place from url
 *
 * @param {string} dcid of place
 * @param {boolean} add = True, delete = False
 * @return {boolean} if added/deleted = True, if did nothing = False
 */
function updateUrlPlace(place, shouldAdd) {
  let vars = getUrlVars();
  let placeList = [];
  let changed = false;
  if ("place" in vars) {
    placeList = vars["place"].split(",");
  }
  if (shouldAdd) {
    if (!placeList.includes(place)) {
      placeList.push(place);
      changed = true;
    }
  } else {
    if (placeList.includes(place)) {
      placeList.splice(placeList.indexOf(place), 1);
      changed = true;
    }
  }
  if (placeList.length === 0) {
    delete vars["place"];
  } else {
    vars["place"] = placeList.join(",");
  }
  setSearchParam(vars);
  return changed;
}

/**
 * parse the paths of statvars from url
 *
 * @return {[string[][],string[]]} the list of paths of statvars from url
 */
function parseStatVarPath() {
  let vars = getUrlVars();
  let svList = [];
  let statvarPath = [];
  let statvarIds = [];
  if ("statsvar" in vars) {
    svList = vars["statsvar"].split("__");
    for (let idx = 0; idx < svList.length; idx++) {
      statvarIds.push(svList[idx].split(",")[0]);
      statvarPath.push(svList[idx].split(",").slice(1));
    }
  }
  return [statvarPath, statvarIds];
}

/**
 * Get the place names from place ids in the url
 *
 * @return promise
 */
function parsePlace() {
  let vars = getUrlVars();
  if ("place" in vars) {
    return vars["place"].split(",");
  } else {
    return [];
  }
}

function getPlaceNames(dcids) {
  let url = "/api/place/name?";
  let urls = [];
  for (const place of dcids) {
    urls.push(`dcid=${place}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

function getStatsVarInfo(dcids) {
  let url = "/api/stats/stats-var-property?";
  let urls = [];
  for (const dcid of dcids) {
    urls.push(`dcid=${dcid}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

export {
  updateUrlStatsVar,
  updateUrlPlace,
  parseStatVarPath,
  parsePlace,
  getStatsVarInfo,
  getPlaceNames,
};
