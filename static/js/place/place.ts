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

import { ChildPlace } from "./child_places_menu";
import { MainPane } from "./main";
import { Menu } from "./topic_menu";
import { ParentPlace } from "./parent_breadcrumbs";
import { PlaceHighlight } from "./place_highlight";
import { isPlaceInUsa } from "./util";

import { PageData } from "./types";

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

function renderPage(dcid: string) {
  const urlParams = new URLSearchParams(window.location.search);
  // Get topic and render menu.
  const topic = urlParams.get("topic") || "Overview";
  const placeName = document.getElementById("place-name").dataset.pn;
  const placeType = document.getElementById("place-type").dataset.pt;

  axios.get("/api/landingpage/data/" + dcid).then((resp) => {
    const data: PageData = resp.data;
    const isUsaPlace = isPlaceInUsa(dcid, data.parentPlaces);

    ReactDOM.render(
      React.createElement(Menu, {
        pageChart: data.pageChart,
        dcid,
        topic,
      }),
      document.getElementById("topics")
    );

    ReactDOM.render(
      React.createElement(ParentPlace, {
        names: data.names,
        parentPlaces: data.parentPlaces,
        placeType,
      }),
      document.getElementById("place-type")
    );

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
      React.createElement(MainPane, {
        category: topic,
        dcid,
        isUsaPlace,
        names: data.names,
        pageChart: data.pageChart,
        placeName,
        placeType,
      }),
      document.getElementById("main-pane")
    );
  });
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
