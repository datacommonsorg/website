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

let ac: google.maps.places.Autocomplete;
let acs: google.maps.places.AutocompleteService;

/**
 * Setup search input autocomplete
 */
function initSearchAutocomplete(): void {
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
  ac.addListener("place_changed", placeChangedCallback);
  // Create the autocomplete service.
  acs = new google.maps.places.AutocompleteService();
}

/*
 * If the autocomplete object does not have a place_id, query the autocomplete service. Otherwise, get url for the place.
 */
function placeChangedCallback(): void {
  // Get the place details from the autocomplete object.
  const place = ac.getPlace();
  if (!place.place_id) {
    queryAutocompleteService(place.name);
  } else {
    getPlaceAndRender(place.place_id, place.name);
  }
}

function queryAutocompleteService(place_name): void {
  acs.getPlacePredictions(
    {
      input: place_name,
      types: ["(regions)"],
    },
    queryAutocompleteCallback(place_name)
  );
}

const queryAutocompleteCallback = (place_name) => (predictions, status) => {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    getPlaceAndRender(predictions[0].place_id, place_name);
  } else {
    placeNotFoundAlert(place_name);
  }
};

// Get url for a given place_id if we have data for the place. Otherwise, alert that the place is not found.
function getPlaceAndRender(place_id, place_name): void {
  axios
    .get(`/api/placeid2dcid/${place_id}`)
    .then((resp) => {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("dcid", resp.data);
      window.location.search = urlParams.toString();
    })
    .catch(() => {
      placeNotFoundAlert(place_name);
    });
}

function placeNotFoundAlert(place_name): void {
  alert("Sorry, but we don't have any data about " + place_name);
  const acElem = document.getElementById(
    "place-autocomplete"
  ) as HTMLInputElement;
  acElem.value = "";
  acElem.setAttribute("placeholder", "Search for another place");
}

export { initSearchAutocomplete };
