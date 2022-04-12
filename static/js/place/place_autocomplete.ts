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

// Some India cities have limited data, override to show the corresponding district page.
const PLACE_OVERRIDE = {
  "wikidataId/Q1156": "wikidataId/Q2341660",
  "wikidataId/Q987": "wikidataId/Q1353",
  "wikidataId/Q1355": "wikidataId/Q806463",
  "wikidataId/Q1361": "wikidataId/Q15340",
  "wikidataId/Q1070": "wikidataId/Q401686",
  "wikidataId/Q1352": "wikidataId/Q15116",
  "wikidataId/Q1348": "wikidataId/Q2088496",
  "wikidataId/Q4629": "wikidataId/Q1797317",
  "wikidataId/Q1538": "wikidataId/Q1797336",
  "wikidataId/Q66485": "wikidataId/Q1134781",
  "wikidataId/Q47916": "wikidataId/Q1773416",
  "wikidataId/Q66568": "wikidataId/Q2089152",
  "wikidataId/Q1513": "wikidataId/Q1797367",
  "wikidataId/Q66616": "wikidataId/Q742938",
  "wikidataId/Q207749": "wikidataId/Q943099",
  "wikidataId/Q80989": "wikidataId/Q1797245",
  "wikidataId/Q200016": "wikidataId/Q15394",
  "wikidataId/Q80484": "wikidataId/Q100077",
  "wikidataId/Q11909": "wikidataId/Q578285",
  "wikidataId/Q207098": "wikidataId/Q1773444",
  "wikidataId/Q200123": "wikidataId/Q172482",
  "wikidataId/Q42941": "wikidataId/Q606343",
  "wikidataId/Q200235": "wikidataId/Q1797269",
  "wikidataId/Q174461": "wikidataId/Q1947380",
  "wikidataId/Q200663": "wikidataId/Q2086173",
  "wikidataId/Q200237": "wikidataId/Q1764627",
  "wikidataId/Q11854": "wikidataId/Q1815245",
  "wikidataId/Q79980": "wikidataId/Q1321140",
  "wikidataId/Q170115": "wikidataId/Q1506029",
  "wikidataId/Q200713": "wikidataId/Q592942",
  "wikidataId/Q244159": "wikidataId/Q2240791",
  "wikidataId/Q48403": "wikidataId/Q202822",
  "wikidataId/Q162442": "wikidataId/Q1773426",
  "wikidataId/Q205697": "wikidataId/Q1478937",
  "wikidataId/Q158467": "wikidataId/Q2085310",
  "wikidataId/Q200878": "wikidataId/Q632093",
  "wikidataId/Q9885": "wikidataId/Q15136",
  "wikidataId/Q200019": "wikidataId/Q1434965",
  "wikidataId/Q228405": "wikidataId/Q15184",
  "wikidataId/Q372773": "wikidataId/Q2295914",
  "wikidataId/Q207754": "wikidataId/Q15201",
  "wikidataId/Q41496": "wikidataId/Q15194",
  "wikidataId/Q281796": "wikidataId/Q2981389",
};

/**
 * Setup search input autocomplete
 *
 * Note: i18n.loadLocaleData must be called before this.
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
  // place won't have place_id information if no autocomplete object has been selected (ie. user did not select any of the autocomplete suggestions)
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
function getPlaceAndRender(placeId: string, placeName: string): void {
  getPlaceDcids([placeId])
    .then((data) => {
      let dcid = data[placeId];
      if (dcid in PLACE_OVERRIDE) {
        dcid = PLACE_OVERRIDE[dcid];
      }
      window.location.href = localizeLink(`/place/${dcid}`);
    })
    .catch(() => {
      placeNotFoundAlert(placeName);
    });
}

function placeNotFoundAlert(place_name): void {
  // TODO(datcom): change defaultMessage to take the localized place name, from KG, not i18n.
  alert(
    intl.formatMessage(
      {
        id: "alert-no_data_for_place",
        defaultMessage: "Sorry, but we don't have any data about {placeName}",
        description:
          'Text for an alert that we show when user tries to navigate to a place with no data. For example, "Sorry, but we don\'t have any data about {Hong Kong Island, Hong Kong}".',
      },
      { placeName: place_name }
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
