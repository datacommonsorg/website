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
 * Component for displaying selected options.
 */

import _ from "lodash";
import React, { useContext } from "react";

import { AppContext } from "./app_context";
import { VIS_TYPE_SELECTOR_CONFIGS } from "./vis_type_configs";

export function SelectedOptions(): JSX.Element {
  const { visType, places, statVars, enclosedPlaceType } =
    useContext(AppContext);
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];
  const showEnclosedPlaceType =
    enclosedPlaceType && !visTypeConfig.skipEnclosedPlaceType;
  return (
    <div className="selected-options-container">
      <div className="selected-options-places">
        {!_.isEmpty(places) && (
          <div className="selected-option">
            <span className="selected-option-label">Plot places in</span>
            <div className="selected-options">
              {places.map((place) => {
                return (
                  <div
                    className="selected-option-chip"
                    key={`selected-chip-${place.dcid}`}
                  >
                    <span className="material-icons-outlined">location_on</span>
                    <span>{place.name || place.dcid}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {showEnclosedPlaceType && (
          <div className="selected-option">
            <span className="selected-option-label">by</span>
            <div className="selected-options">
              <div className="selected-option-chip">
                <span className="material-icons-outlined">straighten</span>
                <span>{enclosedPlaceType}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {!_.isEmpty(statVars) && (
        <div className="selected-option">
          <span className="selected-option-label">Variables</span>
          <div className="selected-options">
            {statVars.map((sv) => {
              return (
                <div
                  className="selected-option-chip"
                  key={`selected-chip-${sv.dcid}`}
                >
                  <span>{sv.info.title || sv.dcid}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
