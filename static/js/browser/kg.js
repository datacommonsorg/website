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

import ReactDOM from "react-dom";
import React from "react";

import {
  GeneralNode,
  ArcGroupTitle,
  ArcGroupTextContent,
  OutArcsTable,
  SubPopulation,
} from "./kg_template.jsx";

const _ = require("lodash");
const axios = require("axios");
const Cookie = require("js-cookie");
const util = require("../shared/util.js");
const observationchart = require("./observation_chart.js");

import { isTextView, setupViewToggle } from "./view";

const NO_POP_TYPES = [
  "Observation",
  "Class",
  "Property",
  "Provenance",
  "Curator",
  "Source",
];

const WEATHER = [
  "temperature",
  "visibility",
  "rainfall",
  "snowfall",
  "barometricPressure",
];

const TOTAL = "Total";

const NO_PV_MODIFIER = {
  CriminalActivities: "crimeType",
  MortalityEvent: "gender",
  Person: "gender",
  Student: "gender",
  Teacher: "gender",
};

const LOC_FIELD = {
  populations: "location",
  childhoodLocationPopulations: "childhoodLocation",
};

// Regex to check for top level NAICS code, which is one of:
// - Start with "10". Such as "NAICS/1012".
// - Two digits. Such as "NAICS/51".
// - Two pairs of two digits connected by "-". Such as "NAICS/31-33".
// TOOD(shifucun): Add additional whitelisted NAICS that exist in cache.
const TOP_NAICS_REGEX = /(NAICS\/10\d*|NAICS\/\d\d|NAICS\/\d\d-\d\d)/g;

/**
 * Orders population group keys.
 *
 * @param {!Array<string>} keys Population group keys.
 * @return {!Array<string>}
 */
function orderPopGroupByKey(keys) {
  let front = [];
  let middle = [];
  let end = [];
  for (const key of keys) {
    if (key == "location,Person,gender") {
      front.push(key);
    } else {
      middle.push(key);
    }
  }
  let middle_list = middle.map((key) => key.split(","));
  middle_list.sort((a, b) => {
    return (
      a.length - b.length ||
      b[0].localeCompare(a[0]) ||
      a[1].localeCompare(b[1]) ||
      a[2].localeCompare(b[2])
    );
  });
  middle = middle_list.map((key_list) => key_list.join(","));
  return [...front, ...middle, ...end];
}

/**
 * Displays the in arcs group card given predicates mapped to lists of nodes.
 *
 * @param {string} name name of the node
 * @param {string} parentType parent type of the given node
 * @param {?Object} nodesByPred predicates mapped to lists of nodes.
 * @param {?Node} inArcsGroupsElem the DOM element containing in arc groups
 */
function displayInArcsByPred(name, parentType, nodesByPred, inArcsGroupsElem) {
  for (const pred in nodesByPred) {
    // Create the initial in arcs group element
    const cardElem = document.createElement("div");
    cardElem.className = "card";
    inArcsGroupsElem.appendChild(cardElem);
    let elem = document.createElement("div");
    ReactDOM.render(
      <ArcGroupTitle arcType={parentType} subject={name} />,
      elem
    );
    cardElem.appendChild(elem);

    // Get the arcs and sort them by name
    let arcs = nodesByPred[pred];
    arcs.sort((a, b) => {
      if (a["text"] < b["text"]) {
        return -1;
      }
      if (a["text"] > b["text"]) {
        return 1;
      }
      return 0;
    });

    // Append the in arc group
    let elemArcGroupTextContent = document.createElement("div");
    ReactDOM.render(
      <ArcGroupTextContent propName={pred} arcs={arcs} textView={false} />,
      elemArcGroupTextContent
    );
    cardElem.appendChild(elemArcGroupTextContent);
    util.appendMoreIfNecessary(cardElem, util.MAX_CARD_HEIGHT);
  }
}

function isMatch(obj1, obj2) {
  if (!obj1) {
    return Object.keys(obj2).length == 0;
  }
  for (let key in obj2) {
    if (!(key in obj1)) return false;
    if (obj2[key] !== obj1[key]) return false;
  }
  return true;
}

/**
 * Get observation name.
 *
 * @param {!Object} obs the observation object.
 *
 * @return {string}
 */
