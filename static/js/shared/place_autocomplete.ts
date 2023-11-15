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

import { intl, localizeLink } from "../i18n/i18n";
import { getPlaceDcids } from "../utils/place_utils";
let ac: google.maps.places.Autocomplete;
let acs: google.maps.places.AutocompleteService;

/**
 * Setup search input autocomplete
 *
 * Note: i18n.loadLocaleData must be called before this.
 */
function initSearchAutocomplete(urlPrefix: string): void {
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
  ac.addListener("place_changed", () => {
    placeChangedCallback(urlPrefix);
  });
  // Create the autocomplete service.
  acs = new google.maps.places.AutocompleteService();
}

/*
 * If the autocomplete object does not have a place_id, query the autocomplete service. Otherwise, get url for the place.
 */
function placeChangedCallback(urlPrefix: string): void {
  // Get the place details from the autocomplete object.
  const place = ac.getPlace();
  // place won't have place_id information if no autocomplete object has been selected (ie. user did not select any of the autocomplete suggestions)
  if (!place.place_id) {
    queryAutocompleteService(place.name, urlPrefix);
  } else {
    getPlaceAndRender(place.place_id, place.name, urlPrefix);
  }
}

function queryAutocompleteService(placeName: string, urlPrefix: string): void {
  acs.getPlacePredictions(
    {
      input: placeName,
      types: ["(regions)"],
    },
    queryAutocompleteCallback(placeName, urlPrefix)
  );
}

const queryAutocompleteCallback =
  (placeName: string, urlPrefix: string) => (predictions, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      getPlaceAndRender(predictions[0].place_id, placeName, urlPrefix);
    } else {
      placeNotFoundAlert(placeName);
    }
  };

// Get url for a given place_id if we have data for the place. Otherwise, alert that the place is not found.
function getPlaceAndRender(
  placeId: string,
  placeName: string,
  urlPrefix: string
): void {
  getPlaceDcids([placeId])
    .then((data) => {
      window.location.href = localizeLink(`${urlPrefix}/${data[placeId]}`);
    })
    .catch(() => {
      placeNotFoundAlert(placeName);
    });
}

function placeNotFoundAlert(placeName): void {
  // TODO(datcom): change defaultMessage to take the localized place name, from KG, not i18n.
  alert(
    intl.formatMessage(
      {
        id: "alert-no_data_for_place",
        defaultMessage: "Sorry, but we don't have any data about {placeName}",
        description:
          'Text for an alert that we show when user tries to navigate to a place with no data. For example, "Sorry, but we don\'t have any data about {Hong Kong Island, Hong Kong}".',
      },
      { placeName }
    )
  );
  const acElem = document.getElementById(
    "place-autocomplete"
  ) as HTMLInputElement;
  acElem.value = "";
  acElem.setAttribute(
    "placeholder",
    intl.formatMessage({
      id: "search_bar_placeholder-search_again",
      defaultMessage: "Search for another place",
      description:
        "Text for the Search Box after we alerted the user that data isn't available for the place they just tried.",
    })
  );
}

export { initSearchAutocomplete };
