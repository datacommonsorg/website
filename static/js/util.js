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
import { getUrlVars, setSearchParam } from "./dc";
import axios from "axios";

const pako = require("pako");

const POPULATION = "StatisticalPopulation";
const OBSERVATION = "Observation";
const COMPARATIVE_OBSERVATION = "ComparativeObservation";

const MAX_CARD_HEIGHT = 600;

const /** !Array<string> */ STATS = [
    "measuredValue",
    "growthRate",
    "meanValue",
    "medianValue",
    "sumValue",
    "minValue",
    "maxValue",
    "stdDeviationValue",
    "percentile10",
    "percentile25",
    "percentile75",
    "percentile90",
  ];

const /** !Array<string> */ OBS_KEYS = [
    "observationPeriod",
    "measurementMethod",
    "measurementQualifier",
    "measurementDenominator",
    "scalingFactor",
  ];

const NUMBER_OF_CHARTS_PER_ROW = 3;

const /** !Array<string> */ PROD_HOST = [
    "browser.datacommons.org",
    "datcom-browser-prod.appspot.com",
  ];

const /** !Array<string> */ STAGING_HOST = [
    "staging.datacommons.org",
    "datcom-browser-staging.appspot.com",
  ];

const API_DATA = {
  prod: {
    root: "https://api.datacommons.org",
    key: "AIzaSyCJXDc2HxXL3u76PqQfYXuT1oGB-f4uC1I",
  },
  staging: {
    root: "https://datacommons.endpoints.datcom-mixer-staging.cloud.goog",
    key: "AIzaSyDffCx9SDfXDJ-lZdsCsYO4296UOH25oz8",
  },
};

/**
 * Return true is browser environment is production.
 * @return {boolean} Whether browser is in prod environment.
 */
function isBrowserInProdEnv() {
  if (PROD_HOST.includes(window.location.host)) return true;
  if (STAGING_HOST.includes(window.location.host)) return false;

  console.log("Unknown host: " + window.location.host + ", treat as staging.");
  return false;
}

/**
 * Return API root based on whether browser in prod environment.
 * @return {string} API root.
 */
function getApiRoot() {
  return isBrowserInProdEnv() ? API_DATA.prod.root : API_DATA.staging.root;
}

/**
 * Return API key based on whether browser in prod environment.
 * @return {string} API key.
 */
function getApiKey() {
  return isBrowserInProdEnv() ? API_DATA.prod.key : API_DATA.staging.key;
}

/**
 * Get the stats string.
 *
 * This is to get the readable string to view in UI. Below is a few cases:
 *
 * "measuredValue" => ""
 * "growthRate" => "growthRate"
 * "xxxValue" => "xxx"   (xxx is "mean", "max", etc...)
 *
 * @param {!Object<string, string>} obs An observation object.
 * @param {boolean} richTitle Whether to have rich title for the stats string.
 *
 * @return {string}
 */
function getStatsString(obs, richTitle) {
  // TODO(b/148291506): Add unittest for this.
  let statsStr = "";
  if (!("measuredValue" in obs)) {
    for (const stat of STATS) {
      if (stat in obs) {
        statsStr = `(${stat.replace("Value", "")})`;
      }
    }
  }
  if (richTitle) {
    if ("measurementMethod" in obs) {
      statsStr += ` (${obs["measurementMethod"]})`;
    }
  }
  return statsStr;
}

/**
 * Checks whether the type is Population.
 * @param {string} type The type of the node.
 * @return {boolean}
 */
function isPopulation(type) {
  return type === POPULATION;
}

/**
 * Checks whether the type is Observation.
 * @param {string} type The type of the node.
 * @return {boolean}
 */
function isObservation(type) {
  return type === OBSERVATION || isComparativeObservation(type);
}

/**
 * Checks whether the type is ComparativeObservation.
 * @param {string} type The type of the node.
 * @return {boolean}
 */
function isComparativeObservation(type) {
  return type === COMPARATIVE_OBSERVATION;
}

