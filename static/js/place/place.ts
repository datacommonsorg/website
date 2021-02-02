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

import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import _ from "lodash";

import { ChildPlace } from "./child_places_menu";
import { MainPane } from "./main";
import { Menu } from "./topic_menu";
import { ParentPlace } from "./parent_breadcrumbs";
import { PlaceHighlight } from "./place_highlight";
import { PageSubtitle } from "./page_subtitle";
import { isPlaceInUsa } from "./util";
import { initSearchAutocomplete } from "./search";
import { loadLocaleData } from "../i18n/i18n";

import { CachedChoroplethData, GeoJsonData, PageData } from "../chart/types";

// Window scroll position to start fixing the sidebar.
let yScrollLimit = 0;
// Max top position for the sidebar, relative to #sidebar-outer.
let sidebarTopMax = 0;
// Only trigger fixed sidebar beyond this window width.
const Y_SCROLL_WINDOW_BREAKPOINT = 992;
// Margin to apply to the fixed sidebar top.
const Y_SCROLL_MARGIN = 100;
const placeTypesWithChoropleth = new Set(["Country", "State", "County"]);

window.onload = () => {
  renderPage();
  initSearchAutocomplete();
  updatePageLayoutState();
  maybeToggleFixedSidebar();
  window.onresize = maybeToggleFixedSidebar;
};

/**
 *  Make adjustments to sidebar scroll state based on the content.
 */
function updatePageLayoutState(): void {
  yScrollLimit = document.getElementById("main-pane").offsetTop;
  document.getElementById("sidebar-top-spacer").style.height =
    yScrollLimit + "px";
  const sidebarOuterHeight = document.getElementById("sidebar-outer")
    .offsetHeight;
  const sidebarRegionHeight = document.getElementById("sidebar-region")
    .offsetHeight;
  const footerHeight = document.getElementById("main-footer").offsetHeight;
  sidebarTopMax =
    sidebarOuterHeight - sidebarRegionHeight - Y_SCROLL_MARGIN - footerHeight;
}

/**
 *  Toggle fixed sidebar based on window width.
 */
function maybeToggleFixedSidebar(): void {
  if (window.innerWidth < Y_SCROLL_WINDOW_BREAKPOINT) {
    document.removeEventListener("scroll", adjustMenuPosition);
    document.getElementById("sidebar-region").classList.remove("fixed");
    return;
  }
  document.addEventListener("scroll", adjustMenuPosition);
  document.getElementById("sidebar-region").style.width =
    document.getElementById("sidebar-top-spacer").offsetWidth + "px";
  adjustMenuPosition();
}

/**
 * Update fixed sidebar based on the window scroll.
 */
function adjustMenuPosition(): void {
  const topicsEl = document.getElementById("sidebar-region");
  if (window.scrollY > yScrollLimit) {
    const calcTop = window.scrollY - yScrollLimit - Y_SCROLL_MARGIN;
    if (calcTop > sidebarTopMax) {
      topicsEl.style.top = sidebarTopMax + "px";
      topicsEl.classList.remove("fixed");
      return;
    }
    topicsEl.classList.add("fixed");
    if (topicsEl.style.top != "0") {
      topicsEl.style.top = "0";
      topicsEl.scrollTop = 0;
    }
  } else {
    topicsEl.classList.remove("fixed");
    topicsEl.style.top = "0";
  }
}

/**
 * Get the geo json info for choropleth charts.
 */
async function getGeoJsonData(
  dcid: string,
  placeType: string,
  locale: string
): Promise<GeoJsonData> {
  if (shouldMakeChoroplethCalls(dcid, placeType)) {
    return axios.get(`/api/chart/geojson/${dcid}?hl=${locale}`).then((resp) => {
      return resp.data;
    });
  } else {
    return Promise.resolve(null);
  }
}

/**
 * Get the stat var data for choropleth charts.
 */
