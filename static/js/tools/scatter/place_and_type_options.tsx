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

import { css, useTheme } from "@emotion/react";
import axios from "axios";
import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import { Button } from "../../components/elements/button/button";
import { Public } from "../../components/elements/icons/public";
import { ScatterPlot } from "../../components/elements/icons/scatter_plot";
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
import { Context, IsLoadingWrapper, PlaceInfoWrapper } from "./context";
import { isPlacePicked, ScatterChartType } from "./util";
interface PlaceAndTypeOptionsProps {
  // Callback function to toggle the stat var widget (modal for small screen sizes).
  toggleSvHierarchyModal: () => void;
}

function PlaceAndTypeOptions(props: PlaceAndTypeOptionsProps): JSX.Element {
  const { place, isLoading, display } = useContext(Context);
  const [enclosedPlacesError, setEnclosedPlacesError] = useState<{
    placeDcid: string;
    enclosedPlaceType: string;
  } | null>(null);
  const theme = useTheme();

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
        enclosedPlacesError &&
        place.value.enclosingPlace.dcid == enclosedPlacesError.placeDcid &&
        place.value.enclosedPlaceType == enclosedPlacesError.enclosedPlaceType
      ) {
        return;
      }
      loadEnclosedPlaces(place, isLoading, setEnclosedPlacesError);
    }
  }, [place, isLoading, enclosedPlacesError]);

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
    <FormBox>
      <EnclosedPlacesSelector
        enclosedPlaceType={place.value.enclosedPlaceType}
        onEnclosedPlaceTypeSelected={place.setEnclosedPlaceType}
        onPlaceSelected={place.setEnclosingPlace}
        selectedParentPlace={place.value.enclosingPlace}
      />
      <div
        css={css`
          border-radius: 0.25rem;
          border: 1px solid ${theme.colors.border.primary.light};
          display: flex;
          flex-direction: row;
          flex-shrink: 0;
          flex-wrap: nowrap;
          overflow: hidden;
          width: fit-content;
        `}
      >
        <Button
          id="scatter-chart-type-selector-scatter"
          variant={
            display.chartType === ScatterChartType.SCATTER ? "flat" : "text"
          }
          onClick={(): void => display.setChartType(ScatterChartType.SCATTER)}
          startIcon={<ScatterPlot />}
          css={css`
            border-radius: 0.25rem;
          `}
        />
        <Button
          id="scatter-chart-type-selector-map"
          variant={display.chartType === ScatterChartType.MAP ? "flat" : "text"}
          onClick={(): void => display.setChartType(ScatterChartType.MAP)}
          startIcon={<Public />}
          css={css`
            border-radius: 0.25rem;
          `}
        />
      </div>
      <StatVarHierarchyToggleButton
        onClickCallback={props.toggleSvHierarchyModal}
        text={intl.formatMessage(
          toolMessages.selectMultipleVariablesInstruction
        )}
      />
    </FormBox>
  );
}

function loadEnclosedPlaces(
  place: PlaceInfoWrapper,
  isLoading: IsLoadingWrapper,
  setEnclosedPlacesError: (failedSettings: {
    placeDcid: string;
    enclosedPlaceType: string;
  }) => void
): void {
  const placeDcid = place.value.enclosingPlace.dcid;
  const enclosedPlaceType = place.value.enclosedPlaceType;
  let placeNamesRetrieved = false;
  isLoading.setArePlacesLoading(true);
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
        isLoading.setArePlacesLoading(false);
      }
    })
    .catch(() => {
      placeNamesRetrieved = false;
      // Get enclosed place dcids as backup if names can't be found
      getEnclosedPlacesPromise(placeDcid, enclosedPlaceType)
        .then((enclosedPlaces) => {
          isLoading.setArePlacesLoading(false);
          if (!placeNamesRetrieved) {
            if (!_.isEmpty(enclosedPlaces)) {
              place.setEnclosedPlaces(enclosedPlaces);
              isLoading.setArePlacesLoading(false);
            } else {
              setEnclosedPlacesError({ placeDcid, enclosedPlaceType });
              isLoading.setArePlacesLoading(false);
              alert(
                `Sorry, ${place.value.enclosingPlace.name} does not contain places of type ` +
                  `${enclosedPlaceType}. Try picking another type or place.`
              );
            }
          }
        })
        .catch(() => {
          isLoading.setArePlacesLoading(false);
          setEnclosedPlacesError({ placeDcid, enclosedPlaceType });
          alert(
            `Error fetching places of type ${enclosedPlaceType} for ${place.value.enclosingPlace.name}.`
          );
        });
    });
}

export { PlaceAndTypeOptions as PlaceOptions };