/**
 * Append "More" hint to parent if its height is over specified height.
 * @param {!Element} parent Parent element to append to.
 * @param {number} height Max height for the parent elment.
 */
function appendMoreIfNecessary(parent, height) {
  if (parent.offsetHeight >= height) {
    const moreEl = document.createElement("div");
    moreEl.textContent = "More";
    moreEl.setAttribute("class", "more");
    parent.appendChild(moreEl);
    parent.style.maxHeight = `${height}px`;
    moreEl.addEventListener("click", () => {
      parent.style.overflow = "auto";
      setElementShown(moreEl, false);
      // Set to arbitrary large max-height to show full content.
      parent.style.maxHeight = "50000px";
    });
  }
}

function setElementShown(el, isShown) {
  el.style.display = isShown ? "" : "none";
}

/**
 * Append show more hint to all card elements.
 */
function appendMoreToAll() {
  const cardEls = document.getElementsByClassName("shadow-card");
  for (let i = 0; i < cardEls.length; i++) {
    appendMoreIfNecessary(cardEls[i], MAX_CARD_HEIGHT);
  }
}

/**
 * Send request to DataCommons REST api endpoint and get result payload.
 *
 * @param {string} reqUrl The request url with parameters.
 * @param {boolean} isZip Whether to unzip the payload.
 * @param {boolean=} isGet If it is a 'GET' request.
 * @param {!Object=} data Request data.
 *
 * @return {*}
 */
function sendRequest(reqUrl, isZip, isGet = true, data = {}) {
  const request = new XMLHttpRequest();
  let jsonString = null;
  let api_key = getApiKey();
  if (isGet) {
    request.open("GET", getApiRoot() + reqUrl + `&key=${api_key}`, false);
  } else {
    request.open("POST", getApiRoot() + reqUrl + `?key=${api_key}`, false);
  }
  request.send(JSON.stringify(data));
  if (request.status === 200) {
    if (isZip) {
      let s = JSON.parse(request.responseText)["payload"];
      if (s) {
        jsonString = unzip(s);
      } else {
        return null;
      }
    } else {
      jsonString = JSON.parse(request.responseText)["payload"];
    }
    return JSON.parse(jsonString);
  }
  return null;
}

/**
 * Unzip a compressed encoded string.
 *
 * @param {string} s
 * @return {string}
 */
function unzip(s) {
  const binData = atob(s);
  const charData = binData.split("").map((x) => x.charCodeAt(0));
  const byteData = new Uint8Array(charData);

  /**
   * The js_library target can't infer the signature of inflate() for some
   * weird reason: "[JSC_NOT_FUNCTION_TYPE] * expressions are not callable"
   * @suppress {checkTypes}
   */
  const inflateData = pako.inflate(byteData, {});
  return new TextDecoder("utf-8").decode(inflateData);
}

/**
 * Get map bounds (left, right, up, down) and coordinate sequence set of KML
 * coordinates of a place.
 *
 * @param {string} dcid Place DCID.
 *
 * @return {!Object} Map bounds and coordinate sequence set.
 */
function getMapInfo(dcid) {
  // TODO(wsws/boxu): This function only works for the US, which doesn't have
  // the issue of crossing +-180 longitude and +-90 latitude. If using this
  // function for places with those complicated situations, need to adjust this
  // function accordingly.
  let left = 180;
  let right = -180;
  let up = -90;
  let down = 90;
  let coordinateSequenceSet = [];

  const kmlCoordinatesRes = sendRequest(
    `/node/property-values?dcids=${dcid}&property=kmlCoordinates`,
    false
  );
  const kmlCoordinates = kmlCoordinatesRes[dcid]["out"][0]["value"];

  const coordinateGroups = kmlCoordinates.split("</coordinates><coordinates>");
  for (let coordinateGroup of coordinateGroups) {
    const coordinates = coordinateGroup
      .replace("<coordinates>", "")
      .replace("</coordinates>", "")
      .split(" ");
    let coordinateSequence = [];
    for (let coordinate of coordinates) {
      const v = coordinate.split(",");
      const x = parseFloat(v[0]);
      const y = parseFloat(v[1]);

      left = Math.min(left, x);
      right = Math.max(right, x);
      down = Math.min(down, y);
      up = Math.max(up, y);

      coordinateSequence.push({ lat: y, lng: x });
    }
    coordinateSequenceSet.push(coordinateSequence);
  }

  const x_spread = right - left;
  const y_spread = up - down;
  const margin = 0.02;

  return {
    left: left - margin * x_spread,
    right: right + margin * x_spread,
    up: up + margin * y_spread,
    down: down - margin * y_spread,
    coordinateSequenceSet: coordinateSequenceSet,
  };
}

