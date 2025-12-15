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
 * Card for selecting place(s) in our visualization tools
 */

import { css, useTheme } from "@emotion/react";
import React, { ReactNode } from "react";

import {
  GA_EVENT_TOOL_PLACE_ADD,
  GA_PARAM_PLACE_DCID,
  triggerGAEvent,
} from "../../../shared/ga_events";
import { SearchBar } from "../../../shared/place_search_bar";

interface PlaceSelectProps {
  // Child react nodes to render inside the card
  children?: ReactNode;
  // Callback to run when a place is selected
  onPlaceSelected: (placeDcid: string) => void;
  // Callback to run when a place is unselected
  onPlaceUnselected?: (placeDcid: string) => void;
  // Max number of places that can be selected in the search bar
  numPlacesLimit?: number;
  // Text to show before the search bar
  searchBarInstructionText: string;
  // Placeholder text to show in the search bar before text is entered
  searchBarPlaceholderText?: string;
  // Mapping of [dcid]: placeName of currently selected places
  selectedPlaces: Record<string, string>;
}

export function PlaceSelect(props: PlaceSelectProps): JSX.Element {
  const theme = useTheme();
  return (
    <div
      css={css`
        align-items: center;
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        flex-wrap: wrap;
        gap: ${theme.spacing.sm}px;
      `}
    >
      <div>{props.searchBarInstructionText}</div>
      <div
        css={css`
          flex-grow: 1;

          // Override old search bar styling
          #search {
            margin: 0;
          }

          // Override old search icon styling
          #search-icon {
            margin: 32px -32px 0 16px !important;
            position: relative !important;
            top: 0 !important;
          }
        `}
      >
        <SearchBar
          places={props.selectedPlaces}
          addPlace={(placeDcid): void => {
            selectPlace(placeDcid, props.onPlaceSelected);
          }}
          removePlace={(placeDcid): void =>
            unselectPlace(
              placeDcid,
              props.onPlaceSelected,
              props.onPlaceUnselected
            )
          }
          numPlacesLimit={props.numPlacesLimit}
          customPlaceHolder={props.searchBarPlaceholderText}
        />
      </div>
    </div>
  );
}

/**
 * Callback function for selecting a place.
 * @param placeDcid dcid of the place that is being selected.
 * @param onPlaceSelected function to run when place is selected.
 */
function selectPlace(
  placeDcid: string,
  onPlaceSelected?: (placeDcid: string) => void
): void {
  // Log event in Google Analytics
  triggerGAEvent(GA_EVENT_TOOL_PLACE_ADD, {
    [GA_PARAM_PLACE_DCID]: placeDcid,
  });
  onPlaceSelected?.(placeDcid);
}

/**
 * Callback function for deselecting a place.
 * @param placeDcid dcid of the place that is being deselected.
 * @param onPlaceSelected function to run when a place is selected.
 * @param onPlaceUnselected function to run when a place is deselected.
 */
function unselectPlace(
  placeDcid: string,
  onPlaceSelected?: (placeDcid: string) => void,
  onPlaceUnselected?: (placeDcid: string) => void
): void {
  onPlaceUnselected?.(placeDcid);
  onPlaceSelected?.(""); // Clear selection
}
