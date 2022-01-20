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

import React from "react";
import ReactDOM from "react-dom";

import { loadLocaleData } from "../i18n/i18n";
import { NamedTypedPlace } from "../shared/types";
import { MainPane } from "./main_pane";

window.onload = () => {
  renderPage();
};

function renderPage(): void {
  const urlParams = new URLSearchParams(window.location.search);
  // Get topic and render menu.
  const topic = urlParams.get("topic");
  // TODO(beets): remove these if they remain unused.
  const dcid = document.getElementById("title").dataset.dcid;
  const placeName = document.getElementById("place-name").dataset.pn;
  const placeType = document.getElementById("place-type").dataset.pt;
  const pageConfig = JSON.parse(
    document.getElementById("topic-config").dataset.config
  );

  // TODO(beets): use locale from URL
  const locale = "en";
  loadLocaleData(locale, [
    import(`../i18n/compiled-lang/${locale}/place.json`),
    // TODO(beets): Figure out how to place this where it's used so dependencies can be automatically resolved.
    import(`../i18n/compiled-lang/${locale}/stats_var_labels.json`),
    import(`../i18n/compiled-lang/${locale}/units.json`),
  ]);
  const place: NamedTypedPlace = {
    dcid,
    name: placeName || dcid,
    types: [placeType],
  };

  ReactDOM.render(
    React.createElement(MainPane, {
      topic,
      place,
      pageConfig,
    }),
    document.getElementById("main-pane")
  );
}
