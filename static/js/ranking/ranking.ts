/**
 * Copyright 2026 Google LLC
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
 * @fileoverview Entry point for Ranking pages
 */

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../i18n/i18n";
import { RankingPage } from "./ranking_page";

window.addEventListener("load", (): void => {
  // Get page metadata
  const parentPlaceDcid =
    document.getElementById("within-place-dcid").dataset.pwp;
  const childPlaceType = document.getElementById("place-type").dataset.pt;
  const parentPlaceName = document.getElementById("place-name").dataset.pn;
  const statVarDcid = document.getElementById("stat-var").dataset.sv;
  const isPerCapita = JSON.parse(
    document.getElementById("per-capita").dataset.pc.toLowerCase()
  );

  // Get locale from metadata
  const metadataContainer = document.getElementById("metadata-base");
  const locale = metadataContainer.dataset.locale;

  // Get unit, scaling, and date from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const unit = urlParams.get("unit");
  let scaling = Number(urlParams.get("scaling"));
  scaling = isNaN(scaling) || scaling == 0 ? 1 : scaling;
  const date = urlParams.get("date");

  // Load locale data
  loadLocaleData(locale, [
    import(`../i18n/compiled-lang/${locale}/place.json`),
    import(`../i18n/compiled-lang/${locale}/stats_var_titles.json`),
    import(`../i18n/compiled-lang/${locale}/units.json`),
  ]).then(() => {
    ReactDOM.render(
      React.createElement(RankingPage, {
        parentPlaceName,
        childPlaceType,
        parentPlaceDcid,
        statVarDcid,
        isPerCapita,
        unit,
        scaling,
        date,
      }),
      document.getElementById("main-pane")
    );
  });
});
