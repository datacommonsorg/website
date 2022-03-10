/**
 * Copyright 2022 Google LLC
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
 * Component to select a place and a place type within the selected place.
 */

import _ from "lodash";
import React, { useEffect, useState } from "react";
import { Card, Container, CustomInput } from "reactstrap";

import { SearchBar } from "../tools/timeline/search";
import {
  ENCLOSED_PLACE_TYPE_NAMES,
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../utils/place_utils";
import { NamedTypedPlace } from "./types";

const EMPTY_NAMED_TYPED_PLACE = { dcid: "", name: "", types: null };
const SELECTOR_PREFIX = "place-selector";

interface PlaceSelectorProps {
  selectedPlace: NamedTypedPlace;
  enclosedPlaceType: string;
  onPlaceSelected: (place: NamedTypedPlace) => void;
  onEnclosedPlaceTypeSelected: (type: string) => void;
  getEnclosedPlaceTypes: (
    place: NamedTypedPlace,
    parentPlaces: NamedTypedPlace[]
  ) => string[];
  customSearchPlaceholder?: string;
  children?: React.ReactNode;
}

export function PlaceSelector(props: PlaceSelectorProps): JSX.Element {
  const [childPlaceTypes, setChildPlaceTypes] = useState([]);
  useEffect(() => {
    if (_.isNull(props.selectedPlace.types)) {
      return;
    }
    loadChildPlaceTypes();
  }, [props.selectedPlace]);

  return (
    <Card className={`${SELECTOR_PREFIX}-card`}>
      <Container className={`${SELECTOR_PREFIX}-container`} fluid={true}>
        <div
          className={`${SELECTOR_PREFIX}-section`}
          id={`${SELECTOR_PREFIX}-search-section`}
        >
          <div className={`${SELECTOR_PREFIX}-label`}>Plot places in</div>
          <SearchBar
            places={
              props.selectedPlace.dcid
                ? { [props.selectedPlace.dcid]: props.selectedPlace.name }
                : {}
            }
            addPlace={(e) => selectPlace(e, props.onPlaceSelected)}
            removePlace={() =>
              unselectPlace(props.onPlaceSelected, setChildPlaceTypes)
            }
            numPlacesLimit={1}
            customPlaceHolder={props.customSearchPlaceholder}
          />
        </div>
        <div className={`${SELECTOR_PREFIX}-section`}>
          <div className={`${SELECTOR_PREFIX}-label`}>of type</div>
          <div>
            <CustomInput
              id={`${SELECTOR_PREFIX}-dropdown`}
              type="select"
              value={props.enclosedPlaceType}
              onChange={(e) =>
                selectEnclosedPlaceType(e, props.onEnclosedPlaceTypeSelected)
              }
              className="pac-target-input"
            >
              <option value="">Select a place type</option>
              {childPlaceTypes.map((type) => (
                <option value={type} key={type}>
                  {ENCLOSED_PLACE_TYPE_NAMES[type] || type}
                </option>
              ))}
            </CustomInput>
          </div>
        </div>
        {props.children}
      </Container>
    </Card>
  );

  function loadChildPlaceTypes(): void {
    getParentPlacesPromise(props.selectedPlace.dcid)
      .then((parentPlaces) => {
        const newChildPlaceTypes = props.getEnclosedPlaceTypes(
          props.selectedPlace,
          parentPlaces
        );
        if (_.isEqual(newChildPlaceTypes, childPlaceTypes)) {
          return;
        }
        if (_.isEmpty(newChildPlaceTypes)) {
          alert(
            `Sorry, we don't support ${props.selectedPlace.name}. Please select a different place.`
          );
        } else if (newChildPlaceTypes.length === 1) {
          props.onEnclosedPlaceTypeSelected(newChildPlaceTypes[0]);
        }
        setChildPlaceTypes(newChildPlaceTypes);
      })
      .catch(() => setChildPlaceTypes([]));
  }
}

function selectPlace(
  dcid: string,
  onPlaceSelected: (place: NamedTypedPlace) => void
): void {
  getNamedTypedPlace(dcid).then((namedTypedPlace) =>
    onPlaceSelected(namedTypedPlace)
  );
}

function unselectPlace(
  onPlaceSelected: (place: NamedTypedPlace) => void,
  setChildPlaceTypes: (types: string[]) => void
): void {
  onPlaceSelected(EMPTY_NAMED_TYPED_PLACE);
  setChildPlaceTypes([]);
}

function selectEnclosedPlaceType(
  event: React.ChangeEvent<HTMLInputElement>,
  onEnclosedPlaceTypeSelected: (type: string) => void
): void {
  const placeType = event.target.value;
  onEnclosedPlaceTypeSelected(placeType);
}
