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

let placeColors = {};
let popPVLineType = {};

const gColors = [
  "#1A73E8",
  "#D93025",
  "#F9AB00",
  "#1E8E3E",
  "#E8710A",
  "#E52592",
  "#9334E6",
  "#12B5CB",
  "#AECBFA",
  "#F6AEA9",
  "#FDE293",
  "#A8DAB5",
  "#FDC69C",
  "#FBA9D6",
  "#D7AEFB",
  "#AE14F2",
  "#185ABC",
  "#B31412",
  "#EA8600",
  "#137333",
  "#C26401",
  "#B80672",
  "#7627BB",
  "#098591",
  "#669DF6",
  "#EE675C",
  "#FCC934",
  "#5BB974",
  "#FA903E",
  "#FF63B8",
  "#AF5CF7",
  "#4ECDE6",
];

const gLines = [
  [1, 1],
  [4, 4],
  [3, 4],
  [14, 2, 2, 7],
  [2, 2, 20, 2, 20, 2],
  [10, 2],
];

const MAX_CHART_WIDTH = 1000;
const MAX_CHART_HEIGHT = 500;

// List of possible properties containing stats for an observation. Should be
// ordered by preference of using that value for charting / download purposes.
const STATS_PROPS = [
  "measuredValue",
  "meanValue",
  "medianValue",
  "sumValue",
  "minValue",
  "maxValue",
  "marginOfError",
  "stdError",
  "meanStdError",
  "percentile10",
  "percentile25",
  "percentile75",
  "percentile90",
  "growthRate",
  "stdDeviationValue",
];

const POP_NAME = {
  Person: "Population",
  CriminalActivity: "Crime",
  MortalityEvent: "Death",
};

function getPlaceColor(place) {
  if (place.name in placeColors) {
    return placeColors[place.name];
  } else {
    const n = Object.keys(placeColors).length;
    const nextColor = gColors[n];
    placeColors[place.name] = nextColor;
    return nextColor;
  }
}

function getPopPvLine(popPV) {
  if (popPV in popPVLineType) {
    return popPVLineType[popPV];
  } else {
    const n = Object.keys(popPVLineType).length;
    const nextLine = gLines[n];
    popPVLineType[popPV] = nextLine;
    return nextLine;
  }
}

function isSubPopulationOf(pt1, pt2, nc1, nc2, pvs1, pvs2) {
  if (pt1 != pt2) {
    return false;
  }
  if (nc1 == nc2 && _.isEqual(pvs1, pvs2)) {
    return true;
  }
  return false;
}

function fromEntries(x) {
  return x.reduce(function (prev, curr) {
    prev[curr[0]] = curr[1];
    return prev;
  }, {});
}

function pvsContains(pvs1, pvs2) {
  return _.isMatch(fromEntries(pvs1), fromEntries(pvs2));
}

function getPlace(data) {
  return new Place(data);
}

function formatAC(str) {
  str = str.replace("USC_", "");
  str = str.replace("EnrolledInSchool_", "");
  str = str.replace("BLS_", "");
  str = str.replace("FBI_", "");
  str = str.replace("To", " - ");
  str = str.replace("StatusInThePast12Months", "Status");
  return str;
}

function propncToProp(population) {
  nc = population.nc;
  if (nc == 1) {
    return population.data.p1;
  }
  if (nc == 2) {
    return population.data.p2;
  }
  if (nc == 3) {
    return population.data.p3;
  }
  if (nc == 4) {
    return population.data.p4;
  }
  if (nc == 5) {
    return population.data.p5;
  }
}

/**
 * Returns the first value statistical property available, null if none is
 * found.
 * @param {Array<Observation>} obs Array of observations
 * @return {!String} The statistical property for the observation.
 */
function getStatProp(obs) {
  let stat = null;
  for (const sample of obs) {
    for (let s of STATS_PROPS) {
      if (s in sample) {
        stat = s;
        break;
      }
    }
    if (stat != null) break;
  }
  return stat;
}

