/**
 * Copyright 2023 Google LLC
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
 * Component for the place selector
 */

import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import {
  GA_EVENT_TOOL_PLACE_ADD,
  GA_PARAM_PLACE_DCID,
  triggerGAEvent,
} from "../../shared/ga_events";
import { SearchBar } from "../../shared/place_search_bar";
import { getNamedTypedPlace } from "../../utils/place_utils";
import { AppContext } from "./app_context";
import { VIS_TYPE_SELECTOR_CONFIGS } from "./vis_type_configs";

export function PlaceSelector(props: {
  hideSelections?: boolean;
  selectOnContinue?: boolean;
  onContinueClicked?: () => void;
}): JSX.Element {
  const { visType, places, setPlaces } = useContext(AppContext);
  const [selectedPlaces, setSelectedPlaces] = useState(places);
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];

  useEffect(() => {
    if (!_.isEqual(places, selectedPlaces)) {
      setSelectedPlaces(places);
    }
  }, [places]);

  useEffect(() => {
    if (visTypeConfig.singlePlace && selectedPlaces.length > 1) {
      setSelectedPlaces(selectedPlaces.slice(0, 1));
    }
  }, [visType]);

  return (
    <div className="place-selector">
      <div className="selector-body">
        {!props.hideSelections && (
          <div className="place-selector-selections">
            {selectedPlaces.map((place) => {
              return (
                <div className="selected-place" key={place.dcid}>
                  <span>{place.name || place.dcid}</span>
                  <span
                    className="material-icons-outlined"
                    onClick={() => removePlace(place.dcid)}
                  >
                    close
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <SearchBar
          places={{}}
          addPlace={addPlace}
          removePlace={removePlace}
          numPlacesLimit={1}
          customPlaceHolder="Select a place"
        />
      </div>
      {(props.selectOnContinue || props.onContinueClicked) && (
        <div className="selector-footer">
          {!_.isEmpty(selectedPlaces) && (
            <div
              className="continue-button"
              onClick={() => {
                setPlaces(selectedPlaces);
                props.onContinueClicked();
              }}
            >
              Continue
            </div>
          )}
        </div>
      )}
    </div>
  );

  function addPlace(dcid: string): void {
    if (selectedPlaces.findIndex((place) => dcid === place.dcid) >= 0) {
      return;
    }
    getNamedTypedPlace(dcid).then((namedTypedPlace) => {
      const newPlaceList = visTypeConfig.singlePlace
        ? [namedTypedPlace]
        : [...selectedPlaces, namedTypedPlace];
      if (props.selectOnContinue) {
        setSelectedPlaces(newPlaceList);
      } else {
        setPlaces(newPlaceList);
      }
    });
    triggerGAEvent(GA_EVENT_TOOL_PLACE_ADD, {
      [GA_PARAM_PLACE_DCID]: dcid,
    });
  }

  function removePlace(dcid: string): void {
    const newPlaceList = places.filter((place) => place.dcid !== dcid);
    if (props.selectOnContinue) {
      setSelectedPlaces(newPlaceList);
    } else {
      setPlaces(newPlaceList);
    }
  }
}
