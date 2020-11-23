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

const pako = require("pako");

const POPULATION = "StatisticalPopulation";
const OBSERVATION = "Observation";
const COMPARATIVE_OBSERVATION = "ComparativeObservation";

const MAX_CARD_HEIGHT = 450;

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

const API_DATA = {
  prod: {
    root: "https://api.datacommons.org",
  },
};

/**
 * Return API root based on whether browser in prod environment.
 * @return {string} API root.
 */
function getApiRoot() {
  return API_DATA.prod.root;
}

/**
 * Return API key based on whether browser in prod environment.
 * @return {string} API key.
 */
function getApiKey() {
  return API_DATA.prod.key;
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
 * Get out arcs map from triples.
 *
 * @param {*} triples Input triples.
 * @param {string} dcid DCID.
 *
 * @return {!Object} Out arcs map.
 */
function getOutArcsMap(triples, dcid) {
  let outArcs = triples.filter((t) => t["subjectId"] == dcid);

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
    let ts = triples.filter(
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
 * Saves csv to filename.
 * @param {filename} string
 * @param {contents} string
 * @param {=header} string optional file header to prepend to the file contents
 * @return void
 */
function saveToFile(filename, contents) {
  if (filename.match(/\.csv$/i)) {
    if (!contents.match(/^data:text\/csv/i)) {
      contents = "data:text/csv;charset=utf-8," + contents;
    }
  } else if (filename.match(/\.svg$/i)) {
    if (!contents.match(/^data:image\/svg/i)) {
      contents = "data:image/svg+xml;charset=utf-8," + contents;
    }
  }
  const data = encodeURI(contents);
  const link = document.createElement("a");
  link.setAttribute("href", data);
  link.setAttribute("download", filename);
  link.click();
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
  getStatsString,
  getOutArcsMap,
  getContainedInPlace,
  getType,
  getLineChartUrl,
  getApiKey,
  getApiRoot,
  isSetsEqual,
  randDomId,
  saveToFile,
  setElementShown,
  unzip,
};