/**
 * Format and expand chart group to include escaped URLs. If the length of the
 * input array is not a multiple of 3, append empty strings to make it a
 * multiple of 3.
 *
 * @param {?Array} chartGroup A list of chart URLs.
 *
 * @return {!Object} A list of original and escaped chart URLs.
 */
function formatChartGroup(chartGroup) {
  let res = [];
  for (let idx = 0; idx < chartGroup.length; idx++) {
    const url = getLineChartUrl(chartGroup[idx]);
    res.push([url, url.split("&").join("%26")]);
  }
  if (chartGroup.length % NUMBER_OF_CHARTS_PER_ROW) {
    for (
      let idx = 0;
      idx <
      NUMBER_OF_CHARTS_PER_ROW - (chartGroup.length % NUMBER_OF_CHARTS_PER_ROW);
      idx++
    ) {
      res.push(["", ""]);
    }
  }
  return res;
}

/**
 * Format and expand charts by category to include escaped URLs.
 *
 * @param {?Array} chartCategories A list of categories of chart URLs.
 *
 * @return {!Object} A list of categories of original and escaped chart URLs.
 */
function formatChartCategories(chartCategories) {
  let res = [];
  for (let idx = 0; idx < chartCategories.length; idx++) {
    res.push({
      category: chartCategories[idx]["category"],
      urls: formatChartGroup(chartCategories[idx]["groups"]),
    });
  }
  return res;
}

/**
 * Get out arcs map from triples.
 *
 * @param {*} triples Input triples.
 * @param {string} dcid DCID.
 *
 * @return {!Object} Out arcs map.
 */
function getOutArcsMap(triples, dcid) {
  let outArcs = triples[dcid].filter((t) => t["subjectId"] == dcid);

  let outArcsMap = {};
  for (let t of outArcs) {
    if (!(t["predicate"] in outArcsMap)) {
      outArcsMap[t["predicate"]] = [];
    }
    if ("objectId" in t) {
      outArcsMap[t["predicate"]].push([t["objectId"], t["objectName"]]);
    } else if ("objectValue" in t) {
      outArcsMap[t["predicate"]].push([t["objectValue"]]);
    }
  }

  return outArcsMap;
}

/**
 * Get contained in place ([dcid, name]) from out arcs map.
 * If there are multiple containedInPlace entities, prefer 'State'.
 *
 * @param {!Object} outArcsMap Out arcs map.
 *
 * @return {!Array} [dcid, name].
 */
function getContainedInPlace(outArcsMap) {
  if (!("containedInPlace" in outArcsMap)) {
    return ["", ""];
  }

  const containedInPlaces = outArcsMap["containedInPlace"];

  if (containedInPlaces.length == 1) {
    return containedInPlaces[0];
  }

  let res = containedInPlaces[0];
  for (let p of containedInPlaces) {
    if (p[0].length == "geoId/00".length) {
      res = p;
      break;
    }
  }
  return res;
}

/**
 * Get type from triples.
 *
 * @param {*} triples Input triples.
 * @param {string} dcid DCID.
 *
 * @return {string} Type.
 */
