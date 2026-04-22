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

import { css, SerializedStyles, useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import _ from "lodash";
import React, { useEffect, useState } from "react";

import { intl } from "../../../i18n/i18n";
import { toolMessages } from "../../../i18n/i18n_tool_messages";
import { NamedTypedPlace } from "../../../shared/types";
import {
  ENCLOSED_PLACE_TYPE_NAMES,
  getNamedTypedPlace,
} from "../../../utils/place_utils";
import { PlaceSelect } from "./place_select";
import {
  getPlaceDcidCallback,
  loadChildPlaceTypes,
} from "./place_select_utils";

interface EnclosedPlacesSelectorProps {
  // Other components/elements to render next to the place type selector
  // Useful for cases like the scatter tool that has a chart type toggle
  additionalControls?: React.ReactNode;
  // Current selected enclosed place type.
  enclosedPlaceType: string;
  // Callback to run when a place type is selected.
  onEnclosedPlaceTypeSelected: (placeType: string) => void;
  // Callback to run when a place is selected.
  onPlaceSelected: (place: NamedTypedPlace) => void;
  // Whether to require maps availability for child place types.
  requireMaps?: boolean;
  // Text to show before the search bar.
  searchBarInstructionText?: string;
  // Placeholder text to show in the place search bar.
  searchBarPlaceholderText?: string;
  // Selected enclosing place.
  selectedParentPlace: NamedTypedPlace;
}

export function EnclosedPlacesSelector(
  props: EnclosedPlacesSelectorProps
): JSX.Element {
  const [childPlaceTypes, setChildPlaceTypes] = useState([]);
  const theme = useTheme();

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
        props.selectedParentPlace,
        props.requireMaps
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
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${theme.spacing.md}px;
        flex-wrap: wrap;
        flex-grow: 1;
      `}
    >
      <PlaceSelect
        onPlaceSelected={getPlaceDcidCallback(props.onPlaceSelected)}
        numPlacesLimit={1}
        searchBarInstructionText={
          props.searchBarInstructionText ||
          intl.formatMessage(toolMessages.placeSearchBoxLabel)
        }
        searchBarPlaceholderText={props.searchBarPlaceholderText}
        selectedPlaces={
          props.selectedParentPlace.dcid
            ? {
                [props.selectedParentPlace.dcid]:
                  props.selectedParentPlace.name,
              }
            : {}
        }
      />
      <div
        css={css`
          align-items: center;
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: ${theme.spacing.sm}px;
        `}
      >
        <div>{intl.formatMessage(toolMessages.placeTypeGranularityLabel)}</div>
        <PlaceTypeSelect
          id={"place-selector-place-type"}
          className="form-control"
          value={props.enclosedPlaceType}
          onChange={(event): void =>
            props.onEnclosedPlaceTypeSelected(event.target.value)
          }
          isHighlighted={
            props.selectedParentPlace.dcid && !props.enclosedPlaceType
          }
        >
          <option value="">
            {intl.formatMessage(toolMessages.placeTypeDropdownPlaceholder)}
          </option>
          {childPlaceTypes.map((type) => (
            <option value={type} key={type}>
              {ENCLOSED_PLACE_TYPE_NAMES[type] || type}
            </option>
          ))}
        </PlaceTypeSelect>
        {props.additionalControls}
      </div>
    </div>
  );
}

/** A select component with custom styling that allows the selector to be highlighted */
const PlaceTypeSelect = styled.select<{ isHighlighted: boolean }>`
  // Add a smooth transition for the highlight effect
  transition: box-shadow 0.15s ease-in-out, border-color 0.15s ease-in-out;

  // Conditionally apply highlight
  ${(props): SerializedStyles | false =>
    props.isHighlighted &&
    css`
      border-color: ${props.theme.colors.button.primary.base};
      outline: 0;
      box-shadow: 0 0 0 0.2rem ${props.theme.colors.button.primary.light};
    `}
`;
