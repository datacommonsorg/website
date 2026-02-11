/**
 * Copyright 2021 Google LLC
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
 * Place options for selecting the enclosing place and enclosed place type.
 */

import { css, useTheme } from "@emotion/react";
import _ from "lodash";
import React, { useContext, useEffect } from "react";

import { FormBox } from "../../components/form_components/form_box";
import { intl } from "../../i18n/i18n";
import { toolMessages } from "../../i18n/i18n_tool_messages";
import {
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { EnclosedPlacesSelector } from "../shared/place_selector/enclosed_places_selector";
import { StatVarHierarchyToggleButton } from "../shared/place_selector/stat_var_hierarchy_toggle_button";
import { Context, PlaceInfoWrapper } from "./context";
import { getAllChildPlaceTypes } from "./util";

interface PlaceOptionsProps {
  // Callback function to toggle the stat var widget (modal for small screen sizes).
  toggleSvHierarchyModal: () => void;
}

export function PlaceOptions(props: PlaceOptionsProps): JSX.Element {
  const { placeInfo } = useContext(Context);
  const theme = useTheme();

  useEffect(() => {
    if (!placeInfo.value.selectedPlace.dcid) {
      // Do nothing here because no place has been chosen yet.
      return;
    }
    if (_.isNull(placeInfo.value.selectedPlace.types)) {
      getNamedTypedPlace(placeInfo.value.selectedPlace.dcid).then(
        (selectedPlace) => {
          placeInfo.set({ ...placeInfo.value, selectedPlace });
        }
      );
      return;
    }
    if (_.isNull(placeInfo.value.parentPlaces)) {
      getParentPlacesPromise(placeInfo.value.selectedPlace.dcid).then(
        (parentPlaces) => placeInfo.setParentPlaces(parentPlaces)
      );
      return;
    }
    if (
      placeInfo.value.enclosedPlaceType &&
      _.isEmpty(placeInfo.value.enclosingPlace.dcid)
    ) {
      loadEnclosingPlace(placeInfo);
    }
  }, [
    placeInfo.value.selectedPlace,
    placeInfo.value.parentPlaces,
    placeInfo.value.enclosedPlaceType,
  ]);

  return (
    <div
      css={css`
        margin-bottom: ${theme.spacing.md}px;
        width: 100%;
      `}
    >
      <FormBox flexDirection="column">
        <EnclosedPlacesSelector
          enclosedPlaceType={placeInfo.value.enclosedPlaceType}
          onEnclosedPlaceTypeSelected={placeInfo.setEnclosedPlaceType}
          onPlaceSelected={placeInfo.setSelectedPlace}
          requireMaps={true}
          selectedParentPlace={placeInfo.value.selectedPlace}
          searchBarPlaceholderText={intl.formatMessage(
            toolMessages.mapToolSearchBoxPlaceholder
          )}
        />
        <StatVarHierarchyToggleButton
          onClickCallback={props.toggleSvHierarchyModal}
          text={intl.formatMessage(toolMessages.selectAVariableInstruction)}
        />
      </FormBox>
    </div>
  );
}

function loadEnclosingPlace(place: PlaceInfoWrapper): void {
  const selectedPlace = place.value.selectedPlace;
  if (selectedPlace.types.indexOf(place.value.enclosedPlaceType) > -1) {
    for (const parent of place.value.parentPlaces) {
      if (
        getAllChildPlaceTypes(parent, place.value.parentPlaces).indexOf(
          place.value.enclosedPlaceType
        ) > -1
      ) {
        place.setEnclosingPlace({ dcid: parent.dcid, name: parent.name });
        return;
      }
    }
  }
  place.setEnclosingPlace({
    dcid: selectedPlace.dcid,
    name: selectedPlace.name,
  });
}
