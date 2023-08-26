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
 * Entrypoint for topic pages.
 */

import React from "react";
import ReactDOM from "react-dom";

import { DEFAULT_PAGE_PLACE_TYPE } from "../../constants/subject_page_constants";
import { loadLocaleData } from "../../i18n/i18n";
import { initSearchAutocomplete } from "../../shared/place_autocomplete";
import { setComponentRestrictions } from "../../shared/place_autocomplete";
import { NamedTypedPlace } from "../../shared/types";
import { TopicsSummary } from "../../types/app/topic_page_types";
import { App } from "./app";
import { getElementIDFunc } from "../../biomedical/bio_charts_utils";
import { ChildPlacesByType } from "../../shared/types";

window.onload = () => {
  loadLocaleData("en", [import("../../i18n/compiled-lang/en/units.json")]).then(
    () => {
      renderPage();
    }
  );
};

function renderPage(): void {
  // Get topic and render menu.
  const topic = document.getElementById("metadata").dataset.topicId;
  // TODO(beets): remove these if they remain unused.
  const dcid = document.getElementById("metadata").dataset.placeDcid;
  const morePlaces = JSON.parse(
    document.getElementById("metadata").dataset.morePlaces
  );
  const placeName = document.getElementById("place-name").dataset.pn;
  const placeType =
    document.getElementById("place-type").dataset.pt || DEFAULT_PAGE_PLACE_TYPE;
  const pageConfig = JSON.parse(
    document.getElementById("topic-config").dataset.config
  );
  const topicsSummary: TopicsSummary = JSON.parse(
    document.getElementById("topic-config").dataset.topicsSummary
  );
  const showChildPlaces = JSON.parse(document.getElementById("topic-page-options").dataset.showChildPlaces);
  const childPlaces: ChildPlacesByType = JSON.parse(
    document.getElementById("place-children").dataset.pc
  );
  const displaySearchbar = JSON.parse(document.getElementById("topic-page-options").dataset.displaySearchbar);
  
  // TODO(beets): use locale from URL
  const locale = "en";
  loadLocaleData(locale, [
    import(`../../i18n/compiled-lang/${locale}/place.json`),
    // TODO(beets): Figure out how to place this where it's used so dependencies can be automatically resolved.
    import(`../../i18n/compiled-lang/${locale}/stats_var_labels.json`),
    import(`../../i18n/compiled-lang/${locale}/units.json`),
  ]);
  const place: NamedTypedPlace = {
    dcid,
    name: placeName || dcid,
    types: [placeType],
  };

  ReactDOM.render(
    React.createElement(App, {
      place,
      morePlaces,
      topic,
      pageConfig,
      topicsSummary,
      showChildPlaces,
      childPlaces,
      displaySearchbar
    }),
    document.getElementById("body")
  );

  // Load this after the place-autocomplete input is rendered.
  initSearchAutocomplete(`/topic/${topic}`);
  setComponentRestrictions({ country: "us" }); // TO DO: Hardcoding to US for now.
}
