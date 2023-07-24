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
import React, { useContext, useState } from "react";

import {
  GA_EVENT_TOOL_PLACE_ADD,
  GA_PARAM_PLACE_DCID,
  triggerGAEvent,
} from "../../shared/ga_events";
import { SearchBar } from "../../shared/place_search_bar";
import { getNamedTypedPlace } from "../../utils/place_utils";
import { AppContext } from "./app_context";
import { VIS_TYPE_SELECTOR_CONFIGS } from "./vis_type_configs";

interface PlaceSelectorPropType {
  titlePrefix: string;
  onContinueClicked: () => void;
}
export function PlaceSelector(props: PlaceSelectorPropType): JSX.Element {
  const { visType, places, setPlaces } = useContext(AppContext);
  const [collapsed, setCollapsed] = useState(!_.isEmpty(places));
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];
  const headerTitle = `${props.titlePrefix}Select${
    visTypeConfig.singlePlace ? " a" : ""
  } place${visTypeConfig.singlePlace ? "" : "s"}`;

  return (
    <div
      className={`selector-container place ${
        collapsed ? "collapsed" : "opened"
      } enabled`}
    >
      <div className="selector-header">
        <div className="header-title">
          <span>{headerTitle}</span>
          <span
            className="material-icons-outlined"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "expand_more" : "expand_less"}
          </span>
        </div>
        <div className="header-subtitle">
          {collapsed &&
            places.map((place) => place.name || place.dcid).join(", ")}
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="selector-body">
            <div className="place-selector-selections">
              {places.map((place) => {
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
            <SearchBar
              places={{}}
              addPlace={addPlace}
              removePlace={removePlace}
              numPlacesLimit={1}
              customPlaceHolder="Select a place"
            />
          </div>
          <div className="selector-footer">
            {!_.isEmpty(places) && (
              <div
                className="continue-button"
                onClick={() => {
                  setCollapsed(true);
                  props.onContinueClicked();
                }}
              >
                Continue
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  function addPlace(dcid: string): void {
    if (places.findIndex((place) => dcid === place.dcid) >= 0) {
      return;
    }
    getNamedTypedPlace(dcid).then((namedTypedPlace) => {
      if (visTypeConfig.singlePlace) {
        setPlaces([namedTypedPlace]);
      } else {
        setPlaces([...places, namedTypedPlace]);
      }
    });
    triggerGAEvent(GA_EVENT_TOOL_PLACE_ADD, {
      [GA_PARAM_PLACE_DCID]: dcid,
    });
  }

  function removePlace(dcid: string): void {
    const newPlaceList = places.filter((place) => place.dcid !== dcid);
    setPlaces(newPlaceList);
  }
}
