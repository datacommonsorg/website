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

import { PointApiResponse } from "../../shared/stat_types";
import { saveToFile } from "../../shared/util";
import { stringifyFn } from "../../utils/axios";
import { getTokensFromUrl } from "./util";

/* Start the loading spinner and gray out the background. */
function loadSpinner(): void {
  document.getElementById("screen").classList.add("d-block");
}

/* Remove the spinner and gray background. */
function removeSpinner(): void {
  document.getElementById("screen").classList.remove("d-block");
}

/**
 * Downloads data for all places of a certain type for the specified ptpv's in
 * the chart.
 */
function downloadBulkData(
  statVars: string[],
  descendentType: string,
  ancestorDcid: string
): void {
  loadSpinner();
  axios
    .get("/api/place/descendent/name", {
      params: {
        dcid: ancestorDcid,
        descendentType,
      },
    })
    .then((resp) => {
      const placeDcids = Object.keys(resp.data);
      const placeNames = resp.data;
      axios
        .get<PointApiResponse>("/api/observations/point", {
          params: {
            entities: placeDcids,
            variables: statVars,
          },
          paramsSerializer: stringifyFn,
        })
        .then((resp) => {
          if (resp.data && resp.data.data) {
            saveToCsv(placeDcids, placeNames, statVars, resp.data.data);
          } else {
            alert("There was an error loading the data");
          }
          removeSpinner();
        })
        .catch((error) => {
          let errorMsg = "There was an error loading the statistics";
          if (error.response) {
            errorMsg += ": " + error.response.data.message;
          }
          removeSpinner();
          alert(errorMsg);
        });
    })
    .catch(() => {
      removeSpinner();
      alert("There was an error loading places");
    });
}

// TODO(beets): Define interfaces for all responses
function saveToCsv(
  placeDcids: string[],
  placeNames: { [dcid: string]: string },
  statVars: string[],
  data: any
): void {
  const results = [];
  results.push("placeDcid,placeName," + statVars.join(","));
  for (const place of placeDcids.sort()) {
    const row = [`"${place}"`, `"${placeNames[place]}"`];
    for (const sv of statVars) {
      row.push(data[sv]["stat"][place]["value"] || "");
    }
    results.push(row.join(","));
  }
  const csv = results.join("\n");
  saveToFile("datacommons_data.csv", csv);
}

window.addEventListener("load", (): void => {
  const statVars = Array.from(getTokensFromUrl("statsVar", "__"));
  const statVarDisplay = document.getElementById("statVars");
  statVarDisplay.innerText = statVars.join(", ");

  const links = document.getElementsByClassName("bulk-ref");
  for (let i = 0; i < links.length; i++) {
    const link = links.item(i) as HTMLElement;
    const ptype = link.dataset.ptype;
    link.addEventListener("click", function () {
      downloadBulkData(statVars, ptype, "country/USA");
    });
  }
});
