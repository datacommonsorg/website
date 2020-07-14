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

import { initMenu } from "./menu.js";

import {
  drawFromChartApi,
  dcidToPlaceType,
  getPerCapita,
  getUrlVars,
  setSearchParam,
  clearDiv,
} from "./dc.js";

import { getApiKey, getApiRoot, isSetsEqual } from "./util.js";

require("./globals.js");

let exploreTypeVars;

let ac;
let dcid2Name = {};
let placeTypes = new Set();

/***********************************************************
 * Tree drawing
 ***********************************************************/
/*
 * Draw explore menu
 */
function drawExploreMenu(exploreTypeVars, urlargs) {
  document.querySelector("#drill").innerHTML = "";
  initMenu(exploreTypeVars, urlargs, window.evtmap);
}

/*
 * Set search input prompt
 */
function setPrompt(prompt) {
  const obsElem = document.getElementById("ac");
  obsElem.setAttribute("placeholder", prompt);
}

function nameFromID(id) {
  let parts = id.split("/");
  if (parts.length > 1) {
    return parts[1];
  } else {
    return id;
  }
}

/*
 * Show list of cities (chips)
 */
function showCityList(urlargs) {
  clearDiv("place-list");

  if ("place" in urlargs && urlargs["place"] != "") {
    const listElem = document.getElementById("place-list");

    for (const id of urlargs["place"].split(",")) {
      const elem = document.createElement("span");
      listElem.appendChild(elem);
      elem.classList.add("mdl-chip");
      elem.classList.add("mdl-chip--deletable");
      const text = document.createElement("span");
      text.classList.add("mdl-chip__text");
      const name = window.nameMap[id].name;
      if (!name || name.length < 3) {
        window.nameMap[id].name = name = nameFromID(id);
      }
      text.innerHTML = name;
      elem.appendChild(text);
      const button = document.createElement("button");
      button.classList.add("mdl-chip__action");
      const cancel = document.createElement("i");
      cancel.classList.add("material-icons");
      cancel.innerHTML = "cancel";
      button.appendChild(cancel);
      elem.appendChild(button);
      cancel.addEventListener("click", () => removePlaceFromUrl(id));
    }
  }
}

/***********************************************************
 * Rendering logic
 ***********************************************************/

/*
 * Based on url params, fetch API data and render
 */
function processPage() {
  const urlargs = getUrlVars();
  let placeStr;
  if ("place" in urlargs) {
    placeStr = urlargs["place"];
    setPrompt("Add another place");
  } else {
    renderFromUrl(urlargs);
    return;
  }

  syncPerCapita();
  const placeIds = placeStr.split(",");
  let reqUrl;

  reqUrl = `${getApiRoot()}/node/property-values?key=${getApiKey()}&property=name&`;
  for (let id of placeIds) {
    reqUrl += `&dcids=${id}`;
  }
  if (placeIds.length == 0) {
    renderFromUrl(urlargs);
    return;
  }

  toggleSpinner(true);

  $.ajax({
    type: "GET",
    url: reqUrl,
    dataType: "text",
    success: function (data) {
      let s = JSON.parse(data)["payload"];
      let v = JSON.parse(s);
      if (v) {
        for (let id in v) {
          window.nameMap[id] = { name: v[id]["out"][0]["value"] };
        }
      }
    },
    complete: function () {
      renderFromUrl(urlargs);
    },
  });
}

/*
 * Render chart, city list, and explore menu
 */
function renderFromUrl(urlargs) {
  showCityList(urlargs);
  clearDiv("observation");

  let placeStr;
  let exploreChanged = true;
  if ("place" in urlargs) {
    placeStr = urlargs["place"];
    let ptpv = null;
    if ("ptpv" in urlargs) {
      ptpv = urlargs["ptpv"];
    }

    $("#placeholder-container").hide();
    $("#observation").show();

    drawFromChartApi("observation", placeStr, ptpv ? ptpv : "Person,count");
    let link = `/tools/download#&place=${urlargs["place"]}&ptpv=${urlargs["ptpv"]}`;
    if ("pc" in urlargs && urlargs["pc"] == "1") {
      link += "&pc=1";
    }
    $("#download-link").attr("href", link).show();
  }
  let newPlaceTypes = new Set();
  if ("place" in urlargs) {
    let dcids = urlargs["place"].split(",");
    for (let dcid of dcids) {
      let pt = dcidToPlaceType(dcid);
      if (pt) {
        newPlaceTypes.add(pt);
      }
    }
  }
  exploreChanged = !isSetsEqual(newPlaceTypes, placeTypes);
  placeTypes = newPlaceTypes;
  if (exploreChanged) {
    drawExploreMenu(exploreTypeVars, urlargs);
  }
  toggleSpinner(false);
}

