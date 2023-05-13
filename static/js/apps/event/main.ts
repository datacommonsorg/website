/**
 * Copyright 2022 Google LLC
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

/**
 * Disaster events
 */

import "../../i18n/compiled-lang/en/units.json";

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../../i18n/i18n";
import { getFilteredParentPlaces } from "../../utils/app/disaster_dashboard_utils";
import { App } from "./app";

window.onload = () => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      renderPage();
    }
  );
};

function renderPage(): void {
  // Event
  const dcid = document.getElementById("node").dataset.dcid;
  const nodeName = document.getElementById("node").dataset.nn;
  const properties = JSON.parse(document.getElementById("node").dataset.pv);
  const provenance = JSON.parse(
    document.getElementById("node").dataset.provenance
  );

  // Event place
  const placeDcid = document.getElementById("place").dataset.dcid;
  const placeName = document.getElementById("place").dataset.name || placeDcid;
  const placeTypes = [document.getElementById("place").dataset.type] || [];
  const place = { dcid: placeDcid, name: placeName, types: placeTypes };
  const parentPlaces = JSON.parse(
    document.getElementById("place").dataset.parents
  );
  const subjectConfig = JSON.parse(
    document.getElementById("subject-config").dataset.config
  );

  ReactDOM.render(
    React.createElement(App, {
      dcid,
      name: nodeName,
      properties,
      provenance,
      place,
      subjectConfig,
      parentPlaces: getFilteredParentPlaces(parentPlaces, place),
    }),
    document.getElementById("main-pane")
  );
}
