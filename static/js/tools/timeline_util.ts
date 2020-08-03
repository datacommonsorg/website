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
import statsVarPathMap from "../../data/statsvar_path.json";

interface VarUrl {
  statsVar: string;
  place: string;
  pc: string;
}

interface UrlParam {
  pc?: boolean;
  place?: { place: string; shouldAdd: boolean };
  statsVar?: { statsVar: string; shouldAdd: boolean };
}

interface UrlObject {
  statsVarPath: number[][];
  statsVarId: string[];
  placeId: string[];
  pc: boolean;
}

function updateUrl(param: UrlParam): void {
  const vars = getUrlVars() as VarUrl;
  // update per Capita state
  if ("pc" in param) {
    vars.pc = param.pc ? "1" : "0";
  }
  // update places
  if ("place" in param) {
    let placeList = [];
    if ("place" in vars) {
      placeList = vars.place.split(",");
    }
    if (param.place.shouldAdd && !placeList.includes(param.place.place)) {
      placeList.push(param.place.place);
    } else if (
      !param.place.shouldAdd &&
      placeList.includes(param.place.place)
    ) {
      placeList.splice(placeList.indexOf(param.place.place), 1);
    }
    vars.place = placeList.join(",");
    if (vars.place === "") {
      delete vars.place;
    } else if (!vars.statsVar) {
      // set default statsVar when place is not empty
      vars.statsVar = "Count_Person";
    }
  }
  // update statsVar
  if ("statsVar" in param) {
    // support add/delete multiple statsVars at the same time
    const statsVars = param.statsVar.statsVar.split("__");
    let statsVarList = new Set<string>();
    if ("statsVar" in vars) {
      statsVarList = new Set(vars.statsVar.split("__"));
    }
    for (const statsVarToUpdate of statsVars) {
      if (statsVarToUpdate.split(",").length !== 1) {
        // update statsVar with path
        if (param.statsVar.shouldAdd) {
          statsVarList = addStatsVarWithPath(statsVarList, statsVarToUpdate);
        } else {
          statsVarList = deleteStatsVarWithPath(statsVarList, statsVarToUpdate);
        }
      } else {
        // update statsVar with name only
        if (param.statsVar.shouldAdd) {
          statsVarList = addStatsVarWithName(statsVarList, statsVarToUpdate);
        } else {
          statsVarList = deleteStatsVarWithName(statsVarList, statsVarToUpdate);
        }
      }
    }
    vars.statsVar = Array.from(statsVarList).join("__");
    if (vars.statsVar === "") {
      delete vars.statsVar;
    }
  }
  setSearchParam(vars);
}

function addStatsVarWithPath(statsVarList: Set<string>, statsVarToAdd: string) {
  statsVarList.delete(statsVarToAdd.split(",")[0]);
  statsVarList.add(statsVarToAdd);
  return statsVarList;
}

function deleteStatsVarWithPath(
  statsVarList: Set<string>,
  statsVarToDelete: string
) {
  if (statsVarList.has(statsVarToDelete)) {
    statsVarList.delete(statsVarToDelete);
  } else if (statsVarList.has(statsVarToDelete.split(",")[0])) {
    statsVarList.delete(statsVarToDelete.split(",")[0]);
  }
  return statsVarList;
}

function addStatsVarWithName(statsVarList: Set<string>, statsVarToAdd: string) {
  const statsVarNames = {}; // {statsVarName: string of statsVar in url, with path or not}
  for (const statsVar of Array.from(statsVarList)) {
    statsVarNames[statsVar.split(",")[0]] = statsVar;
  }
  if (!(statsVarToAdd in statsVarNames)) {
    statsVarList.add(statsVarToAdd);
  }
  return statsVarList;
}

