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
import { TimelineParams } from "./timeline_util";

/**
 * Downloads data for all places of a certain type for the specified ptpv's in
 * the chart.
 */
function downloadBulkData(statVars, placeType) {
  console.log(statVars, placeType);
  axios
    .get("/api/place/places-in", {
      params: {
        dcid: "country/USA",
        placeType,
      },
    })
    .then((resp) => {
      const placeDcids = resp.data["country/USA"];
      axios
        .post("/api/stats/set", {
          places: placeDcids,
          stat_vars: statVars,
        })
        .then((resp) => {
          if (resp.data && resp.data["data"]) {
            saveToCsv(placeDcids, statVars, resp.data["data"]);
          } else {
            alert("There was an error loading that data");
          }
        })
        .catch((error) => {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            alert(
              "There was an error loading the statistics: " +
                error.response.data.message
            );
            return;
          }
          if (error.request) {
            // The request was made but no response was received
            console.log(error.request);
          } else {
            // Something happened in setting up the request that triggered an Error
            console.log("Error", error.message);
          }
          console.log(error.config);
          alert("There was an error loading the statistics");
        });
    })
    .catch((error) => {
      alert("There was an error loading places");
    });
}

function saveToCsv(placeDcids, statVars, data) {
  (window as any).data = data;
  const results = [];
  results.push("placeDcid," + statVars.join(","));
  for (const place of placeDcids.sort()) {
    const row = [place];
    for (const sv of statVars) {
      row.push(data[sv]["stat"][place]["value"]);
    }
    results.push(row.join(","));
  }
  const csv = results.join("\n");
  saveToFile("datacommons_data.csv", csv);
}

function saveToFile(filename, csv) {
  if (!csv.match(/^data:text\/csv/i)) {
    csv = "data:text/csv;charset=utf-8," + csv;
  }
  const data = encodeURI(csv);
  const link = document.createElement("a");
  link.setAttribute("href", data);
  link.setAttribute("download", filename);
  link.click();
}

window.onload = function () {
  const timelineParams = new TimelineParams();
  timelineParams.getParamsFromUrl();
  const statVars = timelineParams.getStatsVarDcids();
  const statVarDisplay = document.getElementById("statVars");
  statVarDisplay.innerText = statVars.join(", ");

  const links = document.getElementsByClassName("bulk-ref");
  for (let i = 0; i < links.length; i++) {
    const link = links.item(i) as HTMLElement;
    const ptype = link.dataset.ptype;
    link.addEventListener("click", function () {
      downloadBulkData(statVars, ptype);
    });
  }
};
