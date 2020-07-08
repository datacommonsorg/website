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

import { getApiKey, getApiRoot, unzip } from "./util.js";

let allData = [];
let gCurrentSeries = null;

/**
 * Values returned from the /bulk/place-obs request.
 * Objects have the following keys:
 *   name, observation: [{measuredProp, measuredValue, observationPeriod}],
 *   place: dcid
 */
let allBulkDownloadData = {};

/**
 * Measured properties to return for each ptpv during bulk download.
 * key: ptpv url arg
 * value: measuredProp
 */
let measuredProp = {};

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

/**
 * Downloads data for all places of a certain type for the specified ptpv's in
 * the chart.
 */
function downloadBulkData(placeType, year) {
  let ptPvs = [];

  let allBulkDownloadData = {};
  let measuredProp = {};

  const urlargs = getUrlVars();
  if ("ptpv" in urlargs) {
    ptPvs = parsePtPvs(urlargs["ptpv"]);
  }

  let numOutstandingRequests = ptPvs.length;

  for (const ptpv of ptPvs) {
    let urlarg = ptpv["urlarg"];
    measuredProp[urlarg] = ptpv["measuredProp"];
    let reqPv = [];
    for (const p of Object.keys(ptpv["pvs"])) {
      reqPv.push({
        property: p,
        value: ptpv["pvs"][p],
      });
    }
    $.ajax({
      type: "POST",
      url: `${getApiRoot()}/bulk/place-obs?key=${getApiKey()}`,
      data: JSON.stringify({
        observationDate: year,
        placeType: placeType,
        populationType: ptpv["popType"],
        pvs: reqPv,
      }),
      dataType: "text",
      success: function (data) {
        const payload = JSON.parse(data)["payload"];
        if (payload) {
          let data = JSON.parse(unzip(payload));
          allBulkDownloadData[urlarg] = data;
        } else {
          console.log("No payload for: ", ptpv);
        }
      },
      complete: function (jqxhr, textStatus) {
        numOutstandingRequests--;
        if (numOutstandingRequests == 0) {
          savePtpvAsCSV();
        }
      },
    });
  }
}

/**
 * Saves data for ptpv's across places of a certain type.
 */
function savePtpvAsCSV() {
  let placeData = {};
  let results = [];
  let placeNames = {};

  for (const key of Object.keys(allBulkDownloadData)) {
    let mp = measuredProp[key];
    if (!("places" in allBulkDownloadData[key])) {
      alert("Sorry we don't have data for this place type");
      return;
    }
    for (const po of allBulkDownloadData[key].places) {
      const placeName = po.name;
      const dcid = po.place;
      placeNames[dcid] = placeName;
      let val = "";
      const obs = po.observations.filter((o) => o.measuredProp === mp);
      // For place-obs, there should only be one observation per measured
      // property.
      if (obs.length) {
        let stat = getStatProp(obs);
        if (stat == null) {
          console.log("Cannot find a stat property in the observation");
        } else {
          val = obs[0][stat];
        }
      }
      if (!(dcid in placeData)) {
        placeData[dcid] = {};
      }
      placeData[dcid][key] = val;
    }
  }
  let columns = Object.keys(allBulkDownloadData);
  let titles = ["dcid", "place"];
  for (const c of columns) {
    titles.push(c.replace(/,/g, "-"));
  }

  for (const dcid of Object.keys(placeData)) {
    let row = [dcid, `"${placeNames[dcid]}"`];
    for (c of columns) {
      row.push(placeData[dcid][c]);
    }
    results.push(row.join(","));
  }
  results = results.sort((a, b) => (b[0] < a[0] ? -1 : 1)); // sort by dcid

  let csv = titles.join(",") + "\n" + results.join("\n");
  saveToFile("export.csv", csv);
  return;
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
  $("#bulk-download-button").click(function () {
    window.location.href = window.location.href.replace(
      "download",
      "bulk_download"
    );
  });
  $("#show-code").click(function () {
    showCode();
  });

  let links = document.getElementsByClassName("bulk-ref");
  for (let link of links) {
    let year = link.dataset.year;
    let ptype = link.dataset.ptype;
    link.addEventListener("click", function () {
      downloadBulkData(ptype, year);
    });
  }
};