function getType(triples, dcid) {
  let type = "";
  if (dcid.startsWith("dc/p/")) {
    type = POPULATION;
  } else if (dcid.startsWith("dc/o/")) {
    type = OBSERVATION;
  } else {
    let ts = triples[dcid].filter(
      (t) => t["subjectId"] == dcid && t["predicate"] == "typeOf"
    );
    if (ts.length > 0) {
      if (ts.length > 1) {
        let types = {};
        for (let t of ts) {
          types[t["objectId"]] = "";
        }
        for (let targetType of ["State", "County", "City"]) {
          if (targetType in types) {
            type = targetType;
            break;
          }
        }
      }
      if (type == "") {
        type = ts[0]["objectId"];
      }
    }
  }
  return type;
}

/**
 * Get line chart URL from a set of arguments.
 *
 * @param {!Object} argMap A set of arguments.
 *
 * @return {string} The line chart URL.
 */
function getLineChartUrl(argMap) {
  if (!("placeDcid" in argMap)) return "";

  let url = "/line?v2&mid1=" + argMap["placeDcid"];
  url += "&popt1=" + argMap["popType"];
  url += "&mprop1=" + argMap["measuredProp"];

  if ("pvs" in argMap) {
    for (let p in argMap["pvs"]) {
      url += "&cpv1=" + p + "," + argMap["pvs"][p];
    }
  }

  url += "&st1=" + argMap["statType"];

  if ("measurementMethod" in argMap) {
    url += "&mmethod1=" + argMap["measurementMethod"];
  }

  if ("observationPeriod" in argMap) {
    url += "&op1=" + argMap["observationPeriod"];
  }

  url += "&title=" + argMap["title"].replace(" ", "%20");
  url += "&w=300&h=200";

  return url;
}

function isSetsEqual(a, b) {
  return a.size === b.size && [...a].every((v) => b.has(v));
}

function randDomId() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(2, 10);
}

/**
 * add or delete statvars from url
 *
 * @param {string} dcid of statvar
 * @param {boolean} add = True, delete = False
 * @return void
 */
function updateUrlStatsVar(statvar, should_add) {
  let vars = getUrlVars();
  let svList = [];
  if ("statsvar" in vars) {
    svList = vars["statsvar"].split("__");
  }
  if (should_add) {
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
 * add or delete statvars from url
 *
 * @param {string} dcid of place
 * @param {boolean} add = True, delete = False
 * @return {boolean} if added/deleted = True, if did nothing = False
 */
function updateUrlPlace(place, should_add) {
  let vars = getUrlVars();
  let placeList = [];
  let changed = false;
  if ("place" in vars) {
    placeList = vars["place"].split(",");
  }
  if (should_add) {
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
 * @return {string[][]} the list of paths of statvars from url
 */
function parseStatVarPath() {
  let vars = getUrlVars();
  let svList = [];
  let statvarPath = [];
  if ("statsvar" in vars) {
    svList = vars["statsvar"].split("__");
    for (let idx = 0; idx < svList.length; idx++) {
      statvarPath.push(svList[idx].split(",").slice(1));
    }
  }
  return statvarPath;
}


function parsePlace(){
  let vars = getUrlVars();
  let placeList = [];
  if ("place" in vars) {
    let places = vars["place"].split(",");
    for (const place of places ) {
      let placeName = place;
      axios
      .get(`/api/place/name?dcid=${place}`)
      .then((resp) => {
        placeName=resp.data[place];
      })
      .catch((error) =>{
        console.log(error)
      })
      placeList.push([place, placeName])
  }
}
  return placeList;
}


export {
  STATS,
  OBS_KEYS,
  POPULATION,
  OBSERVATION,
  COMPARATIVE_OBSERVATION,
  MAX_CARD_HEIGHT,
  NUMBER_OF_CHARTS_PER_ROW,
  isPopulation,
  isObservation,
  isComparativeObservation,
  appendMoreIfNecessary,
  appendMoreToAll,
  sendRequest,
  getMapInfo,
  getStatsString,
  formatChartGroup,
  formatChartCategories,
  getOutArcsMap,
  getContainedInPlace,
  getType,
  getLineChartUrl,
  getApiKey,
  getApiRoot,
  isSetsEqual,
  unzip,
  setElementShown,
  randDomId,
  updateUrlStatsVar,
  updateUrlPlace,
  parseStatVarPath,
  parsePlace,
};