function getObsName(obs) {
  let name = obs["observationDate"];
  let name_parts = [];
  for (let stats of util.STATS) {
    if (stats in obs) {
      if (stats == "measuredValue") {
        name_parts.push(`, ${obs["measuredProperty"]}=${obs[stats]}`);
      } else {
        name_parts.push(
          `, ${obs["measuredProperty"]}:${stats.replace("Value", "")}=${
            obs[stats]
          }`
        );
      }
    }
  }
  if (name_parts.length > 0) {
    name += name_parts.join("");
  }
  return name;
}

/**
 * Filter populations.
 *
 * @param {!Object} populations the population object.
 * @param {string} popType the population type.
 * @param {!Object<string, string>} pvs the property value constraints.
 * @param {boolean} isPop if the current node is population.
 *
 * @return {!Array<!Object>}
 */
function filterPop(populations, popType, pvs, isPop) {
  let result = [];
  // Get population with matching type and pvs
  for (const [dcid, pop] of Object.entries(populations)) {
    if (popType && popType != pop["popType"]) {
      continue;
    }
    if (isMatch(pop["propertyValues"], pvs)) {
      if (!("numConstraints" in pop)) {
        pop["numConstraints"] = 0;
        pop["propertyValues"] = {};
      }
      if (
        isPop &&
        Object.keys(pop["propertyValues"]).length == Object.keys(pvs).length
      ) {
        continue;
      }

      pop["dcid"] = dcid;
      result.push(pop);
    }
  }
  return result;
}

/**
 * Get base populations.
 *
 * Some population is sub-population of another population in the list. For
 * example:
 * If {'age': '30To40'} is in the list, then {'age': '30To40', 'gender': 'Male'}
 * is its sub-population and would be removed in this function.
 *
 * 1. Sort the list by the number of pvs.
 * 2. Start from the population with fewest pvs, add it to the result and
 *    remove populations in the rest of the list which is a sub-population.
 * 3. Repeat this until the entire list is processed.
 *
 * @param {!Array<!Object>} populations the populations to filter for.
 *
 * @return {!Array<!Object>}
 */
function getBasePop(populations) {
  // 1. Sort the list by the number of pvs.
  // 2. Start from the population with fewest pvs, add it to the result and
  //    remove populations in the rest of the list which is a sub-population.
  // 3. Repeat this until the entire list is processed.
  let result = [];
  let popGroup = _.groupBy(populations, (p) => p["popType"]);
  for (let pt in popGroup) {
    let pops = popGroup[pt];
    pops.sort(function (a, b) {
      return a["numConstraints"] - b["numConstraints"];
    });
    // Always keep the populations without constraints.
    while (pops.length > 0) {
      let currPop = pops.shift();
      if (currPop["numConstraints"] == 0) {
        result.push(currPop);
      } else {
        pops.unshift(currPop);
        break;
      }
    }
    while (pops.length > 0) {
      let newPop = [];
      let currPop = pops.shift();
      result.push(currPop);
      while (pops.length > 0) {
        let nextPop = pops.shift();
        if (!isMatch(nextPop["propertyValues"], currPop["propertyValues"])) {
          newPop.push(nextPop);
        }
      }
      pops = newPop;
    }
  }
  return result;
}

/**
 * Convert population object to ui usable object
 *
 * @param {!Object} pop a population object.
 * @param {string} prop the predicate.
 * @param {!Object<string, string>} provDomain the provenance domain mapping.
 *
 * @return {!Object}
 */
function convertPop(pop, prop, provDomain) {
  pop["prop"] = prop;
  pop["npv"] = pop["numConstraints"];
  delete pop["numConstraints"];
  pop["type"] = pop["popType"];
  delete pop["popType"];
  pop["pvs"] = pop["propertyValues"];
  delete pop["propertyValues"];

  if (pop["npv"] == 0) {
    pop["pvs"] = {};
    pop["text"] = TOTAL;
    if (pop["type"] in NO_PV_MODIFIER) {
      pop["pvs"][NO_PV_MODIFIER[pop["type"]]] = TOTAL;
    }
  } else {
    let vs = Object.values(pop["pvs"]);
    vs.sort();
    pop["text"] = vs.join(", ");
  }
  pop["prov"] = pop["provenanceId"];
  pop["src"] = provDomain[pop["provenanceId"]];
  return pop;
}

/**
 * Convert observation object to ui usable object
 *
 * @param {!Object} obs an observation object.
 * @param {string} popId the population dcid.
 * @param {!Object<string, string>} provDomain the provenance domain mapping.
 *
 * @return {!Object}
 */
