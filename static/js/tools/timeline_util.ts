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
  statsvar: string;
  place: string;
  pc: string;
}

interface UrlParam {
  pc?: boolean;
  place?: { place: string, shouldAdd: boolean };
  svPath?: { statsvar: string, shouldAdd: boolean };
  svDelete?: string;
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
    // set default statsvar when place is not empty
    else if (!vars.hasOwnProperty("statsvar")) {
      vars.statsvar =
        "Count_Person" + SEP + "Demographics" + SEP + "Population";
    }
  }
  // update statsvar with Path
  if ("svPath" in param) {
    const statvarUrl = encodeURI(param.svPath.statsvar);
    let svList = [];
    if ("statsvar" in vars) {
      svList = vars.statsvar.split("__");
    }
    if (param.svPath.shouldAdd && !svList.includes(statvarUrl)) {
      svList.push(statvarUrl);
    } else if (!param.svPath.shouldAdd && svList.includes(statvarUrl)) {
      svList.splice(svList.indexOf(statvarUrl), 1);
    }
    vars.statsvar = svList.join("__");
    if (vars.statsvar === "") {
      delete vars.statsvar;
    }
  }
  // delete statsvar with statsvarId
  if ("svDelete" in param) {
    let svList = [];
    if ("statsvar" in vars) {
      svList = vars.statsvar.split("__");
    }
    for (const sv of svList) {
      if (sv.split(SEP)[0] === param.svDelete) {
        svList.splice(svList.indexOf(sv), 1);
      }
    }
    vars.statsvar = svList.join("__");
    if (vars.statsvar === "") {
      delete vars.statsvar;
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

  let svList = [];
  const statsvarPaths = [];
  const statsvarIds = [];
  if ("statsvar" in vars) {
    svList = vars.statsvar.split("__");
    for (const statvar of svList) {
      const sv = decodeURI(statvar);
      statsvarIds.push(sv.split(SEP)[0]);
      statsvarPaths.push(sv.split(SEP).slice(1));
    }
  }

  return { "svPath": statsvarPaths, "svId": statsvarIds, "placeId": placeIds, "pc": pc }
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
  updateUrl,
  parseUrl,
  getStatsVarInfo,
  getPlaceNames,
  getStatsVar,
};
