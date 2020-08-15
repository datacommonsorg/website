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

let BROWSER = "https://datacommons.org/browser/";

let DATE_FORMAT = /^\d{4}(-\d\d(-\d\d(T\d\d:\d\d)?)?)?$/i;

let REF_PROPS = [
  "location",
  "childhoodLocation",
  "observedNode",
  "containedInPlace",
  "typeOf",
  "populationType",
  "subClassOf",
  "rangeIncludes",
  "domainIncludes",
  "measuredProperty",
  "populationGroup",
  "constraintProperties",
  "measurementMethod",
  "comparedNode",
];
let VALUE_PROPS = [
  "measuredValue",
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
  "marginOfError",
  "stdError",
  "meanStdError",
  "growthRate",
  "sampleSize",
];

let line_count = 1;

function drawGraph(node_data, edge_data) {
  let nodes = new vis.DataSet(node_data);
  let edges = new vis.DataSet(edge_data);
  let container = document.getElementById("graph");
  let data = { nodes: nodes, edges: edges };
  let options = { interaction: { navigationButtons: true } };
  network = new vis.Network(container, data, options);
  network.on("doubleClick", function (params) {
    if (params.nodes.length == 1) {
      let n = nodes.get(params.nodes[0]);
      if (n.url && n.url.length > 0) {
        window.open(n.url);
      }
    }
  });
}

function writeErrors(errors) {
  if (errors.length > 0) {
    document.getElementById("err-container").style.display = "";
    document.getElementById("errors").value = errors.join("\n");
  } else {
    document.getElementById("err-container").style.display = "none";
    document.getElementById("errors").value = "";
  }
}

function isLower(str) {
  return str == str.toLowerCase();
}
function isUpper(str) {
  return str == str.toUpperCase();
}
function isAscii(str) {
  return /^[\x00-\x7F]*$/.test(str);
}

function hasValueProperty(pvs) {
  for (let v of VALUE_PROPS) {
    if (v in pvs) {
      return true;
    }
  }
  return false;
}

function dbg(n = "", lno = 0) {
  let str = "";
  if (n && n.length > 0) {
    str += "[@node " + n + "]";
  }
  if (lno && lno > 0) {
    str += "[@line " + lno + "]";
  }
  str += " :: ";
  return str;
}