class Place {
  constructor(data) {
    this.name = data.name;
    this.populations = {};
    for (const popDcid in data.populations) {
      let popData = data.populations[popDcid];
      if (popData.observations) {
        // We do not know how to display comparisons.
        popData.observations = popData.observations.filter(
          (o) =>
            !o.hasOwnProperty("comparisonOperator") &&
            o.provenanceId != "dc/gk50y31"
        );
        if (popData.observations.length == 0) continue;
      }
      let p = new Population(popData);
      this.populations[popDcid] = p;
    }
    if ("observations" in data) {
      this.populations[""] = new Population({
        popType: "",
        observations: data["observations"],
      });
    }
  }

  getPopulation(popType, pvs) {
    let nc = Object.keys(pvs).length;
    if (nc == 0) {
      nc = undefined;
      pvs = undefined;
    }
    for (const popDcid in this.populations) {
      const pop = this.populations[popDcid];
      if (isSubPopulationOf(pop.popType, popType, pop.nc, nc, pop.pvs, pvs)) {
        return pop;
      }
    }
    console.log("No data found for ", popType, pvs);
  }

  getPeoplePopulation(year) {
    let pop = this.getPopulation("Person", {});
    if (pop) {
      for (const obs of pop.data.observations) {
        if (obs.measuredProp === "count" && obs.observationDate === year) {
          return obs.measuredValue;
        }
      }
    }
    return -1;
  }
}

function placeMod(placeName, mod) {
  if (placeName) {
    return mod + " " + placeName;
  } else {
    return " ";
  }
}

/**
 * A series is a combination of a place and pv-attribute (i.e., variable)
 */
class Series {
  constructor(place, ptPv, timeSeries) {
    this.place = place;
    this.measuredProp = ptPv["measuredProp"];
    this.ts = timeSeries;
    this.color = getPlaceColor(place);
    this.line = getPopPvLine(ptPv["urlarg"]);
  }
}

class Population {
  constructor(data) {
    this.data = data;
    this.pvs = data.propertyValues; // can be undefined
    this.popType = data.popType;
    this.nc = data.numConstraints; // can be undefined
  }

  title(place, placeName, prop, percap) {
    let ignoreVals = [
      "Years5Onwards",
      "Years25Onwards",
      "WithIncome",
      "Years15Onwards",
      "Years18Onwards",
      "Years3Onwards",
    ];
    let suppressed = false;
    let pre = "Number";
    if (percap) {
      pre = "Fraction";
    }
    let popType = this.popType;
    let pvl = this.pvs ? this.pvs.length : 0;

    let str = "";
    let strs = [];

    for (let p in this.pvs) {
      let v = this.pvs[p];
      if (!ignoreVals.includes(v)) {
        strs.push(formatAC(v));
      } else {
        suppressed = true;
      }
    }

    if (strs.length == 0) {
      if (popType == "Person" && (prop == null || prop == "count")) {
        return placeMod(placeName, " ") + " population";
      } else if (prop == null || prop == "count") {
        return placeMod(placeName, " ") + popType;
      } else {
        return "Median " + prop + placeMod(placeName, " ");
      }
    }

    str = strs.join(", ");
    if (place == null && suppressed) {
      str += "<sup>*</sup>";
    }

    //       str += pv[0] + " = " + formatAC(pv[1]) + "; ";
    return placeMod(placeName, "") + " " + str;
  }