function convertObs(obs, popId, provDomain) {
  obs["dcid"] = obs["id"];
  obs["measuredProperty"] = obs["measuredProp"];
  delete obs["measuredProp"];
  obs["parentDcid"] = popId;
  obs["prov"] = obs["provenanceId"];
  obs["src"] = provDomain[obs["provenanceId"]];
  obs["text"] = getObsName(obs);
  if (obs["measurementMethod"]) {
    obs["measurementMethod"] = obs["measurementMethod"].replace(
      /dcAggregate\//g,
      ""
    );
  }
  return obs;
}

/**
 * Convert population info to triples.
 *
 * @param {string} dcid the node dcid.
 * @param {!Object} popInfo an population object.
 * @param {!Object<string, string>} provDomain the provenance domain mapping.
 *
 * @return {!Array<!Object>}
 */
function popInfoToTriples(dcid, popInfo, provDomain) {
  let triples = [];
  triples.push({
    provenanceId: popInfo["provenanceId"],
    objectId: util.POPULATION,
    objectName: util.POPULATION,
    predicate: "typeOf",
    subjectId: dcid,
    src: provDomain[popInfo["provenanceId"]],
  });
  triples.push({
    provenanceId: popInfo["provenanceId"],
    objectId: popInfo["popType"],
    objectName: popInfo["popType"],
    predicate: "populationType",
    subjectId: dcid,
    src: provDomain[popInfo["provenanceId"]],
  });
  return triples;
}

/**
 * Convert observation info to triples.
 *
 * @param {!Object} obsInfo an observation object.
 * @param {!Object<string, string>} provDomain the provenance domain mapping.
 *
 * @return {!Array<!Object>}
 */
function obsInfoToTriples(obsInfo, provDomain) {
  let triples = [];
  triples.push({
    provenanceId: obsInfo["provenanceId"],
    objectId: obsInfo["type"],
    objectName: obsInfo["type"],
    predicate: "typeOf",
    subjectId: obsInfo["id"],
    src: provDomain[obsInfo["provenanceId"]],
  });
  for (let key in obsInfo) {
    if (["id", "provenanceId", "type"].includes(key)) continue;
    let t = {
      provenanceId: obsInfo["provenanceId"],
      predicate: key,
      subjectId: obsInfo["id"],
      src: provDomain[obsInfo["provenanceId"]],
    };
    if (key == "measuredProp") {
      t["predicate"] = "measuredProperty";
      t["objectId"] = obsInfo[key];
      t["objectName"] = obsInfo[key];
    } else if (key == "statVarIds") {
      for (let objId of obsInfo[key]) {
        let provId = "dc/5l5zxr1"; // Base schema
        let t = {
          provenanceId: provId,
          predicate: "statisticalVariable",
          subjectId: obsInfo["id"],
          src: provDomain[provId],
          objectId: objId,
          objectName: objId,
        };
        triples.push(t);
        break; // Only show one StatsVar.
      }
      continue;
    } else {
      t["objectValue"] = obsInfo[key];
    }
    triples.push(t);
  }
  return triples;
}

/**
 * Get signature of an observation object.
 *
 * @param {!Object} obs An Observation object.
 *
 * @return {string}.
 */
function getObsString(obs) {
  return util.OBS_KEYS.map((key) => obs[key]).join(",");
}

/**
 * Group observation objects by the stats type.
 * @param {!Array<!Object>} obsArray An array of observation object.
 *
 * @return {!Object<string, !Array<!Object>>}
 */
function groupObs(obsArray) {
  let result = {};
  for (let obs of obsArray) {
    for (let stats of util.STATS) {
      if (stats in obs) {
        if (stats in result) {
          result[stats].push(obs);
        } else {
          result[stats] = [obs];
        }
      }
    }
  }
  return result;
}

function getTriples(dcid) {
  return axios.get(`/api/browser/triples/${dcid}`).then((resp) => resp.data);
}

/*
 * Trims arcs for a given predicate past the given limit.
 *
 * @param {string} dcid The DCID of the node.
 * @param {string} predicate The predicate whose values are to be trimmed.
 * @param {!Iterable} outArcs The out arc triples.
 *
 * @return {!Iterable} Trimmed out arc triples.
 */
