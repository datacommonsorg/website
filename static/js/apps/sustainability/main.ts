/**
 * Copyright 2021 Google LLC
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
 * Entrypoint file for sustainability explorer.
 */

import "../../i18n/compiled-lang/en/units.json";

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../../i18n/i18n";
import { getFilteredParentPlaces } from "../../utils/app/disaster_dashboard_utils";
import { App } from "../sustainability/app";

window.onload = () => {
  renderPage();
};

function renderPage(): void {
  const placeDcid = document.getElementById("place").dataset.dcid;
  const placeName = document.getElementById("place").dataset.name || placeDcid;
  const placeTypes =
    JSON.parse(document.getElementById("place").dataset.type) || [];
  const dashboardConfig = JSON.parse(
    document.getElementById("dashboard-config").dataset.config
  );
  const place = { dcid: placeDcid, name: placeName, types: placeTypes };
  const parentPlaces = JSON.parse(
    document.getElementById("place").dataset.parents
  );

  Promise.resolve(
    loadLocaleData("en", [import(`../../i18n/compiled-lang/en/units.json`)])
  );

  ReactDOM.render(
    React.createElement(App, {
      place,
      dashboardConfig,
      parentPlaces: getFilteredParentPlaces(parentPlaces, place),
    }),
    document.getElementById("body")
  );
}
