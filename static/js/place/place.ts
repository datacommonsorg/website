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
import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";

import { PageData } from "../chart/types";
import { loadLocaleData } from "../i18n/i18n";
import {
  GA_EVENT_NL_SEARCH,
  GA_PARAM_QUERY,
  GA_PARAM_SOURCE,
  GA_VALUE_SEARCH_SOURCE_PLACE_PAGE,
  triggerGAEvent,
} from "../shared/ga_events";
import { ChildPlace } from "./child_places_menu";
import { MainPane, showOverview } from "./main_pane";
import { Menu } from "./menu";
import { PageSubtitle } from "./page_subtitle";
import { PlaceHighlight } from "./place_highlight";
import { isPlaceInUsa } from "./util";

// Window scroll position to start fixing the sidebar.
let yScrollLimit = 0;
// Max top position for the sidebar, relative to #sidebar-outer.
let sidebarTopMax = 0;
// Only trigger fixed sidebar beyond this window width.
const Y_SCROLL_WINDOW_BREAKPOINT = 992;
// Margin to apply to the fixed sidebar top.
const Y_SCROLL_MARGIN = 100;

window.addEventListener("load", (): void => {
  try {
    renderPage();
  } catch (e) {
    return;
  }
});

/**
 *  Make adjustments to sidebar scroll state based on the content.
 */
function updatePageLayoutState(): void {
  yScrollLimit = document.getElementById("place-summary").offsetTop;
  document.getElementById("sidebar-top-spacer").style.height =
    yScrollLimit + "px";
  const sidebarOuterHeight =
    document.getElementById("sidebar-outer").offsetHeight;
  const sidebarRegionHeight =
    document.getElementById("sidebar-region").offsetHeight;
  const footerHeight = document.getElementById("main-footer").offsetHeight;
  sidebarTopMax =
    sidebarOuterHeight - sidebarRegionHeight - Y_SCROLL_MARGIN - footerHeight;
}

/**
 * Get the landing page data
 */
async function getLandingPageData(
  dcid: string,
  category: string,
  locale: string,
  seed: string
): Promise<PageData> {
  return axios
    .get(
      `/api/landingpage/data/${dcid}?category=${category}&hl=${locale}&seed=${seed}`
    )
    .then((resp) => {
      return resp.data;
    });
}

/**
 * Set the text in the page-loading div to a sorry message.
 * Set the text to empty if summary text is present on the page.
 */
function setErrorMessage(): void {
  const summaryText = document.getElementById("place-summary").innerText;
  const loadingElem = document.getElementById("page-loading");
  if (summaryText) {
    // If summary text is present, suppress "Sorry" message
    loadingElem.innerHTML = "";
  } else {
    loadingElem.innerText =
      "Sorry, there was an error loading charts for this place.";
  }
}

function renderPage(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const urlHash = window.location.hash;
  // Get category and render menu.
  const category = urlParams.get("category") || "Overview";
  const seed = urlParams.get("seed") || "0";

  // Get place data
  const dcid = document.getElementById("title").dataset.dcid;
  const placeName = document.getElementById("place-name").dataset.pn;
  const placeType = document.getElementById("place-type").dataset.pt;

  // Get locale
  const metadataContainer = document.getElementById("metadata-base");
  const locale = metadataContainer.dataset.locale;

  // Get landing page data
  const landingPagePromise = getLandingPageData(dcid, category, locale, seed);

  // Load locale data
  Promise.all([
    landingPagePromise,
    loadLocaleData(locale, [
      import(`../i18n/compiled-lang/${locale}/place.json`),
      // TODO(beets): Figure out how to place this where it's used so dependencies can be automatically resolved.
      import(`../i18n/compiled-lang/${locale}/stats_var_labels.json`),
      import(`../i18n/compiled-lang/${locale}/units.json`),
    ]),
  ])
    .then(([landingPageData]) => {
      if (_.isEmpty(landingPageData)) {
        setErrorMessage();
        return;
      }
      const loadingElem = document.getElementById("page-loading");
      const sidebarElem = document.getElementById("sidebar-outer");
      const mainPaneElem = document.getElementById("main-pane");
      loadingElem.style.display = "none";
      sidebarElem.style.opacity = "1";
      mainPaneElem.style.opacity = "1";
      const data: PageData = landingPageData;
      const isUsaPlace = isPlaceInUsa(dcid, data.parentPlaces);

      ReactDOM.render(
        React.createElement(Menu, {
          pageChart: data.pageChart,
          categories: data.categories,
          dcid,
          selectCategory: category,
        }),
        document.getElementById("menu")
      );

      if (!showOverview(isUsaPlace, placeType, category)) {
        ReactDOM.render(
          React.createElement(PlaceHighlight, {
            dcid,
            highlight: data.highlight,
          }),
          document.getElementById("place-highlight")
        );
      }

      // Readjust sidebar based on parent places.
      // updatePageLayoutState();

      // Display child places alphabetically
      for (const placeType in data.allChildPlaces) {
        data.allChildPlaces[placeType].sort((a, b) => {
          if (!a.name && !b.name) {
            return a.dcid < b.dcid ? -1 : a.dcid > b.dcid ? 1 : 0;
          } else if (!a.name) {
            return 1;
          } else if (!b.name) {
            return -1;
          } else {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
          }
        });
      }
      ReactDOM.render(
        React.createElement(ChildPlace, {
          childPlaces: data.allChildPlaces,
          placeName,
        }),
        document.getElementById("child-place")
      );

      ReactDOM.render(
        React.createElement(PageSubtitle, {
          category,
          categoryDisplayStr: data.categories[category],
          dcid,
        }),
        document.getElementById("subtitle")
      );

      ReactDOM.render(
        React.createElement(MainPane, {
          category,
          dcid,
          isUsaPlace,
          names: data.names,
          pageChart: data.pageChart,
          placeName,
          placeType,
          childPlacesType: data.childPlacesType,
          parentPlaces: data.parentPlaces,
          categoryStrings: data.categories,
          locale,
          highlight: data.highlight,
        }),
        document.getElementById("main-pane")
      );
      window.location.hash = "";
      window.location.hash = urlHash;
    })
    .catch(() => {
      setErrorMessage();
    });
}

export { updatePageLayoutState };
