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
import { SEP } from "./statsvar_menu";

// Temporary hack before we clean up place stats var cache.
const MAPPING = {
  "Count_Person": "TotalPopulation",
  "Count_Person_Male": "MalePopulation",
  "Count_Person_Female": "FemalePopulation",
  "Count_Person_MarriedAndNotSeparated": "MarriedPopulation",
  "Count_Person_Divorced": "DivorcedPopulation",
  "Count_Person_NeverMarried": "NeverMarriedPopulation",
  "Count_Person_Separated": "SeparatedPopulation",
  "Count_Person_Widowed": "WidowedPopulation",
  "Median_Age_Person": "MedianAge",
  "Median_Income_Person": "MedianIncome",
  "Count_Person_BelowPovertyLevelInThePast12Months": "BelowPovertyLine",
  "Count_HousingUnit": "HousingUnits",
  "Count_Household": "Households",
  "Count_CriminalActivities_CombinedCrime": "TotalCrimes",
  "UnemploymentRate_Person": "UnemploymentRate",
  "CumulativeCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase": "NYTCovid19CumulativeCases",
  "CumulativeCount_MedicalConditionIncident_COVID_19_PatientDeceased": "NYTCovid19CumulativeDeaths",
  "IncrementalCount_MedicalConditionIncident_COVID_19_ConfirmedOrProbableCase": "NYTCovid19IncrementalCases",
  "IncrementalCount_MedicalConditionIncident_COVID_19_PatientDeceased": "NYTCovid19IncrementalDeaths"
}

interface VarUrl {
  statsVar: string;
  place: string;
  pc: string;
}

interface UrlParam {
  pc?: boolean;
  place?: { place: string, shouldAdd: boolean };
  statsVarPath?: { statsVar: string, shouldAdd: boolean };
  statsVarDelete?: string;
}

function updateUrl(param: UrlParam) {
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
    } else if (!param.place.shouldAdd && placeList.includes(param.place.place)) {
      placeList.splice(placeList.indexOf(param.place.place), 1);
    }
    vars.place = placeList.join(",");
    if (vars.place === "") {
      delete vars.place;
    }
    // set default statsVar when place is not empty
    else if (!vars.hasOwnProperty("statsVar")) {
      vars.statsVar =
        "Count_Person" + SEP + "Demographics" + SEP + "Population";
    }
  }
  // update statsVar with Path
  if ("statsVarPath" in param) {
    const statvarPath = param.statsVarPath.statsVar.split(SEP);
    const encodedPath = [];
    for(const node of statvarPath){
      encodedPath.push(encodeURI(node));
    }
    const statsVarUrl = encodedPath.join(SEP);
    let statsVarList = [];
    if ("statsVar" in vars) {
      statsVarList = vars.statsVar.split("__");
    }
    if (param.statsVarPath.shouldAdd && !statsVarList.includes(statsVarUrl)) {
      statsVarList.push(statsVarUrl);
    } else if (!param.statsVarPath.shouldAdd && statsVarList.includes(statsVarUrl)) {
      statsVarList.splice(statsVarList.indexOf(statsVarUrl), 1);
    }
    vars.statsVar = statsVarList.join("__");
    if (vars.statsVar === "") {
      delete vars.statsVar;
    }
  }
  // delete statsvar with statsvarId
  if ("statsVarDelete" in param) {
    let statsVarList = [];
    if ("statsVar" in vars) {
      statsVarList = vars.statsVar.split("__");
    }
    for (const statsVar of statsVarList) {
      if (statsVar.split(SEP)[0] === param.statsVarDelete) {
        statsVarList.splice(statsVarList.indexOf(statsVar), 1);
      }
    }
    vars.statsVar = statsVarList.join("__");
    if (vars.statsVar === "") {
      delete vars.statsVar;
    }
  }

  setSearchParam(vars);
}

function parseUrl() {
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
      const statsVarDecoded = decodeURI(statsVar);
      statsVarIds.push(statsVarDecoded.split(SEP)[0]);
      statsVarPaths.push(statsVarDecoded.split(SEP).slice(1));
    }
  }

  return { "statsVarPath": statsVarPaths, "statsVarId": statsVarIds, "placeId": placeIds, "pc": pc }
}

function getPlaceNames(dcids: string[]) {
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

function getStatsVarInfo(dcids: string[]) {
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


function getStatsVar(dcids: string[]) {
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
    let statsVars = new Set(); // Count_Person not in List ???
    for (const value of values) {
      statsVars = new Set([...Array.from(statsVars), ...value])
    }
    Object.keys(MAPPING).map((key) => {
      if (statsVars.has(MAPPING[key])) {
        statsVars.add(key);
      }
    })
    return statsVars;
  }) as Promise<Set<string>>;
}

export {
  updateUrl,
  parseUrl,
  getStatsVarInfo,
  getPlaceNames,
  getStatsVar,
};
