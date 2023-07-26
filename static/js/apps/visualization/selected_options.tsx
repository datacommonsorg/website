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
import React, { useContext, useEffect, useState } from "react";

import { isSelectionComplete } from "../../utils/app/visualization_utils";
import { AppContext } from "./app_context";
import { PlaceSelector } from "./place_selector";
import { PlaceTypeSelector } from "./place_type_selector";
import { VIS_TYPE_SELECTOR_CONFIGS } from "./vis_type_configs";

export function SelectedOptions(): JSX.Element {
  const { visType, places, statVars, enclosedPlaceType, setPlaces } =
    useContext(AppContext);
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];
  const showEnclosedPlaceType =
    enclosedPlaceType && !visTypeConfig.skipEnclosedPlaceType;
  const [showPlaceSelector, setShowPlaceSelector] = useState(false);
  const [showPlaceTypeSelector, setShowPlaceTypeSelector] = useState(false);
  const allowEdit = isSelectionComplete(
    visType,
    places,
    enclosedPlaceType,
    statVars
  );

  useEffect(() => {
    setShowPlaceSelector(false);
    setShowPlaceTypeSelector(false);
  }, [visType, allowEdit]);

  return (
    <div
      className={`selected-options-container ${
        visTypeConfig.singlePlace ? "row" : "column"
      }`}
    >
      <div className="selected-options-places">
        {!_.isEmpty(places) && (
          <div className="selected-option">
            <span className="selected-option-label">Plot places in</span>
            <div className="selected-option-values">
              {places.map((place) => {
                return (
                  <div
                    className="selected-option-chip"
                    key={`selected-chip-${place.dcid}`}
                  >
                    {visTypeConfig.singlePlace && (
                      <span className="material-icons-outlined">
                        location_on
                      </span>
                    )}
                    <span>{place.name || place.dcid}</span>
                    {allowEdit && (
                      <>
                        {visTypeConfig.singlePlace ? (
                          <span
                            className="material-icons-outlined action"
                            onClick={() => {
                              setShowPlaceSelector(!showPlaceSelector);
                              setShowPlaceTypeSelector(false);
                            }}
                          >
                            edit
                          </span>
                        ) : (
                          <span
                            className="material-icons-outlined action"
                            onClick={() =>
                              setPlaces(
                                places.filter((p) => p.dcid !== place.dcid)
                              )
                            }
                          >
                            close
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {!visTypeConfig.singlePlace && allowEdit && (
                <div className="add-place-container">
                  {showPlaceSelector ? (
                    <div className="selector-dropdown-anchor">
                      <div className="place-selector-dropdown">
                        <div className="header-controls">
                          <span
                            className="material-icons-outlined action"
                            onClick={() => setShowPlaceSelector(false)}
                          >
                            remove
                          </span>
                        </div>
                        <PlaceSelector
                          hideSelections={true}
                          onNewSelection={() => setShowPlaceSelector(false)}
                        />
                      </div>
                    </div>
                  ) : (
                    <span
                      className="material-icons-outlined action"
                      onClick={() => {
                        setShowPlaceSelector(true);
                        setShowPlaceTypeSelector(false);
                      }}
                    >
                      add
                    </span>
                  )}
                </div>
              )}
            </div>
            {visTypeConfig.singlePlace && showPlaceSelector && (
              <div className="selector-dropdown-anchor">
                <div className="place-selector-dropdown">
                  <PlaceSelector
                    hideSelections={true}
                    onNewSelection={() => setShowPlaceSelector(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {showEnclosedPlaceType && (
          <div className="selected-option">
            <span className="selected-option-label">by</span>
            <div className="selected-option-values">
              <div className="selected-option-chip">
                <span className="material-icons-outlined">straighten</span>
                <span>{enclosedPlaceType}</span>
                {allowEdit && (
                  <span
                    className="material-icons-outlined action"
                    onClick={() => {
                      setShowPlaceTypeSelector(!showPlaceTypeSelector);
                      setShowPlaceSelector(false);
                    }}
                  >
                    edit
                  </span>
                )}
              </div>
            </div>
            {showPlaceTypeSelector && (
              <div className="selector-dropdown-anchor">
                <div className="place-selector-dropdown">
                  <PlaceTypeSelector
                    onNewSelection={() => setShowPlaceTypeSelector(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {!_.isEmpty(statVars) && (
        <div className="selected-option">
          <span className="selected-option-label">Variables</span>
          <div className="selected-option-values">
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
