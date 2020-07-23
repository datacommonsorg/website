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

/**
 * add or delete statvars from url
 *
 * @param {string} dcid of statvar
 * @param {boolean} add = True, delete = False
 * @return void
 */
interface VarUrl {
  statsvar: string;
  place: string;
}

function updateUrlStatsVar(statvar: string, shouldAdd: boolean) {
  const vars = getUrlVars() as VarUrl;
  const statvarUrl = encodeURI(statvar);
  let statsVarList = [];
  if ("statsvar" in vars) {
    statsVarList = vars.statsvar.split("__");
  }
  if (shouldAdd) {
    if (!statsVarList.includes(statvarUrl)) {
      statsVarList.push(statvarUrl);
    }
  } else {
    if (statsVarList.includes(statvarUrl)) {
      statsVarList.splice(statsVarList.indexOf(statvarUrl), 1);
    }
  }
  if (statsVarList.length === 0) {
    delete vars.statsvar;
  } else {
    vars.statsvar = statsVarList.join("__");
  }
  setSearchParam(vars);
}

/**
 * delete statvars from url without path
 *
 * @param {string} dcid of statvar
 * @return void
 */
function deleteStatsVar(statvar: string) {
  const vars = getUrlVars() as VarUrl;
  let statsVarList = [];
  if ("statsvar" in vars) {
    statsVarList = vars.statsvar.split("__");
  }
  for (const statsVar of statsVarList) {
    if (statsVar.split(SEP)[0] === statvar) {
      statsVarList.splice(statsVarList.indexOf(statsVar), 1);
    }
  }
  if (statsVarList.length === 0) {
    delete vars.statsvar;
  } else {
    vars.statsvar = statsVarList.join("__");
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
function updateUrlPlace(place: string, shouldAdd: boolean) {
  const vars = getUrlVars() as VarUrl;
  let placeList = [];
  let changed = false;
  if ("place" in vars) {
    placeList = vars.place.split(",");
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
    delete vars.place;
  } else {
    if (!vars.hasOwnProperty("statsvar")) {
      vars.statsvar =
        "Count_Person" + SEP + "Demographics" + SEP + "Population";
    }
    vars.place = placeList.join(",");
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
  const vars = getUrlVars() as VarUrl;
  let statsVarList = [];
  const statvarPath = [];
  const statvarIds = [];
  if ("statsvar" in vars) {
    statsVarList = vars.statsvar.split("__");
    for (const statvar of statsVarList) {
      const statsVar = decodeURI(statvar);
      statvarIds.push(statsVar.split(SEP)[0]);
      statvarPath.push(statsVar.split(SEP).slice(1));
    }
  }
  return [statvarPath, statvarIds];
}

/**
 * Get the place names from place ids in the url
 *
 * @return string[] list of place Ids
 */
function parsePlace() {
  const vars = getUrlVars() as VarUrl;
  if ("place" in vars) {
    return vars.place.split(",");
  } else {
    return [];
  }
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
  if(dcids.length === 0) {
  return Promise.resolve(new Set<string>());
}
const promises = [];
// ToDo: read the set of statsvars available for multiple dcids from server side
for (const dcid of dcids) {
  promises.push(
    axios.get("/api/place/statsvars/" + dcid).then((resp) => {
      return resp.data;
    })
  );
}
return Promise.all(promises).then((values) => {
  let statvars = new Set(); // Count_Person not in List ???
  for (const value of values) {
    statvars = new Set([...Array.from(statvars), ...value])
  }
  Object.keys(MAPPING).map((key) => {
    if (statvars.has(MAPPING[key])) {
      statvars.add(key);
    }
  })
  return statvars;
}) as Promise<Set<string>>;
}

export {
  updateUrlStatsVar,
  updateUrlPlace,
  parseStatVarPath,
  parsePlace,
  getStatsVarInfo,
  getPlaceNames,
  deleteStatsVar,
  getStatsVar,
};