  titleLong(place, placeName, prop, percap) {
    let pre = "Number";
    if (percap) {
      pre = "Fraction";
    }
    if (this.pvs.length == 0) {
      if (this.popType == "Person") {
        if (prop == "count") {
          return pre + "of  people " + placeMod(placeName, "in");
        } else if (prop == null) {
          return "People " + placeMod(placeName, "of");
        } else {
          return "Median " + prop + placeMod(placeName, " of ");
        }
      } else if (this.popType == "CriminalActivities") {
        return placeMod(placeName, "") + " crimes";
      }
    } else {
      let str = "";
      if (this.pvs.length > 0) {
        str += " with  ";
      }

      for (const pv of this.pvs) {
        str += pv[0] + " = " + formatAC(pv[1]) + "; ";
      }
      if (prop == "count") {
        if (this.popType == "Person") {
          return pre + " of  people " + placeMod(placeName, "in") + str;
        } else if (this.popType == "CriminalActivities") {
          return (
            "Number of  Crimes" +
            (percap ? " per 1000 people " : "") +
            placeMod(placeName, "in") +
            str
          );
        } else if (this.popType == "BLSEstablishment") {
          return (
            "Number of  Establishments " +
            (percap ? " per 1000 people " : "") +
            placeMod(placeName, "in") +
            str
          );
        } else if (this.popType == "BLSWorker") {
          return (
            "Number of  positions " +
            (percap ? " per 1000 people " : "") +
            placeMod(placeName, "in") +
            str
          );
        }
      }
      if (prop == null) {
        return this.popType + placeMod(placeName, " of ");
      } else {
        return prop + " of " + str;
      }
    }
  }

  getTimeSeries(measuredProp, place, perCapita = False) {
    const obs = this.data.observations.filter(
      (o) => o.measuredProp === measuredProp
    );
    let stat;
    if (measuredProp === "age" || measuredProp === "income") {
      stat = "medianValue";
    } else {
      stat = "measuredValue";
    }
    // For now GNI only supports measuredValue and medianValue. When we start
    // supporting other stat types (as a var), then can modify/use getStatPop.
    // let stat = getStatProp(measuredProp, obs);
    // if (stat == null) {
    //   console.log("Cannot find a stat property in the observation");
    //   return;
    // }
    let pts = [];
    for (const o of obs) {
      if (o.measuredProp === measuredProp && stat in o) {
        let dd;
        let t = o.observationDate;
        if (typeof t === "number") {
          dd = new Date(t / 1000);
        } else {
          const parts = t.split("-").map((v) => Number(v));
          if (parts.length == 1) {
            dd = new Date(parts[0], 0);
          } else if (parts.length == 2) {
            dd = new Date(parts[0], parts[1] - 1);
          } else if (parts.length == 3) {
            dd = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            continue;
          }
        }
        let val = o[stat];
        if (perCapita && measuredProp == "count") {
          let peoplePop = place.getPeoplePopulation(t);
          if (peoplePop > 0) {
            if (this.popType == "Person") {
              val = val / peoplePop;
            } else {
              val = (val * 1000) / peoplePop;
            }
            pts.push([dd.getFullYear(), val]);
          }
        } else {
          pts.push([dd.getFullYear(), val]);
        }
      }
    }
    pts.sort((a, b) => a[0] - b[0]);
    return new TimeSeries(pts);
  }
}

class TimeSeries {
  // Data is an array of (time, value)
  constructor(data, label) {
    this.data = data;
    this.label = null;
  }

  serialize() {
    let str = '{"label" : "' + this.label + '", "data" : [';
    let strs = [];
    for (it of this.data) {
      strs.push("[" + it[0] + "," + it[1] + "]");
    }
    str += strs.join(",") + "]}";
    return str;
  }
}

class ChartData {
  // Takes an array of Series object.
  constructor(seriesArray) {
    let attrString =
      "Population data from Census.gov; Labor data from bls.gov; Crime data from fbi.gov; Health data from cdc.gov";
    const n = seriesArray.length;
    this.header = [attrString, ...seriesArray.map((ts) => ts.ts.label)];
    let rowData = {};
    for (let i = 0; i < n; i++) {
      for (const pt of seriesArray[i].ts.data) {
        const t = pt[0];
        const v = pt[1];
        if (!(t in rowData)) {
          rowData[t] = new Array(n).fill(null);
        }
        rowData[t][i] = v;
      }
    }
    this.rows = [];
    for (const t in rowData) {
      this.rows.push([t, ...rowData[t]]);
    }
    this.rows.sort((a, b) => a[0] - b[0]);
  }
}

