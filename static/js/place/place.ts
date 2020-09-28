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

import { ChildPlace } from "./place_children_menu";
import { Menu } from "./place_topic_menu";
import { ParentPlace } from "./place_parent_breadcrumbs";
import { MainPane } from "./place_main";

let ac: google.maps.places.Autocomplete;

let yScrollLimit = 0; // window scroll position to start fixing the sidebar
let sidebarTopMax = 0; // Max top position for the sidebar, relative to #sidebar-outer.
const Y_SCROLL_WINDOW_BREAKPOINT = 992; // Only trigger fixed sidebar beyond this window width.
const Y_SCROLL_MARGIN = 100; // Margin to apply to the fixed sidebar top.

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const dcid = urlParams.get("dcid");
  renderPage(dcid);
  initAutocomplete();
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
  sidebarTopMax = sidebarOuterHeight - sidebarRegionHeight - Y_SCROLL_MARGIN;
}

/**
 *  Toggle fixed sidebar based on window width.
 */
function maybeToggleFixedSidebar() {
  if (window.innerWidth < Y_SCROLL_WINDOW_BREAKPOINT) {
    document.removeEventListener("scroll", adjustMenuPosition);
    return;
  }
  document.addEventListener("scroll", adjustMenuPosition);
}

/**
 * Update fixed sidebar based on the window scroll.
 */
function adjustMenuPosition() {
  const topicsEl = document.getElementById("sidebar-region");
  if (window.scrollY > yScrollLimit) {
    const calcTop = window.scrollY - yScrollLimit - Y_SCROLL_MARGIN;
    if (calcTop > sidebarTopMax) {
      topicsEl.style.top = sidebarTopMax + "px";
      return;
    }
    topicsEl.style.top = calcTop + "px";
  } else {
    topicsEl.style.top = "0";
  }
}

/**
 * Get child places with filtering.
 *
 * @param {string} dcid
 */
function getChildPlaces(dcid) {
  return axios.get(`/api/place/child/${dcid}`).then((resp) => {
    return resp.data;
  });
}

/**
 * Get similar places, now using total population as the metric.
 *
 * @param dcid The place dcid
 */
function getSimilarPlaces(dcid: string) {
  return axios.get(`/api/place/similar/Count_Person/${dcid}`).then((resp) => {
    const places = resp.data;
    const result = [dcid];
    if (places.relatedPlaces) {
      result.push(...places.relatedPlaces.slice(0, 4));
    }
    return result;
  });
}

/**
 * Get parent places.
 *
 * @param dcid The place dcid.
 */
function getParentPlaces(dcid: string) {
  return axios.get(`/api/place/parent/${dcid}`).then((resp) => {
    return resp.data;
  });
}

/**
 * Get nearby places.
 *
 * @param dcid The place dcid.
 */
function getNearbyPlaces(dcid: string) {
  return axios.get(`/api/place/nearby/${dcid}`).then((resp) => {
    return resp.data;
  });
}

/**
 * Get the chart configuration.
 */
function getChartConfigData(dcid: string) {
  return axios.get("/api/chart/data/" + dcid).then((resp) => {
    return resp.data;
  });
}

function renderPage(dcid: string) {
  const urlParams = new URLSearchParams(window.location.search);
  // Get topic and render menu.
  const topic = urlParams.get("topic");
  const placeName = document.getElementById("place-name").dataset.pn;
  const placeType = document.getElementById("place-type").dataset.pt;

  // Get parent, child and similiar places and render main pane.
  const parentPlacesPromise = getParentPlaces(dcid);
  const childPlacesPromise = getChildPlaces(dcid);
  const similarPlacesPromise = getSimilarPlaces(dcid);
  const nearbyPlacesPromise = getNearbyPlaces(dcid);
  const chartConfigDataPromise = getChartConfigData(dcid);

  chartConfigDataPromise.then((chartConfigData) => {
    ReactDOM.render(
      React.createElement(Menu, {
        dcid,
        topic,
        chartConfig: chartConfigData.config,
      }),
      document.getElementById("topics")
    );
  });

  parentPlacesPromise.then((parentPlaces) => {
    ReactDOM.render(
      React.createElement(ParentPlace, { parentPlaces, placeType }),
      document.getElementById("place-type")
    );
    // Readjust sidebar based on parent places.
    updatePageLayoutState();
  });

  childPlacesPromise.then((childPlaces) => {
    // Display child places alphabetically
    for (const placeType in childPlaces) {
      childPlaces[placeType].sort((a, b) =>
        a.name < b.name ? -1 : a.name > b.name ? 1 : 0
      );
    }

    ReactDOM.render(
      React.createElement(ChildPlace, { childPlaces, placeName }),
      document.getElementById("child-place")
    );
  });

  Promise.all([
    chartConfigDataPromise,
    parentPlacesPromise,
    childPlacesPromise,
    similarPlacesPromise,
    nearbyPlacesPromise,
  ]).then(
    ([
      chartConfigData,
      parentPlaces,
      childPlaces,
      similarPlaces,
      nearbyPlaces,
    ]) => {
      const parentPlacesWithData = [];
      for (const place of parentPlaces) {
        if (place["types"][0] !== "Continent") {
          parentPlacesWithData.push(place);
        }
      }
      ReactDOM.render(
        React.createElement(MainPane, {
          dcid,
          placeName,
          placeType,
          topic,
          parentPlaces: parentPlacesWithData,
          childPlaces,
          similarPlaces,
          nearbyPlaces,
          chartConfig: chartConfigData.config,
          chartData: chartConfigData.data,
        }),
        document.getElementById("main-pane")
      );
    }
  );
}

/**
 * Setup search input autocomplete
 */
function initAutocomplete() {
  // Create the autocomplete object, restricting the search predictions to
  // geographical location types.
  const options = {
    types: ["(regions)"],
    fields: ["place_id", "name", "types"],
  };
  const acElem = document.getElementById(
    "place-autocomplete"
  ) as HTMLInputElement;
  ac = new google.maps.places.Autocomplete(acElem, options);
  ac.addListener("place_changed", getPlaceAndRender);
}

/*
 * Get place from autocomplete object and update url
 */
function getPlaceAndRender() {
  // Get the place details from the autocomplete object.
  const place = ac.getPlace();
  axios
    .get(`api/placeid2dcid/${place.place_id}`)
    .then((resp) => {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("dcid", resp.data);
      window.location.search = urlParams.toString();
    })
    .catch(() => {
      alert("Sorry, but we don't have any data about " + place.name);
      const acElem = document.getElementById(
        "place-autocomplete"
      ) as HTMLInputElement;
      acElem.value = "";
      acElem.setAttribute("placeholder", "Search for another place");
    });
}

export { updatePageLayoutState };
