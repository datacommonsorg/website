/**
 * Copyright 2025 Google LLC
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
 * Card for selecting places in a parent place for our visualization tools.
 */

import _ from "lodash";
import React, { useEffect, useState } from "react";

import { intl } from "../../../../i18n/i18n";
import { toolMessages } from "../../../../i18n/i18n_tool_messages";
import { NamedTypedPlace } from "../../../../shared/types";
import {
  ENCLOSED_PLACE_TYPE_NAMES,
  getNamedTypedPlace,
} from "../../../../utils/place_utils";
import { PlaceSelect } from "./place_select_card";
import {
  getPlaceDcidCallback,
  loadChildPlaceTypes,
} from "./place_select_utils";

interface EnclosedPlacesSelectorProps {
  // Current selected enclosed place type.
  enclosedPlaceType: string;
  // Callback to run when a place type is selected.
  onEnclosedPlaceTypeSelected: (placeType: string) => void;
  // Callback to run when a place is selected.
  onPlaceSelected: (place: NamedTypedPlace) => void;
  // Callback to run when a place is unselected.
  onPlaceUnselected?: (place: NamedTypedPlace) => void;
  // Text to show before the search bar.
  searchBarInstructionText?: string;
  // Selected enclosing place.
  selectedParentPlace: NamedTypedPlace;
}

export function EnclosedPlacesSelector(
  props: EnclosedPlacesSelectorProps
): JSX.Element {
  const [childPlaceTypes, setChildPlaceTypes] = useState([]);

  // Handles fetching childPlaceTypes to populate place type dropdown.
  useEffect(() => {
    if (!props.selectedParentPlace?.dcid) {
      // Place has not been selected, do nothing.
      setChildPlaceTypes([]);
      return;
    }

    // If the selected parent place doesn't have types, fetch them.
    // This will trigger a re-render, and the effect will run again.
    if (!props.selectedParentPlace.types) {
      getNamedTypedPlace(props.selectedParentPlace.dcid).then((place) => {
        props.onPlaceSelected(place);
      });
      return;
    }

    // Fetch the valid child types of the parent type.
    const fetchAndSetChildPlaceTypes = async (): Promise<void> => {
      const newChildPlaceTypes = await loadChildPlaceTypes(
        props.selectedParentPlace
      );
      if (_.isEmpty(newChildPlaceTypes)) {
        // Alert user that no child place types were available.
        alert(
          intl.formatMessage(toolMessages.unsupportedEnclosedPlaceAlert, {
            placeName: props.selectedParentPlace.name,
          })
        );
      }
      if (!_.isEqual(newChildPlaceTypes, childPlaceTypes)) {
        setChildPlaceTypes(newChildPlaceTypes);
      }
    };

    fetchAndSetChildPlaceTypes();
  }, [props.selectedParentPlace]);

  // Handles auto-selection when there is only one child place type.
  useEffect(() => {
    if (childPlaceTypes.length === 1 && !props.enclosedPlaceType) {
      props.onEnclosedPlaceTypeSelected(childPlaceTypes[0]);
    }
  }, [childPlaceTypes, props.enclosedPlaceType]);

  return (
    <>
      <PlaceSelect
        onPlaceSelected={getPlaceDcidCallback(props.onPlaceSelected)}
        onPlaceUnselected={getPlaceDcidCallback(props.onPlaceUnselected)}
        numPlacesLimit={1}
        searchBarInstructionText={
          props.searchBarInstructionText || "Enter a place"
        }
        selectedPlaces={
          props.selectedParentPlace.dcid
            ? {
                [props.selectedParentPlace.dcid]:
                  props.selectedParentPlace.name,
              }
            : {}
        }
      />
      <div>of type</div>
      <div>
        <select
          id={"place-selector-place-type"}
          className="form-control"
          value={props.enclosedPlaceType}
          onChange={(event): void =>
            props.onEnclosedPlaceTypeSelected(event.target.value)
          }
        >
          <option value="">Select a place type</option>
          {childPlaceTypes.map((type) => (
            <option value={type} key={type}>
              {ENCLOSED_PLACE_TYPE_NAMES[type] || type}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
