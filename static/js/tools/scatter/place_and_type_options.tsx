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

import axios, { AxiosRequestConfig } from "axios";
import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import { FormBox } from "../../components/form_components/form_box";
import { intl } from "../../i18n/i18n";
import { toolMessages } from "../../i18n/i18n_tool_messages";
import {
  getEnclosedPlacesPromise,
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { getAllChildPlaceTypes } from "../map/util";
import { EnclosedPlacesSelector } from "../shared/place_selector/enclosed_places_selector";
import { StatVarHierarchyToggleButton } from "../shared/place_selector/stat_var_hierarchy_toggle_button";
import { ChartTypeToggle } from "./chart_type_toggle";
import { Context, IsLoadingWrapper, PlaceInfoWrapper } from "./context";
import { isPlacePicked, ScatterChartType } from "./util";

// A specific parent place and enclosed place type combination
interface PlaceAndTypeSettings {
  placeDcid: string;
  enclosedPlaceType: string;
}

interface PlaceAndTypeOptionsProps {
  // Callback function to toggle the stat var widget (modal for small screen sizes).
  toggleSvHierarchyModal: () => void;
}

function PlaceAndTypeOptions(props: PlaceAndTypeOptionsProps): JSX.Element {
  const { place, isLoading, display } = useContext(Context);
  // Store the last place and place type combination that resulted in a failed fetch
  const [failedEnclosedPlaces, setFailedEnclosedPlaces] =
    useState<PlaceAndTypeSettings | null>(null);

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
      if (
        failedEnclosedPlaces &&
        place.value.enclosingPlace.dcid == failedEnclosedPlaces.placeDcid &&
        place.value.enclosedPlaceType == failedEnclosedPlaces.enclosedPlaceType
      ) {
        // Place options selected match a previously failed fetch, do not repeat
        return;
      }
      const controller = new AbortController();
      loadEnclosedPlaces(
        place,
        isLoading,
        setFailedEnclosedPlaces,
        controller.signal
      );
      return () => {
        // Abort any old axios calls if component re-renders
        controller.abort();
      };
    }
  }, [place, isLoading, failedEnclosedPlaces]);

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
  }, [place.value, display]);

  return (
    <FormBox flexDirection="column">
      <EnclosedPlacesSelector
        enclosedPlaceType={place.value.enclosedPlaceType}
        onEnclosedPlaceTypeSelected={place.setEnclosedPlaceType}
        onPlaceSelected={place.setEnclosingPlace}
        selectedParentPlace={place.value.enclosingPlace}
        additionalControls={<ChartTypeToggle />}
      />
      <StatVarHierarchyToggleButton
        onClickCallback={props.toggleSvHierarchyModal}
        text={intl.formatMessage(
          toolMessages.selectMultipleVariablesInstruction
        )}
      />
    </FormBox>
  );
}

/**
 * Fetches enclosed places within a parent place for a specific child place type.
 * @param place State object holding the enclosing place and child place type.
 * @param isLoading State object for tracking loading status.
 * @param setEnclosedPlacesError Callback to record settings that caused a fetch failure.
 * @param signal Signal for aborting the axios request.
 */
function loadEnclosedPlaces(
  place: PlaceInfoWrapper,
  isLoading: IsLoadingWrapper,
  setEnclosedPlacesError: (failedSettings: PlaceAndTypeSettings) => void,
  signal: AxiosRequestConfig["signal"]
): void {
  const placeDcid = place.value.enclosingPlace.dcid;
  const enclosedPlaceType = place.value.enclosedPlaceType;
  isLoading.setArePlacesLoading(true);
  axios
    .get(
      `/api/place/descendent/name?dcid=${placeDcid}&descendentType=${enclosedPlaceType}`,
      { signal }
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
      } else {
        // Fetch returned no enclosed places
        // Record the place and enclosed place type that resulted in no enclosed places
        place.setEnclosedPlaces([]);
        setEnclosedPlacesError({ placeDcid, enclosedPlaceType });
      }
      isLoading.setArePlacesLoading(false);
    })
    .catch((error) => {
      if (axios.isCancel(error)) {
        // Skip catch actions if request is canceled
        return;
      }
      // Get enclosed place dcids as backup if names can't be found
      getEnclosedPlacesPromise(placeDcid, enclosedPlaceType, signal)
        .then((enclosedPlaces) => {
          isLoading.setArePlacesLoading(false);
          if (!_.isEmpty(enclosedPlaces)) {
            place.setEnclosedPlaces(enclosedPlaces);
          } else {
            // Record the place and enclosed place type that resulted in no enclosed places
            setEnclosedPlacesError({ placeDcid, enclosedPlaceType });
            alert(
              `Sorry, ${place.value.enclosingPlace.name} does not contain places of type ` +
                `${enclosedPlaceType}. Try picking another type or place.`
            );
          }
        })
        .catch(() => {
          if (axios.isCancel(error)) {
            // Skip catch actions if request is canceled
            return;
          }
          // Record the place and enclosed place type that resulted in an error
          setEnclosedPlacesError({ placeDcid, enclosedPlaceType });
          isLoading.setArePlacesLoading(false);
          alert(
            `Error fetching places of type ${enclosedPlaceType} for ${place.value.enclosingPlace.name}.`
          );
        });
    });
}

export { PlaceAndTypeOptions as PlaceOptions };