/**
 * Shows or hides the spinner.
 * @param {boolean} shouldShow True if the spinner should be shown.
 */
function toggleSpinner(shouldShow) {
  $("#screen").css("display", shouldShow ? "block" : "none");
}

/***********************************************************
 * Url processing
 ***********************************************************/

/*
 * Find place in url params
 */
function findAPlaceInArgs(urlargs) {
  if ("place" in urlargs && urlargs["place"] != "") {
    for (const id of urlargs["place"].split(",")) {
      const place = getPlace(allData[id]);
      if (place) return place;
    }
  }
  return null;
}

/*
 * Add place to url
 */
function addPlaceToUrl(place) {
  if (!place || place.length < 5) {
    return;
  }
  let vars = getUrlVars();
  if ("place" in vars) {
    vars["place"] = vars["place"] + "," + place;
  } else {
    vars["place"] = [place];
  }
  setSearchParam(vars);
  const ac = document.getElementById("ac");
  ac.value = "";
  setPrompt("Add another place");
}

/*
 * Remove place from url
 */
function removePlaceFromUrl(dcid) {
  let vars = getUrlVars();
  if ("place" in vars) {
    let placeStr = vars["place"];
    let placeIds = placeStr.split(",");
    if (placeIds.includes(dcid)) {
      placeIds.splice(placeIds.indexOf(dcid), 1);
    }
    if (placeIds.length == 0) {
      delete vars["place"];
      setPrompt("Find");
    } else {
      vars["place"] = placeIds.join(",");
    }
  }
  setSearchParam(vars);
}

/*
 * Toggle per capita
 */
function togglePerCapita() {
  let vars = getUrlVars();
  if ("pc" in vars) {
    if (vars["pc"] == "1") {
      vars["pc"] = "0";
    } else {
      vars["pc"] = "1";
    }
  } else {
    vars["pc"] = "1";
  }
  setSearchParam(vars);
}

function syncPerCapita() {
  let vv = getPerCapita();
  let elem = document.getElementById("percapita");
  if (vv) {
    elem.classList.add("checked");
  } else {
    elem.classList.remove("checked");
  }
}

/*
 * Setup search input autocomplete
 */
function initAutocomplete() {
  // Create the autocomplete object, restricting the search predictions to
  // geographical location types.
  const options = {
    types: ["(regions)"],
    fields: ["place_id", "name", "types"],
  };
  ac = new google.maps.places.Autocomplete(
    document.getElementById("ac"),
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
  let name = place.name;

  $.get(`/api/placeid2dcid/${place.place_id}`, function (dcid) {
    name = name.replace(", USA", "");
    dcid2Name[dcid] = name;
    addPlaceToUrl(dcid);
  }).fail(function (error) {
    console.log(error);
    alert("Sorry, but we don't have any data about " + name);
    ac.value = "";
    setPrompt("Add another place");
  });
}

function initTogglePC() {
  const checkbox = document.getElementById("percapita-link");
  checkbox.addEventListener("click", (event) => {
    togglePerCapita();
  });
}

window.onload = function () {
  initAutocomplete();
  initTogglePC();
  let vars = getUrlVars();
  if ("place" in vars && "ptpv" in vars) {
    toggleSpinner(true);
  }
  $.getJSON("/data/hierarchy.json", function (hierarchy) {
    if (window.location.href.includes("search")) {
      exploreTypeVars = hierarchy[1];
    } else {
      exploreTypeVars = hierarchy[0];
    }
    processPage();
    drawExploreMenu(exploreTypeVars, vars);
  });
};

window.onhashchange = processPage;