function redraw(lines) {
  line_count = lines.length;

  // Step #1: Parse "lines" into "graph". Accumulate "errors" along the way.
  let cur = "";
  let graph = {};
  let errors = [];
  for (let i = 0; i < lines.length; i++) {
    let lno = i + 1;
    let l = lines[i].trim();
    if (l.startsWith("#") || l.startsWith("//") || l.length == 0) {
      continue;
    }
    let pos = l.indexOf(":");
    if (pos < 0) {
      errors.push(dbg(cur, lno) + 'Found no ":" character');
      continue;
    }
    let p = l.substr(0, pos).trim();
    let v = l.substr(pos + 1).trim();
    if (p == "Node") {
      cur = v;
      if (cur in graph) {
        errors.push(dbg("", lno) + "Found duplicate node " + cur);
        continue;
      }
      graph[cur] = {};
      if (v.startsWith("dcid:")) {
        let dcid = v.slice(5);
        graph[cur]["dcid"] = [[dcid, lno]];
      }
    } else {
      if (cur == "") {
        errors.push(dbg("", lno) + 'Found PV without a "Node:" line');
        continue;
      }
      if (v == "") {
        errors.push(dbg(cur, lno) + "Found empty value");
        continue;
      }
      for (let val_str of v.trim().split(",")) {
        let val = val_str.trim();
        if (!(p in graph[cur])) {
          graph[cur][p] = [];
        }
        graph[cur][p].push([val, lno]);
      }
    }
  }

  // Step #2: Populate vis.js node/edge data from "graph".
  let node_data = [];
  let edge_data = [];
  for (let node in graph) {
    let url = "";
    if ("dcid" in graph[node]) {
      url = BROWSER + graph[node]["dcid"][0][0];
    }
    node_data.push({
      id: node,
      label: node,
      title: url ? url : node,
      url: url,
      color: "lightgreen",
    });
    for (let prop in graph[node]) {
      console.log("Processing prop: " + prop);
      for (let idx = 0; idx < graph[node][prop].length; idx++) {
        let val = graph[node][prop][idx][0];
        let lno = graph[node][prop][idx][1];
        let colon = val.indexOf(":");
        if (
          val.startsWith("dcid:") ||
          val.startsWith("dcs:") ||
          val.startsWith("schema:")
        ) {
          let ref = val.slice(colon + 1);
          let fullid = node + prop + ref + graph[node][prop].toString();
          node_data.push({
            id: fullid,
            label: ref,
            title: BROWSER + ref,
            url: BROWSER + ref,
            color: "lightblue",
          });
          edge_data.push({
            id: fullid,
            from: node,
            to: fullid,
            label: prop,
            arrows: "to",
          });
          // Rewrite without prefix for sanity check.
          graph[node][prop][idx][0] = ref;
        } else if (val.startsWith("l:")) {
          let ref = val.slice(colon + 1);
          if (!(ref in graph)) {
            errors.push(dbg(node, lno) + "Missing node definition for: " + ref);
          }
          let fullid = node + prop + ref + graph[node][prop].toString();
          edge_data.push({
            id: fullid,
            from: node,
            to: ref,
            label: prop,
            arrows: "to",
          });
        } else {
          let fullid = node + prop + val + idx.toString();
          node_data.push({
            id: fullid,
            label: val,
            title: val,
            shape: "text",
          });
          edge_data.push({
            id: fullid,
            from: node,
            to: fullid,
            label: prop,
            arrows: "to",
          });
        }
      }
    }
  }

  // Step #3: Sanity check "graph" and accumulate "errors".
  for (let node in graph) {
    let dcid = "";
    let type = "";

    if ("dcid" in graph[node]) {
      if (graph[node]["dcid"].length != 1) {
        errors.push(dbg(node) + "dcid property must have exactly one value");
      }
      dcid = graph[node]["dcid"][0];
    }

    // First report missing "required" properties.
    if (!("typeOf" in graph[node])) {
      errors.push(dbg(node) + "Missing required property typeOf property");
    } else {
      type = graph[node]["typeOf"][0][0];
      if (type.endsWith("Population")) {
        if (!("populationType" in graph[node])) {
          errors.push(dbg(node) + "Missing required property populationType");
        }
        if (
          !("location" in graph[node]) &&
          !("childhoodLocation" in graph[node])
        ) {
          errors.push(
            dbg(node) +
              "Missing required property location or childhoodLocation"
          );
        }
      } else if (type.endsWith("Observation")) {
        if (!("measuredProperty" in graph[node])) {
          errors.push(dbg(node) + "Missing required property measuredProperty");
        }
        if (!("observationDate" in graph[node])) {
          errors.push(dbg(node) + "Missing required property observationDate");
        }
        if (!("observedNode" in graph[node])) {
          errors.push(dbg(node) + "Missing required property observedNode");
        }
        if (
          type == "ComparativeObservation" &&
          !("comparedNode" in graph[node])
        ) {
          errors.push(dbg(node) + "Missing required property comparedNode");
        }
        if (
          !hasValueProperty(graph[node]) &&
          !("measurementResult" in graph[node])
        ) {
          errors.push(
            dbg(node) +
              "Missing required value property " +
              "(measuredValue, or meanValue, ...) or measurementResult"
          );
        }
      } else if (type == "Class") {
        if (dcid != "Thing" && !("subClassOf" in graph[node])) {
          errors.push(dbg(node) + "Missing required property subClassOf");
        }
      }
    }

    // Loop over and check each property and value, as needed.
    for (let prop in graph[node]) {
      if (isUpper(prop[0])) {
        errors.push(
          dbg(node) +
            "Found property that does not start with lower case: " +
            prop
        );
      }
      if (type == "Class" || type == "Property") {
        if (
          type == "Class" &&
          (prop == "domainIncludes" ||
            prop == "rangeIncludes" ||
            prop == "subPropertyOf")
        ) {
          errors.push(
            dbg(node) + "Class node must not include property " + prop
          );
          continue;
        } else if (type == "Property" && prop == "subClassOf") {
          errors.push(
            dbg(node) + "Property node must not include property " + prop
          );
          continue;
        }
      }
      for (let val_lno of graph[node][prop]) {
        if (!val_lno[0] || val_lno[0].length == 0) {
          continue;
        }
        let val = val_lno[0];
        let lno = val_lno[1];
        if (REF_PROPS.includes(prop)) {
          if (val == '"' || val == "'") {
            errors.push(
              dbg(node, lno) + "Found a value that is not a reference: " + val
            );
          }
          if (!isAscii(val)) {
            errors.push(
              dbg(node, lno) + "Found a value that is not ascii: " + val
            );
          }
        }
        // Strip quotes.
        val = val.replace(/^"(.*)"$/, "$1");

        if (VALUE_PROPS.includes(prop) && isNaN(parseFloat(val))) {
          errors.push(
            dbg(node, lno) + "Found value not parsable as double: " + val
          );
        }
        if (prop == "observationDate" && !DATE_FORMAT.test(val)) {
          errors.push(
            dbg(node, lno) +
              "Found date value that is not ISO-8601 compliant: " +
              val
          );
        }
        if ((prop == "populationType" || prop == "typeOf") && isLower(val[0])) {
          errors.push(
            dbg(node, lno) +
              "Found class that does not start with upper case: " +
              val
          );
        }
        if (prop == "measuredProperty" && isUpper(val[0])) {
          errors.push(
            dbg(node, lno) +
              "Found property that does not start with lower case: " +
              val
          );
        }
        if ((type == "Class" || type == "Property") && !isAscii(val)) {
          errors.push(
            dbg(node, lno) + "Found a value that is not ascii: " + val
          );
          continue;
        }
        if (type == "Class") {
          if (
            ["name", "label", "dcid", "subClassOf"].includes(prop) &&
            isLower(val[0])
          ) {
            errors.push(
              dbg(node, lno) +
                "Found class that does not start with upper case: " +
                val
            );
          }
        } else if (type == "Property") {
          if (
            ["domainIncludes", "rangeIncludes"].includes(prop) &&
            isLower(val[0])
          ) {
            errors.push(
              dbg(node, lno) +
                "Found class that does not start with upper case: " +
                val
            );
          }
          if (
            ["name", "label", "dcid", "subPropertyOf"].includes(prop) &&
            isUpper(val[0])
          ) {
            errors.push(
              dbg(node, lno) +
                "Found property that does not start with lower case: " +
                val
            );
          }
        }
      }
    }
  }

  // Step #4: Render nodes/edges and errors.
  drawGraph(node_data, edge_data);
  writeErrors(errors);
}

function reload() {
  redraw(document.getElementById("mcf").value.split("\n"));
}

function mcfChanged() {
  let lines = document.getElementById("mcf").value.split("\n");
  if (lines.length != line_count) {
    redraw(lines);
  }
}

document.getElementById("mcf").addEventListener("input", mcfChanged);
document.getElementById("mcf").addEventListener("change", reload);
window.addEventListener("load", reload);
