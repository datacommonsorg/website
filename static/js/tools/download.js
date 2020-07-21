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

import {
  drawFromChartApi,
  getUrlVars,
  clearDiv,
  getPerCapita,
  parsePtPvs,
  getDataUrl,
} from "./dc.js";

const axios = require("axios");

import { getApiKey, getApiRoot, unzip } from "../shared/util.js";

/**
 * Shows or hides the spinner.
 * @param {Boolean} shouldShow True if the spinner should be shown.
 */
function toggleSpinner(shouldShow) {
  $("#screen").css("display", shouldShow ? "block" : "none");
}

function showCode() {
  let chartContainer = document.getElementById("gchart-container");
  let imgElem = chartContainer.getElementsByTagName("img")[0];
  let fstr = imgElem.src;
  let doc = document.getElementById("code").contentWindow.document;
  doc.open();
  doc.write(
    "<html><head><title></title></head><body><pre>" +
      fstr +
      "</pre></body></html>"
  );
  doc.close();
  document.querySelector("#code").style.width = "800px";
  document.querySelector("#code").style.height = "200px";
  document.querySelector("#code").style.border = "2px solid gray";
}

/**
 * Convert time series data from the chart to a csv for download
 */
function downloadData() {
  const urlargs = getUrlVars();

  let placeStr = null;
  let ptpvStr = null;
  let perCapita = getPerCapita();

  if ("place" in urlargs) {
    placeStr = urlargs["place"];
  }

  if ("ptpv" in urlargs) {
    ptpvStr = urlargs["ptpv"];
  }

  if (!ptpvStr) {
    ptpvStr = "Person,count";
  }

  let placeIds = placeStr.split(",");
  let allPtpv = parsePtPvs(ptpvStr);

  let titles = ["Year"];
  let tmp = {};
  let result = [];
  let dataPromises = [];
  let pvKeys = [];
  for (let ptpv of allPtpv) {
    let dataUrl = getDataUrl(placeIds, [ptpv], perCapita);
    let pvKey = Object.values(ptpv["pvs"]).join("^");
    pvKeys.push(pvKey);
    dataPromises.push(axios.get(dataUrl));
  }
  result.push(titles.join(","));

  let keys = [];
  Promise.all(dataPromises).then(function (allResp) {
    let years = new Set();
    for (let i = 0; i < allResp.length; i++) {
      // Update key with name.
      for (let placeData of allResp[i].data) {
        let key = `${pvKeys[i]} ${placeData.name}`;
        tmp[key] = {};
        for (let point of placeData.points) {
          tmp[key][point[0]] = point[1];
          years.add(point[0]);
        }
        titles.push(key);
      }
    }
    result.push(titles.join(","));
    years = Array.from(years);
    years.sort();
    for (let year of years) {
      let row = [year];
      for (let i = 1; i < titles.length; i++) {
        row.push(tmp[titles[i]][year] || "");
      }
      result.push(row.join(","));
    }
    saveToFile("export.csv", result.join("\n"));
  });
}

function saveToFile(filename, csv) {
  if (!csv.match(/^data:text\/csv/i)) {
    csv = "data:text/csv;charset=utf-8," + csv;
  }
  let data = encodeURI(csv);
  let link = document.createElement("a");
  link.setAttribute("href", data);
  link.setAttribute("download", filename);
  link.click();
}

/********************************************************
 * Rendering logic
 ***********************************************************/

/*
 * Based on url params, fetch API data and render
 */
function processPage() {
  const urlargs = getUrlVars();
  toggleSpinner(true);
  clearDiv("observation");

  let placeStr = null;
  let ptpv = null;

  if ("place" in urlargs) {
    placeStr = urlargs["place"];
  }

  if ("ptpv" in urlargs) {
    ptpv = urlargs["ptpv"];
  }

  if (placeStr && ptpv) {
    drawFromChartApi("observation", placeStr, ptpv ? ptpv : "Person,count");
    let div = document.createElement("div");
    div.fontSize = "9px";
    div.innerHTML =
      "Population data from Census.gov; Labor data from bls.gov; Crime data from fbi.gov; Health data from cdc.gov";
    let parent = document.getElementById("observation");
    parent.appendChild(div);
  }
  toggleSpinner(false);
  return;
}

window.onload = function () {
  processPage();
  $("#download-button").click(function () {
    downloadData();
  });
  $("#show-code").click(function () {
    showCode();
  });
};