/***********************************************************
 * Updating chart and other UI elements
 ***********************************************************/

/**
 * Parses the pt_ps_mp_str from the URL (arg=ptpv), returning an Array of
 * dictionaries keyed as such:
 * "popType": String
 * "measuredProp": String
 * "pvs": {p:v, ...}
 * "urlarg": String (url arg hash of the ptpv)
 */
function parsePtPvs(pt_ps_mp_str) {
  let ret = [];
  for (const pt_pvs_mp of pt_ps_mp_str.split("__")) {
    // ptpvs=Person,mp,p1,v1,p2,v2__Person,mp,p1,v1
    // first is popType, next is measuredProp and then pvs
    let parts = pt_pvs_mp.split(",");

    if (parts.length < 2) {
      continue;
    }

    const popType = parts[0];
    const measuredProp = parts[1];
    let pvs = {};
    let n;
    for (n = 2; n < parts.length; n = n + 2) {
      pvs[parts[n]] = parts[n + 1];
    }
    ret.push({
      popType: popType,
      measuredProp: measuredProp,
      pvs: pvs,
      urlarg: pt_pvs_mp,
    });
  }
  return ret;
}

function getLegend(ptpv) {
  let popType = ptpv["popType"];
  let measuredProp = ptpv["measuredProp"];
  let pvs = ptpv["pvs"];
  let ps = Object.keys(pvs);
  ps.sort();
  let legend = "";
  if (measuredProp != "count") {
    legend += ` ${cap(measuredProp)}`;
  } else {
    if (ps.length == 0) {
      let unitName = popType;
      if (popType in POP_NAME) {
        unitName = POP_NAME[popType];
      }
      legend += ` ${unitName}`;
    }
  }
  if (ps.length > 0) {
    legend += ` ${ps.map((p) => pvs[p]).join(",")}`;
  }
  return legend;
}

function getUrlHelper(placeIds, ptpvGroup) {
  let url = "";
  for (let i = 1; i < ptpvGroup.length + 1; i++) {
    let piece = "";
    // Add place param
    for (let placeId of placeIds) {
      piece += `&mid${i}=${placeId}`;
    }
    // Add know pop obs spec
    let ptpv = ptpvGroup[i - 1];
    let popType = ptpv["popType"];
    let pvs = ptpv["pvs"];
    let measuredProp = ptpv["measuredProp"];
    piece += `&popt${i}=${popType}&mprop${i}=${measuredProp}`;
    for (let p in pvs) {
      piece += `&cpv${i}=${p},${pvs[p]}`;
    }
    // Add the rest of pop obs spec
    let ps = Object.keys(pvs);
    ps.sort();
    url += piece;
  }
  return url;
}

function getChartUrl(placeIds, ptpvGroup, perCapita, width, height) {
  let url = "/datachart/line?richlg&placelg";
  if (perCapita) {
    url += "&pc";
  }
  return `${url}${getUrlHelper(placeIds, ptpvGroup)}&w=${width}&h=${height}`;
}

function getDataUrl(placeIds, ptpvGroup, perCapita) {
  let url = "/data/line?";
  if (perCapita) {
    url += "&pc";
  }
  return `${url}${getUrlHelper(placeIds, ptpvGroup)}`;
}

/*
 * Draw population chart
 */
