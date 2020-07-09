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

import USChartConfig from "./chart_config.json";

import {
  ChildPlace,
  MainPane,
  Menu,
  ParentPlace,
  Ranking,
} from "./place_template";

let ac: google.maps.places.Autocomplete;

const Y_SCROLL_LIMIT = 150;

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  let dcid = urlParams.get("dcid");
  renderPage(dcid);
  initAutocomplete();
  document.addEventListener("scroll", adjustMenuPosition);
};

function adjustMenuPosition() {
  let topicsEl = document.getElementById("sidebar-region");
  if (window.scrollY > Y_SCROLL_LIMIT) {
    topicsEl.style.top = window.scrollY - Y_SCROLL_LIMIT - 100 + "px";
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
  return axios
    .get(`/api/similar-place/${dcid}?stats-var=Count_Person`)
    .then((resp) => {
      let places = resp.data;
      let result = [dcid];
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
  return axios.get(`/api/parent-place/${dcid}`).then((resp) => {
    return resp.data;
  });
}

/**
 * Get nearby places.
 *
 * @param dcid The place dcid.
 */
function getNearbyPlaces(dcid: string) {
  return axios.get(`/api/nearby-place/${dcid}`).then((resp) => {
    return resp.data;
  });
}

/**
 * Get properties of all the stats vars.
 *
 * This is a temporary need before GNI supports stats var directly.
 */
function getStatsVarInfo(chartConfig) {
  let reqUrl = "/api/statsinfo?";
  let statsVars = [];
  for (let config of chartConfig) {
    for (let chart of config["charts"]) {
      statsVars = statsVars.concat(chart["statsVars"]);
    }
  }
  for (let statsVar of statsVars) {
    reqUrl += `&dcid=${statsVar}`;
  }
  return axios.get(reqUrl).then((resp) => {
    return resp.data;
  });
}

function renderPage(dcid: string) {
  const urlParams = new URLSearchParams(window.location.search);
  // Get topic and render menu.
  let topic = urlParams.get("topic");
  ReactDOM.render(
    React.createElement(Menu, {dcid: dcid, topic: topic}),
    document.getElementById("topics")
  );

  let placeType = document.getElementById("place-type").dataset.pt;

  // Get parent, child and similiar places and render main pane.
  let parentPlacesPromise = getParentPlaces(dcid);
  let childPlacesPromise = getChildPlaces(dcid);
  let similarPlacesPromise = getSimilarPlaces(dcid);
  let nearbyPlacesPromise = getNearbyPlaces(dcid);
  let statsVarInfoPromise = getStatsVarInfo(USChartConfig);

  parentPlacesPromise.then((parentPlaces) => {
    ReactDOM.render(
      React.createElement(ParentPlace, {parentPlaces: parentPlaces}),
      document.getElementById("place-parents")
    );
  });

  childPlacesPromise.then((childPlaces) => {
    ReactDOM.render(
      React.createElement(ChildPlace, {childPlaces: childPlaces}),
      document.getElementById("child-place")
    );
  });

  Promise.all([statsVarInfoPromise, parentPlacesPromise]).then(
    (resolvedValues) => {
      ReactDOM.render(
        React.createElement(MainPane,{
          dcid: dcid,
          placeType: placeType,
          topic: topic,
          statsVarInfo: resolvedValues[0],
          parentPlaces: resolvedValues[1],
          childPlacesPromise: childPlacesPromise,
          similarPlacesPromise: similarPlacesPromise,
          nearbyPlacesPromise: nearbyPlacesPromise
        }),
        document.getElementById("main-pane")
      );
      renderMap(dcid);
      renderRanking(dcid);
    }
  );
}

function renderRanking(dcid) {
  let rankingTable = document.getElementById("ranking-table");
  if (rankingTable) {
    axios.get(`api/ranking/${dcid}`).then((resp) => {
      ReactDOM.render(React.createElement(Ranking, {data: resp.data}), rankingTable);
    });
  }
}

function renderMap(dcid) {
  let mapContainer = document.getElementById("map-container");
  if (mapContainer) {
    axios.get(`api/mapinfo/${dcid}`).then((resp) => {
      const mapInfo = resp.data;
      if (!mapInfo) return;
      let mapOptions = {
        mapTypeControl: false,
        draggable: true,
        scaleControl: true,
        scrollwheel: true,
        navigationControl: true,
        streetViewControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      };
      let map = new google.maps.Map(mapContainer, mapOptions);

      // Map bounds.
      let sw = new google.maps.LatLng(mapInfo["down"], mapInfo["left"]);
      let ne = new google.maps.LatLng(mapInfo["up"], mapInfo["right"]);
      let bounds = new google.maps.LatLngBounds();
      bounds.extend(sw);
      bounds.extend(ne);
      map.fitBounds(bounds);

      // Polygons of the place.
      for (let coordinateSequence of mapInfo["coordinateSequenceSet"]) {
        let polygon = new google.maps.Polygon({
          paths: coordinateSequence,
          strokeColor: "#FF0000",
          strokeOpacity: 0.6,
          strokeWeight: 1,
          fillOpacity: 0.15,
        });
        polygon.setMap(map);
      }
    });
  }
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
  const acElem = document.getElementById("place-autocomplete") as HTMLInputElement;
  ac = new google.maps.places.Autocomplete(
    acElem,
    options
  );
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
    .catch(function (error) {
      console.log(error);
      alert("Sorry, but we don't have any data about " + name);
      const acElem = document.getElementById("place-autocomplete") as HTMLInputElement;
      acElem.value = "";
      acElem.setAttribute("placeholder", "Search for another place");
    });
}
