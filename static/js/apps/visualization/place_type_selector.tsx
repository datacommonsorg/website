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
import React, { useContext, useState, useEffect } from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { Spinner } from "../../components/spinner";
import { AppContext } from "./app_context";

interface PlaceTypeSelectorPropType {
  onNewSelection?: () => void;
  selectOnContinue?: boolean;
}
export function PlaceTypeSelector(
  props: PlaceTypeSelectorPropType
): JSX.Element {
  const { enclosedPlaceType, setEnclosedPlaceType, childPlaceTypes, places } =
    useContext(AppContext);
  const [selectedPlaceType, setSelectedPlaceType] = useState(enclosedPlaceType);

  useEffect(() => {
    if (selectedPlaceType !== enclosedPlaceType) {
      setSelectedPlaceType(enclosedPlaceType);
    }
  }, [enclosedPlaceType])

  return (
    <div className="place-type-selector">
      <div className="selector-body place-type">
        {!_.isNull(childPlaceTypes) && _.isEmpty(childPlaceTypes) && (
          <span className="info-message">
            Sorry, we don&apos;t support {places[0].name}. Please select a
            different place.
          </span>
        )}
        {!_.isEmpty(childPlaceTypes) &&
          childPlaceTypes.map((type) => {
            return (
              <FormGroup key={type} radio="true" row>
                <Label radio="true">
                  <Input
                    type="radio"
                    name="childPlaceType"
                    checked={type === selectedPlaceType}
                    onChange={() => {
                      if (props.selectOnContinue) {
                        setSelectedPlaceType(type);
                      } else {
                        setEnclosedPlaceType(type);
                        props.onNewSelection();
                      }
                    }}
                  />
                  {type}
                </Label>
              </FormGroup>
            );
          })}
        <Spinner isOpen={_.isNull(childPlaceTypes)} />
      </div>
      {props.selectOnContinue && !_.isEmpty(selectedPlaceType) && (
        <div className="selector-footer">
          <div
            className="primary-button continue-button"
            onClick={() => {
              setEnclosedPlaceType(selectedPlaceType)
              props.onNewSelection();
            }}
          >
            Continue
          </div>
        </div>
      )}
    </div>
  );
}
