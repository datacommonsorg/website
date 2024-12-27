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
import React, { useContext, useEffect, useRef, useState } from "react";

import { AppContext } from "./app_context";
import { PlaceSelector } from "./place_selector";
import { PlaceTypeSelector } from "./place_type_selector";
import { VIS_TYPE_CONFIG } from "./vis_type_configs";

export function SelectedOptions(): JSX.Element {
  const { visType, places, statVars, enclosedPlaceType, setPlaces } =
    useContext(AppContext);
  const visTypeConfig = VIS_TYPE_CONFIG[visType];
  const showEnclosedPlaceType =
    enclosedPlaceType && !visTypeConfig.skipEnclosedPlaceType;
  const [showPlaceSelector, setShowPlaceSelector] = useState(false);
  const [showPlaceTypeSelector, setShowPlaceTypeSelector] = useState(false);
  const placeSelectorRef = useRef(null);
  const placeTypeSelectorRef = useRef(null);
  const emptySelections =
    _.isEmpty(places) && _.isEmpty(enclosedPlaceType) && _.isEmpty(statVars);

  useEffect(() => {
    // collapse dropdowns when click outside the dropdown
    function handleClickEvent(e: MouseEvent): void {
      if (
        placeSelectorRef.current &&
        !placeSelectorRef.current.contains(e.target)
      ) {
        setShowPlaceSelector(false);
      }
      if (
        placeTypeSelectorRef.current &&
        !placeTypeSelectorRef.current.contains(e.target)
      ) {
        setShowPlaceTypeSelector(false);
      }
    }

    window.addEventListener("click", handleClickEvent);
    return () => {
      window.removeEventListener("click", handleClickEvent);
    };
  }, []);

  return (
    <div
      className={`selected-options-container ${
        visTypeConfig.singlePlace ? "row" : "column"
      }${emptySelections ? " empty" : ""}`}
    >
      <div className="selected-options-places">
        {!_.isEmpty(places) && (
          <div
            className={`selected-option${
              showPlaceSelector && visTypeConfig.singlePlace ? " open" : ""
            }`}
          >
            <span className="selected-option-label">
              Plot places{visTypeConfig.skipEnclosedPlaceType ? "" : " in"}
            </span>
            <div className="selected-option-values">
              {places.map((place) => {
                return (
                  <div
                    className="selected-option-chip place"
                    key={`selected-chip-${place.dcid}`}
                  >
                    <div className="chip-content">
                      {visTypeConfig.singlePlace && (
                        <span className="material-icons-outlined">
                          location_on
                        </span>
                      )}
                      <span>{place.name || place.dcid}</span>
                      {visTypeConfig.singlePlace ? (
                        <span
                          className="material-icons-outlined action"
                          onClick={(e): void => {
                            e.stopPropagation();
                            setShowPlaceSelector(!showPlaceSelector);
                            setShowPlaceTypeSelector(false);
                          }}
                        >
                          edit
                        </span>
                      ) : (
                        <span
                          className="material-icons-outlined action"
                          onClick={(): void =>
                            setPlaces(
                              places.filter(
                                (p) =>
                                  !!p.dcid &&
                                  !!place.dcid &&
                                  p.dcid !== place.dcid
                              )
                            )
                          }
                        >
                          close
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {!visTypeConfig.singlePlace && (
                <div className="add-place-container">
                  {showPlaceSelector ? (
                    <div className="selector-dropdown-anchor">
                      <div
                        className="place-selector-dropdown"
                        ref={placeSelectorRef}
                      >
                        <div className="header-controls">
                          <span
                            className="material-icons-outlined action"
                            onClick={(): void => setShowPlaceSelector(false)}
                          >
                            close
                          </span>
                        </div>
                        <PlaceSelector
                          hideSelections={true}
                          onNewSelection={(): void =>
                            setShowPlaceSelector(false)
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <span
                      className="material-icons-outlined action"
                      onClick={(e): void => {
                        e.stopPropagation();
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
                <div className="place-selector-dropdown" ref={placeSelectorRef}>
                  <PlaceSelector
                    hideSelections={true}
                    onNewSelection={(): void => setShowPlaceSelector(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {showEnclosedPlaceType && (
          <div
            className={`selected-option${showPlaceTypeSelector ? " open" : ""}`}
          >
            <span className="selected-option-label">by</span>
            <div className="selected-option-values">
              <div className="selected-option-chip place-type">
                <div className="chip-content">
                  <span className="material-icons-outlined">straighten</span>
                  <span>{enclosedPlaceType}</span>
                  <span
                    className="material-icons-outlined action"
                    onClick={(e): void => {
                      e.stopPropagation();
                      setShowPlaceTypeSelector(!showPlaceTypeSelector);
                      setShowPlaceSelector(false);
                    }}
                  >
                    edit
                  </span>
                </div>
              </div>
            </div>
            {showPlaceTypeSelector && (
              <div className="selector-dropdown-anchor">
                <div
                  className="place-selector-dropdown"
                  ref={placeTypeSelectorRef}
                >
                  <PlaceTypeSelector
                    onNewSelection={(): void => setShowPlaceTypeSelector(false)}
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
                  className="selected-option-chip stat-var"
                  key={`selected-chip-${sv.dcid}`}
                >
                  <div className="chip-content">
                    <span>{sv.info.title || sv.dcid}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