function drawFromChartApi(chartElem, placeIdStr, pt_pvs_mp_str) {
  const obsElem = document.getElementById(chartElem);
  const elem2 = document.createElement("div");
  elem2.id = "gchart-container";
  obsElem.appendChild(elem2);
  let perCapita = getPerCapita();

  let width = Math.min(obsElem.offsetWidth - 20, MAX_CHART_WIDTH);
  let height = Math.min(Math.round(width * 0.5), MAX_CHART_HEIGHT);

  let placeIds = placeIdStr.split(",");
  let allPtPv = parsePtPvs(pt_pvs_mp_str);
  let mpropGroup = {};
  for (let ptPv of allPtPv) {
    let mprop = ptPv["measuredProp"];
    if (mprop in mpropGroup) {
      mpropGroup[mprop].push(ptPv);
    } else {
      mpropGroup[mprop] = [ptPv];
    }
  }
  for (let mprop in mpropGroup) {
    const card = document.createElement("div");
    card.className = "card";
    elem2.appendChild(card);
    let ptpvGroup = mpropGroup[mprop];
    let img = new Image();
    img.src = getChartUrl(placeIds, ptpvGroup, perCapita, width, height);
    card.appendChild(img);
    showPVListV2(card, ptpvGroup);
    let attribution = document.createElement("div");
    attribution.classList.add("attribution");
    attribution.textContent =
      "Population data from census.gov; Labor data from bls.gov; Crime data from fbi.gov; Health data from cdc.gov";
    card.appendChild(attribution);
  }
}

function showPVListV2(listElem, ptpvGroup) {
  if (ptpvGroup.length > 0) {
    let ind = 0;
    for (const ptpv of ptpvGroup) {
      let elem = document.createElement("div");
      listElem.appendChild(elem);
      elem.classList.add("pv-chip");
      elem.classList.add("mdl-chip--deletable");
      elem.style.backgroundColor = gColors[ind];
      const text = document.createElement("span");
      text.classList.add("mdl-chip__text");
      let legend = getLegend(ptpv);
      text.innerHTML = legend;
      elem.appendChild(text);
      const button = document.createElement("button");
      button.classList.add("mdl-chip__action");
      const cancel = document.createElement("i");
      cancel.classList.add("material-icons");
      cancel.innerHTML = "cancel";
      button.appendChild(cancel);
      elem.appendChild(button);
      elem.appendChild(document.createElement("br"));
      cancel.addEventListener("click", () => removePVTFromUrl(ptpv["urlarg"]));
      ind++;
    }
  }
}

/*
 * Remove PTPV from url
 */
function removePVTFromUrl(toremove) {
  let vars = getUrlVars();
  //    let newStr = pt + "," + mp + "," + pvs;
  if ("ptpv" in vars) {
    let ptpvs = vars["ptpv"].split("__");

    if (ptpvs.includes(toremove)) {
      ptpvs.splice(ptpvs.indexOf(toremove), 1);
      vars["ptpv"] = ptpvs.join("__");
      let evt = window.evtmap[toremove];
      if (evt) {
        if (evt.target.classList.contains("checkbox")) {
          evt.target.classList.toggle("checked");
        } else if (evt.target.classList.contains("value-link")) {
          evt.target.querySelector(".checkbox").classList.toggle("checked");
        }
      }
    }
  }
  setSearchParam(vars);
}

function cap(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function dcidToPlaceType(dcid) {
  // TODO(boxu): update this when place type is available in cache.
  if (dcid.startsWith("country/")) {
    return "Country";
  }
  if (dcid.startsWith("geoId/")) {
    let id = dcid.replace("geoId/", "");
    if (id.length == 2) {
      return "State";
    } else if (id.length == 5) {
      return "County";
    } else if (id.length == 7) {
      return "City";
    }
  }
  return null;
}

function getPerCapita() {
  let vars = getUrlVars();
  return "pc" in vars && vars["pc"] === "1";
}

/*
 * Get url params
 */
function getUrlVars() {
  let vars = {};
  let str = window.location.hash;
  const parts = str.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (
    m,
    key,
    value
  ) {
    vars[key] = value;
  });
  return vars;
}

function setSearchParam(vars) {
  let newHash = "#";
  for (const k in vars) {
    newHash += "&" + k + "=" + vars[k];
  }
  window.location.hash = newHash;
}

function clearDiv(id) {
  const olem = document.getElementById(id);
  while (olem.firstChild) {
    olem.removeChild(olem.firstChild);
  }
}

export {
  drawFromChartApi,
  dcidToPlaceType,
  getPerCapita,
  getUrlVars,
  setSearchParam,
  clearDiv,
  parsePtPvs,
  getDataUrl,
};
