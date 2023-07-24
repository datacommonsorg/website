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
import { FormGroup, Input, Label } from "reactstrap";

import { Spinner } from "../../components/spinner";
import { NamedTypedPlace } from "../../shared/types";
import { getEnclosedPlaceTypes } from "../../utils/app/visualization.utils";
import { getParentPlacesPromise } from "../../utils/place_utils";
import { AppContext } from "./app_context";
import { VIS_TYPE_SELECTOR_CONFIGS } from "./vis_type_configs";

interface PlaceTypeSelectorPropType {
  titlePrefix: string;
  collapsed: boolean;
  onContinueClicked: () => void;
  setCollapsed: (collapsed: boolean) => void;
}
export function PlaceTypeSelector(
  props: PlaceTypeSelectorPropType
): JSX.Element {
  const { visType, places, enclosedPlaceType, setEnclosedPlaceType } =
    useContext(AppContext);
  const [childPlaceTypes, setChildPlaceTypes] = useState([]);
  const [typesFetched, setTypesFetched] = useState(false);
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];
  const disabled = _.isEmpty(places);

  useEffect(() => {
    if (_.isEmpty(places)) {
      return;
    }
    const getChildTypesFn =
      visTypeConfig.getChildTypesFn || getEnclosedPlaceTypes;
    loadChildPlaceTypes(getChildTypesFn);
  }, [places, visTypeConfig]);

  useEffect(() => {
    if (_.isEmpty(childPlaceTypes) || props.collapsed) {
      return;
    }
    if (childPlaceTypes.findIndex((type) => type === enclosedPlaceType) >= 0) {
      return;
    }
    setEnclosedPlaceType(childPlaceTypes[0]);
  }, [childPlaceTypes, props.collapsed]);

  return (
    <div
      className={`selector-container place-type ${
        props.collapsed ? "collapsed" : "opened"
      } ${disabled ? "disabled" : "enabled"}`}
    >
      <div className="selector-header">
        <div className="header-title">
          <span>{props.titlePrefix}Select type of place</span>
          <span
            className="material-icons-outlined"
            onClick={() => {
              if (!disabled) {
                props.setCollapsed(!props.collapsed);
              }
            }}
          >
            {props.collapsed ? "expand_more" : "expand_less"}
          </span>
        </div>
        <div className="header-subtitle">
          {props.collapsed ? enclosedPlaceType : ""}
        </div>
      </div>
      {!props.collapsed && (
        <>
          <div className="selector-body">
            {typesFetched && _.isEmpty(childPlaceTypes) && (
              <span>
                Sorry, we don&apos;t support {places[0].name}. Please select a
                different place.
              </span>
            )}
            {childPlaceTypes.map((type) => {
              return (
                <FormGroup key={type} radio="true" row>
                  <Label radio="true">
                    <Input
                      type="radio"
                      name="childPlaceType"
                      checked={type === enclosedPlaceType}
                      onChange={() => setEnclosedPlaceType(type)}
                    />
                    {type}
                  </Label>
                </FormGroup>
              );
            })}
            <Spinner isOpen={!typesFetched} />
          </div>
          <div className="selector-footer">
            {!_.isEmpty(enclosedPlaceType) && (
              <div
                className="continue-button"
                onClick={() => {
                  props.setCollapsed(true);
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

  function loadChildPlaceTypes(
    getChildTypesFn: (
      place: NamedTypedPlace,
      parentPlaces: NamedTypedPlace[]
    ) => string[]
  ): void {
    setTypesFetched(false);
    getParentPlacesPromise(places[0].dcid)
      .then((parentPlaces) => {
        setTypesFetched(true);
        const newChildPlaceTypes = getChildTypesFn(places[0], parentPlaces);
        if (_.isEqual(newChildPlaceTypes, childPlaceTypes)) {
          return;
        }
        setChildPlaceTypes(newChildPlaceTypes);
      })
      .catch(() => {
        setTypesFetched(true);
        setChildPlaceTypes([]);
      });
  }
}
