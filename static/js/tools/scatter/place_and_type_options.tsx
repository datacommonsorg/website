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

/**
 * Place options for selecting the child place type and the enclosing place.
 */

import axios from "axios";
import _ from "lodash";
import React, { useContext, useEffect } from "react";

import {
  EARTH_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { PlaceSelector } from "../../shared/place_selector";
import { NamedTypedPlace } from "../../shared/types";
import {
  getEnclosedPlacesPromise,
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { getAllChildPlaceTypes } from "../map/util";
import { isChildPlaceOf } from "../shared_util";
import { Context, IsLoadingWrapper, PlaceInfoWrapper } from "./context";
import { isPlacePicked, ScatterChartType } from "./util";

const USA_CITY_CHILD_TYPES = ["CensusZipCodeTabulationArea", "City"];
const USA_COUNTY_CHILD_TYPES = ["Town", "Village", ...USA_CITY_CHILD_TYPES];
const USA_STATE_CHILD_TYPES = ["County", ...USA_COUNTY_CHILD_TYPES];
const USA_COUNTRY_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];

const USA_CHILD_PLACE_TYPES = {
  Country: USA_COUNTRY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
  County: USA_COUNTY_CHILD_TYPES,
  City: USA_CITY_CHILD_TYPES,
};

const AA4_CHILD_PLACE_TYPES = ["AdministrativeArea5"];
const AA3_CHILD_PLACE_TYPES = ["AdministrativeArea4", ...AA4_CHILD_PLACE_TYPES];
const AA2_CHILD_PLACE_TYPES = ["AdministrativeArea3", ...AA3_CHILD_PLACE_TYPES];
const AA1_CHILD_PLACE_TYPES = ["AdministrativeArea2", ...AA2_CHILD_PLACE_TYPES];
const NUTS2_CHILD_PLACE_TYPES = ["EurostatNUTS3"];
const NUTS1_CHILD_PLACE_TYPES = ["EurostatNUTS2", ...NUTS2_CHILD_PLACE_TYPES];
const NON_USA_COUNTRY_PLACE_TYPES = [
  "AdministrativeArea1",
  ...AA1_CHILD_PLACE_TYPES,
  "EurostatNUTS1",
  ...NUTS1_CHILD_PLACE_TYPES,
];
const CONTINENT_PLACE_TYPES = ["Country", ...NON_USA_COUNTRY_PLACE_TYPES];
const CHILD_PLACE_TYPES = {
  Planet: ["Continent", ...CONTINENT_PLACE_TYPES, ...USA_COUNTRY_CHILD_TYPES],
  Continent: CONTINENT_PLACE_TYPES,
  Country: NON_USA_COUNTRY_PLACE_TYPES,
  EurostatNUTS1: NUTS1_CHILD_PLACE_TYPES,
  EurostatNUTS2: NUTS2_CHILD_PLACE_TYPES,
  AdministrativeArea1: AA1_CHILD_PLACE_TYPES,
  AdministrativeArea2: AA2_CHILD_PLACE_TYPES,
  AdministrativeArea3: AA3_CHILD_PLACE_TYPES,
  AdministrativeArea4: AA4_CHILD_PLACE_TYPES,
};

interface PlaceAndTypeOptionsProps {
  // Callback function to toggle the stat var widget (modal for small screen sizes).
  toggleSvHierarchyModal: () => void;
}

function PlaceAndTypeOptions(props: PlaceAndTypeOptionsProps): JSX.Element {
  const { place, isLoading, display } = useContext(Context);

  /**
   * Watch and update place info
   */
  useEffect(() => {
    if (!place.value.enclosingPlace.dcid) {
      // Do nothing here because no place has been chosen yet.
      return;
    }
    if (_.isNull(place.value.enclosingPlace.types)) {
      getNamedTypedPlace(
        place.value.enclosingPlace.dcid
      ).then((enclosingPlace) => place.set({ ...place.value, enclosingPlace }));
      return;
    }
    if (_.isNull(place.value.parentPlaces)) {
      getParentPlacesPromise(
        place.value.enclosingPlace.dcid
      ).then((parentPlaces) => place.setParentPlaces(parentPlaces));
      return;
    }
    if (isPlacePicked(place.value) && _.isEmpty(place.value.enclosedPlaces)) {
      loadEnclosedPlaces(place, isLoading);
    }
  }, [place.value]);

  /**
   * If map view is selected, check that map view is possible before rendering
   * the view. If map view is not possible, alert and render scatter view.
   */
  useEffect(() => {
    if (
      isPlacePicked(place.value) &&
      display.chartType === ScatterChartType.MAP &&
      !_.isNull(place.value.parentPlaces)
    ) {
      const hasMapView =
        getAllChildPlaceTypes(
          place.value.enclosingPlace,
          place.value.parentPlaces
        ).indexOf(place.value.enclosedPlaceType) > -1;
      if (!hasMapView) {
        display.setChartType(ScatterChartType.SCATTER);
        alert(
          `Sorry, map view is not supported for places in ${place.value.enclosingPlace.name} of type ${place.value.enclosedPlaceType}`
        );
      }
    }
  }, [place.value, display.chartType]);

  return (
    <PlaceSelector
      selectedPlace={place.value.enclosingPlace}
      enclosedPlaceType={place.value.enclosedPlaceType}
      onPlaceSelected={place.setEnclosingPlace}
      onEnclosedPlaceTypeSelected={place.setEnclosedPlaceType}
      getEnclosedPlaceTypes={getEnclosedPlaceTypes}
    >
      <div className="d-lg-none" id="btn-sv-widget-modal">
        <div className="btn btn-primary" onClick={props.toggleSvHierarchyModal}>
          Select variables
        </div>
      </div>
      <div className="chart-type-toggle">
        <div
          className={`${
            display.chartType === ScatterChartType.SCATTER
              ? "selected-chart-option"
              : "chart-type-option"
          }`}
          onClick={() => display.setChartType(ScatterChartType.SCATTER)}
        >
          <i className="material-icons-outlined">scatter_plot</i>
        </div>
        <div
          className={`${
            display.chartType === ScatterChartType.MAP
              ? "selected-chart-option"
              : "chart-type-option"
          }`}
          onClick={() => display.setChartType(ScatterChartType.MAP)}
        >
          <i className="material-icons-outlined">public</i>
        </div>
      </div>
    </PlaceSelector>
  );
}

function loadEnclosedPlaces(
  place: PlaceInfoWrapper,
  isLoading: IsLoadingWrapper
): void {
  const placeDcid = place.value.enclosingPlace.dcid;
  const enclosedPlaceType = place.value.enclosedPlaceType;
  let placeNamesRetrieved = false;
  axios
    .get(
      `/api/place/places-in-names?dcid=${placeDcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => {
      const enclosedPlacesToNames = resp.data;
      if (!_.isEmpty(enclosedPlacesToNames)) {
        const enclosedPlaces = Object.keys(enclosedPlacesToNames).map(
          (dcid) => {
            return {
              dcid: dcid,
              name: enclosedPlacesToNames[dcid],
            };
          }
        );
        place.setEnclosedPlaces(enclosedPlaces);
        placeNamesRetrieved = true;
      }
    })
    .catch(() => (placeNamesRetrieved = false));
  isLoading.setArePlacesLoading(true);
  getEnclosedPlacesPromise(placeDcid, enclosedPlaceType)
    .then((enclosedPlaces) => {
      isLoading.setArePlacesLoading(false);
      if (!placeNamesRetrieved) {
        if (!_.isEmpty(enclosedPlaces)) {
          place.setEnclosedPlaces(enclosedPlaces);
        } else {
          place.setEnclosedPlaceType("");
          alert(
            `Sorry, ${place.value.enclosingPlace.name} does not contain places of type ` +
              `${enclosedPlaceType}. Try picking another type or place.`
          );
        }
      }
    })
    .catch(() => {
      isLoading.setArePlacesLoading(false);
      alert(
        `Error fetching places of type ${enclosedPlaceType} for ${place.value.enclosingPlace.name}.`
      );
    });
}

function getEnclosedPlaceTypes(
  place: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[]
): string[] {
  if (place.dcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return CHILD_PLACE_TYPES[EARTH_NAMED_TYPED_PLACE.types[0]];
  }
  if (_.isEmpty(place.types)) {
    return [];
  }
  const isUSPlace = isChildPlaceOf(place.dcid, USA_PLACE_DCID, parentPlaces);
  const placeType = place.types[0];
  if (isUSPlace) {
    if (placeType in USA_CHILD_PLACE_TYPES) {
      return USA_CHILD_PLACE_TYPES[placeType] || [];
    }
  } else {
    return CHILD_PLACE_TYPES[placeType] || [];
  }
}

export { PlaceAndTypeOptions as PlaceOptions };
