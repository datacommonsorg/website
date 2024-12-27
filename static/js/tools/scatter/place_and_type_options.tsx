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

import { PlaceSelector } from "../../shared/place_selector";
import {
  getEnclosedPlacesPromise,
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { getAllChildPlaceTypes } from "../map/util";
import { Context, IsLoadingWrapper, PlaceInfoWrapper } from "./context";
import { isPlacePicked, ScatterChartType } from "./util";
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
      getNamedTypedPlace(place.value.enclosingPlace.dcid).then(
        (enclosingPlace) => place.set({ ...place.value, enclosingPlace })
      );
      return;
    }
    if (_.isNull(place.value.parentPlaces)) {
      getParentPlacesPromise(place.value.enclosingPlace.dcid).then(
        (parentPlaces) => place.setParentPlaces(parentPlaces)
      );
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
          onClick={(): void => display.setChartType(ScatterChartType.SCATTER)}
        >
          <i className="material-icons-outlined">scatter_plot</i>
        </div>
        <div
          className={`${
            display.chartType === ScatterChartType.MAP
              ? "selected-chart-option"
              : "chart-type-option"
          }`}
          onClick={(): void => display.setChartType(ScatterChartType.MAP)}
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
      `/api/place/descendent/name?dcid=${placeDcid}&descendentType=${enclosedPlaceType}`
    )
    .then((resp) => {
      const enclosedPlacesToNames = resp.data;
      if (!_.isEmpty(enclosedPlacesToNames)) {
        const enclosedPlaces = Object.keys(enclosedPlacesToNames).map(
          (dcid) => {
            return {
              dcid,
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

export { PlaceAndTypeOptions as PlaceOptions };