function trimArcsForPredicate(dcid, predicate, maxValues, outArcs) {
  const nArcs = outArcs.reduce((n, p) => {
    if (p["predicate"] == predicate) {
      n++;
    }
    return n;
  }, 0);

  // Trim values past count.
  var numSeen = 0;
  outArcs = outArcs.filter(
      (p) => !(p["predicate"] == predicate && ++numSeen > maxValues));

  // If trimmed, add an indicator.
  if (nArcs > maxValues) {
    const extra = (nArcs - maxValues).toString();
    outArcs.push({
      "subjectId": dcid,
      "predicate": predicate,
      "objectValue": "(... " + extra + " more ...)",
    });
  }
  return outArcs;
}

/**
 * Render KG page.
 *
 * @param {string} dcid The DCID of the node.
 * @param {string} type The type of the node.
 * @param {string} name The name of the node.
 * @param {string} description The description of the node, defined or compiled for the meta header
 * @param {*} triples Triples of the node.
 * @param {!Iterable} outArcs The out arc triples.
 * @param {!Object} provDomain Provenance domain.
 */
async function renderKGPage(
  dcid,
  type,
  name,
  description,
  triples,
  outArcs,
  provDomain
) {
  // Get location id
  let locId = dcid;
  let locName;
  let locPredicate;
  let populationField;
  let popId = null;
  if (dcid.startsWith("dc/o/")) {
    let ts = outArcs.filter((t) => t["predicate"] == "observedNode");
    if (ts.length > 0) {
      let obsNodeId = ts[0]["objectId"];
      if (obsNodeId.startsWith("dc/p/")) {
        popId = obsNodeId;
      } else {
        locId = obsNodeId;
        locName = ts[0]["objectName"];
      }
    }
  }
  if (dcid.startsWith("dc/p/")) {
    popId = dcid;
  }
  if (popId) {
    let popTriples = await getTriples(popId);
    let ts = popTriples.filter((t) =>
      ["location", "childhoodLocation"].includes(t["predicate"])
    );
    if (ts.length > 0) {
      locId = ts[0]["objectId"];
      locName = ts[0]["objectName"];
      locPredicate = ts[0]["predicate"];
      populationField =
        locPredicate == "location"
          ? "populations"
          : "childhoodLocationPopulations";
    }
  }

  // Get popobs
  const popobs = await axios
    .get(`/api/browser/popobs/${locId}`)
    .then((resp) => resp.data);

  // Get out arcs of population from popobs information.
  if (util.isPopulation(type)) {
    const popInfo = popobs[populationField][dcid];
    for (let a of outArcs) {
      a["prov"] = popInfo["provenanceId"];
      a["src"] = provDomain[popInfo["provenanceId"]];
    }

    outArcs.push(...popInfoToTriples(dcid, popInfo, provDomain));
  }

  // Get out arcs of observation from popobs information.
  if (dcid.startsWith("dc/o/")) {
    let obsInfo;
    if (popId) {
      obsInfo = popobs[populationField][popId]["observations"].filter(
        (o) => o["id"] == dcid
      )[0];
    } else {
      obsInfo = popobs["observations"].filter((o) => o["id"] == dcid)[0];
    }
    let obsTriples = obsInfoToTriples(obsInfo, provDomain);
    outArcs[0]["provenanceId"] = obsTriples[0]["provenanceId"];
    outArcs[0]["src"] = obsTriples[0]["src"];
    outArcs.push(...obsTriples);
  }

  outArcs.sort((a, b) => {
    if (a["predicate"] == "typeOf") {
      return -1;
    }
    if (b["predicate"] == "typeOf") {
      return 1;
    }
    if (a["predicate"] == "dcid") {
      return 1;
    }
    if (b["predicate"] == "dcid") {
      return -1;
    }
    if (a["predicate"] < b["predicate"]) {
      return -1;
    }
    if (a["predicate"] > b["predicate"]) {
      return 1;
    }
    return 0;
  });

  const outArcsElem = document.getElementById("out-arcs");
  ReactDOM.render(<OutArcsTable dcid={dcid} arcs={outArcs} />, outArcsElem);

  // Display image for biological specimen
  if (type == "BiologicalSpecimen") {
    let ts = outArcs.filter((t) => t["predicate"] == "imageUrl");
    if (ts.length > 0) {
      let imageUrl = ts[0]["objectValue"];
      let imageElem = document.createElement("img");
      imageElem.src = imageUrl;
      let bodyElem = document.getElementById("node");
      bodyElem.appendChild(imageElem);
    }
  }

  if (["Class", "Property", "Observation"].includes(type)) {
    util.setElementShown(document.getElementById("toggle-form"), false);
  }

  // Set text/chart mode.
  let showText =
    dcid == util.POPULATION ||
    ["Provenance", "Curator", "Source"].includes(type) ||
    Cookie.get("datcomDisplayMode") == "text";
  document.getElementById("toogle-text").checked = showText;
  document.getElementById("toogle-chart").checked = !showText;

  // Set name
  document.title = `${name} - Graph Browser - Data Commons`;
  let nameElem = document.getElementById("bg-node-name");
  nameElem.textContent = name;

  if (description) {
    let metaDescElem = document.createElement("meta");
    metaDescElem.setAttribute("name", "description");
    metaDescElem.setAttribute("content", description);
    document.getElementsByTagName("head")[0].appendChild(metaDescElem);
  }

  // Display initially hided elements.
  let elems = document.getElementsByClassName("initial-hide");
  _.forEach(elems, (elem) => {
    util.setElementShown(elem, true);
  });

  let inArcs = triples.filter(
    (t) => t["objectId"] == dcid && t["subjectId"] != dcid
  );
  inArcs = inArcs.map((t) => {
    t["dcid"] = t["subjectId"];
    t["prov"] = t["provenanceId"];
    t["src"] = provDomain[t["provenanceId"]];
    if ("subjectName" in t) {
      t["text"] = t["subjectName"];
    } else {
      t["text"] = t["subjectId"];
    }
    return t;
  });

  // Do not show observation in in-arcs as they are handled later.
  inArcs = inArcs.filter((t) => t["subjectType"] != "Observation");

  let inArcsGroup = {};
  for (let inArc of inArcs) {
    for (let sType of inArc["subjectTypes"]) {
      if (!(sType in inArcsGroup)) {
        inArcsGroup[sType] = [];
      }
      inArcsGroup[sType].push(inArc);
    }
  }

  const inArcsGroupsElem = document.getElementById("in-arcs-groups");
  let sortedTypes = Object.keys(inArcsGroup);
  sortedTypes.sort();
  for (const parentType of sortedTypes) {
    if (util.isPopulation(parentType)) continue;
    const nodesByPred = _.groupBy(
      inArcsGroup[parentType],
      (arc) => arc["predicate"]
    );
    displayInArcsByPred(name, parentType, nodesByPred, inArcsGroupsElem);
  }

  // Set up view toggle based on cookie.
  setupViewToggle();
  const /** boolean */ textView = isTextView();

  // Add "More" to existing cards.
  util.appendMoreToAll();

  if (NO_POP_TYPES.includes(type)) return;

  const subPopHintElem = document.getElementById("subpop-hint");
  const populationElem = document.getElementById("population");
  const observationElem = document.getElementById("observation");
  if (util.isPopulation(type)) {
    observationElem.parentNode.insertBefore(observationElem, subPopHintElem);
  }

  // Fetches weather data.
  if (type == "City" || type == "CensusZipCodeTabulationArea") {
    for (const prop of WEATHER) {
      // Query observation data and render.
      axios.get(`/weather?dcid=${dcid}&prop=${prop}`).then((resp) => {
        let obsData = resp.data;
        if (obsData.length > 0) {
          const cardElem = document.createElement("div");
          cardElem.className = "card";
          observationElem.appendChild(cardElem);
          const oneCard = new observationchart.ObservationChart(
            cardElem,
            obsData,
            obsData,
            util.OBSERVATION,
            textView,
            {},
            prop
          );
          oneCard.render();
        }
      });
    }
  }

  if (popobs) {
    let pvs = {};
    let popType;
    let popData = [];
    if (util.isPopulation(type)) {
      pvs = popobs[populationField][dcid]["propertyValues"];
      popType = popobs[populationField][dcid]["popType"];
    }
    if (pvs) {
      for (let field in LOC_FIELD) {
        if (field in popobs) {
          let tmpPopData = getBasePop(
            filterPop(popobs[field], popType, pvs, util.isPopulation(type))
          );
          popData.push(
            ...tmpPopData.map((p) =>
              convertPop(p, LOC_FIELD[field], provDomain)
            )
          );
        }
      }
    }
    if (popData.length > 0) {
      if (Object.keys(pvs).length === 0 && util.isPopulation(type)) return;
      // Render hint for sub population
      if (util.isPopulation(type)) {
        ReactDOM.render(
          <SubPopulation locName={locName} pvs={pvs} />,
          subPopHintElem
        );
      }

      // Group population by pvs.
      const popGroup = _.groupBy(popData, (pop) => {
        const tokens = [pop["prop"], pop["type"]];
        tokens.push(...Object.keys(pop["pvs"]));
        return tokens.join(",");
      });
      let popGroupKeys = Object.keys(popGroup);
      popGroupKeys = orderPopGroupByKey(popGroupKeys);

      for (const key of popGroupKeys) {
        if (key.includes("ancestrySpecified")) {
          continue;
        }
        // Query observation data and render.
        let popDcids = [];
        if (key.includes("naics")) {
          for (const pop of popGroup[key]) {
            if (pop["pvs"]["naics"].match(TOP_NAICS_REGEX)) {
              popDcids.push(pop["dcid"]);
            }
          }
        } else {
          popDcids = popGroup[key].map((pop) => pop["dcid"]);
        }
        let obsData = [];
        for (const dcid of popDcids) {
          for (let pop of popData.filter((p) => p["dcid"] == dcid)) {
            if ("observations" in pop) {
              // For sub population seciton, only show 'Observation' chart.
              let obs = pop["observations"].filter(
                (o) => o["type"] == "Observation"
              );
              obsData.push(...obs.map((o) => convertObs(o, dcid, provDomain)));
            }
          }
        }
        if (obsData.length == 0) continue;
        const obsDataArray = _.groupBy(obsData, (d) =>
          [d["measuredProperty"], d["unit"]].join(",")
        );

        let props = Object.keys(obsDataArray);
        props.sort((pa, pb) => {
          let a = pa.split(",")[0];
          let b = pb.split(",")[0];
          if (a == "count") {
            return -1;
          }
          if (b == "count") {
            return 1;
          }
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        });
        for (const prop of props) {
          const obsDataDup = obsDataArray[prop];
          const obsDupArray = _.groupBy(obsDataDup, (d) => getObsString(d));
          let richTitle = Object.keys(obsDupArray).length > 1;
          for (let obsData of Object.values(obsDupArray)) {
            let grouping = groupObs(obsData);
            for (let stats of Object.keys(grouping)) {
              let currData = grouping[stats];
              const cardElem = document.createElement("div");
              cardElem.className = "card";
              const oneCard = new observationchart.ObservationChart(
                cardElem,
                popGroup[key],
                [],
                util.POPULATION,
                textView,
                pvs,
                prop.split(",")[0] +
                  " " +
                  util.getStatsString(currData[0], richTitle)
              );
              oneCard.render();
              populationElem.appendChild(cardElem);
              try {
                oneCard.addDataAndRender(currData);
              } catch (err) {
                console.log(err);
              }
            }
          }
        }
      }
    }

    let allObsData = [];
    if (util.isPopulation(type)) {
      if ("observations" in popobs[populationField][dcid]) {
        allObsData.push(...popobs[populationField][dcid]["observations"]);
      }
      if ("comparedObservations" in popobs[populationField][dcid]) {
        allObsData.push(
          ...popobs[populationField][dcid]["comparedObservations"]
        );
      }
    } else if ("observations" in popobs) {
      allObsData = popobs["observations"];
    }
    allObsData = allObsData.map((o) => convertObs(o, dcid, provDomain));

    let directObsData = allObsData.filter(
      (o) => o["type"] !== "ComparativeObservation"
    );
    let compObsData = allObsData.filter(
      (o) => o["type"] == "ComparativeObservation"
    );

    // Display the observations with type "Observation".
    if (directObsData.length > 0) {
      const obsDataArray = _.groupBy(directObsData, (d) =>
        [d["measuredProperty"], d["unit"]].join(",")
      );
      for (const prop in obsDataArray) {
        const obsDataDup = obsDataArray[prop];
        const obsDupArray = _.groupBy(obsDataDup, (d) => getObsString(d));
        let richTitle = Object.keys(obsDupArray).length > 1;
        for (let obsData of Object.values(obsDupArray)) {
          let grouping = groupObs(obsData);
          for (let stats of Object.keys(grouping)) {
            let currData = grouping[stats];
            const cardElem = document.createElement("div");
            cardElem.className = "card";
            observationElem.appendChild(cardElem);
            const oneCard = new observationchart.ObservationChart(
              cardElem,
              currData,
              currData,
              util.OBSERVATION,
              textView,
              {},
              prop.split(",")[0],
              richTitle
            );
            oneCard.render();
            util.appendMoreIfNecessary(cardElem, util.MAX_CARD_HEIGHT);
          }
        }
      }
    }

    // Display the observations with type "ComparativeObservation".
    if (compObsData.length > 0) {
      let oids = compObsData.map((o) => o["dcid"]);
      for (const oid of oids) {
        let obsTriples = await getTriples(oid);
        for (let o of compObsData) {
          let oid = o["dcid"];
          for (let t of obsTriples[oid]) {
            if (t["predicate"] == "comparedNode") {
              o["comparedNode"] = t["objectId"];
            } else if (t["predicate"] == "observedNode") {
              o["observedNode"] = t["objectId"];
            }
          }
        }
      }

      let obsDataArray = _.groupBy(compObsData, (d) =>
        [d["measuredProperty"], d["comparedNode"]].join(",")
      );

      for (const prop in obsDataArray) {
        const obsData = obsDataArray[prop];
        const cardElem = document.createElement("div");
        cardElem.className = "card";
        observationElem.appendChild(cardElem);

        // Fetch the population pvs for other parent for title
        // generation.
        const obsSample = obsData[0];
        let otherPopId;
        if (obsSample["parentDcid"] == obsSample["observedNode"]) {
          otherPopId = obsSample["comparedNode"];
        } else {
          otherPopId = obsSample["observedNode"];
        }
        let popInfo = await getTriples(otherPopId);
        let otherParentPvs = {};
        for (let t of popInfo) {
          if (["location", "numConstraints"].includes(t["predicate"])) {
            continue;
          }
          otherParentPvs[t["predicate"]] = t["objectId"];
        }

        const oneCard = new observationchart.ObservationChart(
          cardElem,
          obsData,
          obsData,
          util.COMPARATIVE_OBSERVATION,
          textView,
          pvs,
          prop.split(",")[0]
        );
        oneCard.handleOtherParentPvs(otherParentPvs);
        oneCard.render();
        util.appendMoreIfNecessary(cardElem, util.MAX_CARD_HEIGHT);
      }
    }
  }
}