async function getChoroplethData(
  dcid: string,
  placeType: string
): Promise<CachedChoroplethData> {
  if (shouldMakeChoroplethCalls(dcid, placeType)) {
    return axios.get(`/api/chart/choroplethdata/${dcid}`).then((resp) => {
      return resp.data;
    });
  } else {
    return Promise.resolve({});
  }
}

/**
 * Get the landing page data
 */
async function getLandingPageData(
  dcid: string,
  locale: string
): Promise<PageData> {
  return axios
    .get(`/api/landingpage/data/${dcid}?hl=${locale}`)
    .then((resp) => {
      return resp.data;
    });
}

function shouldMakeChoroplethCalls(dcid: string, placeType: string): boolean {
  const isInUSA: boolean =
    dcid.startsWith("geoId") || dcid.startsWith("country/USA");
  return isInUSA && placeTypesWithChoropleth.has(placeType);
}

function renderPage(): void {
  const urlParams = new URLSearchParams(window.location.search);
  // Get topic and render menu.
  let topic = urlParams.get("topic") || "Overview";
  const dcid = document.getElementById("title").dataset.dcid;
  const placeName = document.getElementById("place-name").dataset.pn;
  const placeType = document.getElementById("place-type").dataset.pt;
  const locale = document.getElementById("locale").dataset.lc;
  const landingPagePromise = getLandingPageData(dcid, locale);
  const chartGeoJsonPromise = getGeoJsonData(dcid, placeType, locale);
  const choroplethDataPromise = getChoroplethData(dcid, placeType);

  Promise.all([
    landingPagePromise,
    loadLocaleData(locale, [
      import(`../i18n/compiled-lang/${locale}/place.json`),
      // TODO(beets): Figure out how to place this where it's used so dependencies can be automatically resolved.
      import(`../i18n/compiled-lang/${locale}/stats_var_labels.json`),
    ]),
  ])
    .then(([landingPageData]) => {
      const loadingElem = document.getElementById("page-loading");
      if (_.isEmpty(landingPageData)) {
        loadingElem.innerText =
          "Sorry, we don't have any charts to show for this place.";
        return;
      }
      loadingElem.style.display = "none";
      const data: PageData = landingPageData;
      const isUsaPlace = isPlaceInUsa(dcid, data.parentPlaces);
      if (Object.keys(data.pageChart).length == 1) {
        topic = "Overview";
      }
      ReactDOM.render(
        React.createElement(Menu, {
          pageChart: data.pageChart,
          categories: data.categories,
          dcid,
          topic,
        }),
        document.getElementById("topics")
      );

      // Earth has no parent places.
      if (data.parentPlaces.length > 0) {
        ReactDOM.render(
          React.createElement(ParentPlace, {
            names: data.names,
            parentPlaces: data.parentPlaces,
            placeType,
          }),
          document.getElementById("place-type")
        );
      }
      ReactDOM.render(
        React.createElement(PlaceHighlight, {
          dcid,
          highlight: data.highlight,
        }),
        document.getElementById("place-highlight")
      );

      // Readjust sidebar based on parent places.
      updatePageLayoutState();

      // Display child places alphabetically
      for (const placeType in data.allChildPlaces) {
        data.allChildPlaces[placeType].sort((a, b) =>
          a.name < b.name ? -1 : a.name > b.name ? 1 : 0
        );
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
          category: topic,
          categoryDisplayStr: data.categories[topic],
          dcid,
        }),
        document.getElementById("subtitle")
      );
      ReactDOM.render(
        React.createElement(MainPane, {
          topic,
          dcid,
          isUsaPlace,
          names: data.names,
          pageChart: data.pageChart,
          placeName,
          placeType,
          geoJsonData: chartGeoJsonPromise,
          choroplethData: choroplethDataPromise,
          childPlacesType: data.childPlacesType,
          parentPlaces: data.parentPlaces,
          categoryStrings: data.categories,
          locale,
        }),
        document.getElementById("main-pane")
      );
    })
    .catch(() => {
      const loadingElem = document.getElementById("page-loading");
      loadingElem.innerText =
        "Sorry, there was an error loading charts for this place.";
    });
}

export { updatePageLayoutState };