function deleteStatsVarWithName(
  statsVarList: Set<string>,
  statsVarToDelete: string
) {
  const statsVarNames = {}; // {statsVarName: string of statsVar in url, with path or not}
  for (const statsVar of Array.from(statsVarList)) {
    statsVarNames[statsVar.split(",")[0]] = statsVar;
  }
  if (statsVarToDelete in statsVarNames) {
    statsVarList.delete(statsVarNames[statsVarToDelete]);
  }
  return statsVarList;
}

// set default statsVar when place is not empty
function parseUrl(): UrlObject {
  const vars = getUrlVars() as VarUrl;
  let pc: boolean;
  if ("pc" in vars) {
    pc = vars.pc === "1";
  } else {
    pc = false;
  }

  let placeIds: string[];
  if ("place" in vars) {
    placeIds = vars.place.split(",");
  } else {
    placeIds = [];
  }

  let statsVarList = [];
  const statsVarPaths = [];
  const statsVarIds = [];
  if ("statsVar" in vars) {
    statsVarList = vars.statsVar.split("__");
    for (const statsVar of statsVarList) {
      const statsVarSplit = statsVar.split(",");
      if (statsVarSplit.length === 1) {
        statsVarIds.push(statsVar);
        if (statsVar in statsVarPathMap) {
          // ignore invalid statsVar Id
          statsVarPaths.push(statsVarPathMap[statsVar]);
        }
      } else {
        statsVarIds.push(statsVarSplit[0]);
        const path = statsVarSplit.slice(1).map((item) => {
          return parseInt(item, 10);
        });
        statsVarPaths.push(path);
      }
    }
  }
  return {
    statsVarPath: statsVarPaths,
    statsVarId: statsVarIds,
    placeId: placeIds,
    pc,
  };
}

function getPlaceNames(dcids: string[]): Promise<{ [key: string]: string }> {
  let url = "/api/place/name?";
  const urls = [];
  for (const place of dcids) {
    urls.push(`dcid=${place}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

function getStatsVarInfo(
  dcids: string[]
): Promise<Record<string, StatsVarInfo>> {
  let url = "/api/stats/stats-var-property?";
  const urls = [];
  for (const dcid of dcids) {
    urls.push(`dcid=${dcid}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

function getStatsVar(dcids: string[]): Promise<Set<string>> {
  if (dcids.length === 0) {
    return Promise.resolve(new Set<string>());
  }
  const promises = [];
  // ToDo: read the set of statsVars available for multiple dcids from server side
  for (const dcid of dcids) {
    promises.push(
      axios.get("/api/place/statsvars/" + dcid).then((resp) => {
        return resp.data;
      })
    );
  }
  return Promise.all(promises).then((values) => {
    let statsVars = new Set();
    for (const value of values) {
      statsVars = new Set([...Array.from(statsVars), ...value]);
    }
    return statsVars;
  }) as Promise<Set<string>>;
}

function saveToFile(filename: string, csv: string): void {
  if (!csv.match(/^data:text\/csv/i)) {
    csv = "data:text/csv;charset=utf-8," + csv;
  }
  const data = encodeURI(csv);
  const link = document.createElement("a");
  link.setAttribute("href", data);
  link.setAttribute("download", filename);
  link.click();
}

interface StatsVarInfo {
  md: string;
  mprop: string;
  pt: string;
  pvs: { [key: string]: string };
  title: string;
}

/*
 * Parse url hash into VarUrl object that contains statsvar, place and perCapita
 * information
 */
function getUrlVars(): VarUrl {
  const vars = {};
  window.location.hash.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m, key, value) => {
    vars[key] = value;
    return value;
  });
  return vars as VarUrl;
}

function setSearchParam(vars: VarUrl) {
  let newHash = "#";
  for (const k in vars) {
    newHash += "&" + k + "=" + vars[k];
  }
  window.location.hash = newHash;
}

export {
  StatsVarInfo,
  updateUrl,
  parseUrl,
  getStatsVarInfo,
  getPlaceNames,
  getStatsVar,
  saveToFile,
};