/** Page setup after initial loading */
window.onload = () => {
  const dcid = document.getElementById("bg-dcid").textContent;
  const provPromise = getTriples("Provenance");
  const triplesPromise = getTriples(dcid);

  Promise.all([provPromise, triplesPromise]).then(([provs, triples]) => {
    let provDomain = {};
    for (let prov of provs) {
      if (prov["predicate"] == "typeOf" && !!prov["subjectName"]) {
        provDomain[prov["subjectId"]] = new URL(prov["subjectName"]).host;
      }
    }

    // Get outArcs
    let outArcs = triples.filter((t) => t["subjectId"] == dcid);

    // Remove predicate that should not be displayed.
    outArcs = outArcs.filter(
      (p) =>
        ![
          "provenance",
          "kmlCoordinates",
          "geoJsonCoordinates",
          "geoJsonCoordinatesDP1",
          "geoJsonCoordinatesDP2",
          "geoJsonCoordinatesDP3",
        ].includes(p["predicate"])
    );

    // Get provenance name and object name
    outArcs = outArcs.map((p) => {
      if ("objectId" in p && !("objectName" in p)) {
        p["objectName"] = p["objectId"];
      }
      p["src"] = provDomain[p["provenanceId"]];
      return p;
    });

    // Trim "nameWithLanguage" arcs.
    outArcs = trimArcsForPredicate(dcid, "nameWithLanguage", 10, outArcs);

    const outArcsMap = util.getOutArcsMap(triples, dcid);
    const type = util.getType(triples, dcid);

    // Get name
    let name = dcid;
    if ("name" in outArcsMap) {
      name = outArcsMap["name"][0][0];
    }

    // Get description for the meta-header
    // TODO: compile a suitable description if undefined in the graph
    let description;
    if ("description" in outArcsMap) {
      description = outArcsMap["description"][0][0];
    }

    ReactDOM.render(<GeneralNode />, document.getElementById("node"));
    renderKGPage(dcid, type, name, description, triples, outArcs, provDomain);
  });
};
