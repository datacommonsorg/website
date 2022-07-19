/**
 * Copyright 2021 Google LLC
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
 * Place options for selecting the enclosing place and enclosed place type.
 */

import _ from "lodash";
import React, { useContext, useEffect } from "react";
import { Button, Col, Row } from "reactstrap";

import { PlaceSelector } from "../../shared/place_selector";
import {
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../utils/place_utils";
import { Context, PlaceInfoWrapper } from "./context";
import { getAllChildPlaceTypes } from "./util";

interface PlaceOptionsProps {
  // Callback function to toggle the stat var widget (modal for small screen sizes).
  toggleSvHierarchyModal: () => void;
}

export function PlaceOptions(props: PlaceOptionsProps): JSX.Element {
  const { placeInfo } = useContext(Context);

  useEffect(() => {
    if (!placeInfo.value.selectedPlace.dcid) {
      // Do nothing here because no place has been chosen yet.
      return;
    }
    if (_.isNull(placeInfo.value.selectedPlace.types)) {
      getNamedTypedPlace(placeInfo.value.selectedPlace.dcid).then(
        (selectedPlace) => {
          placeInfo.set({ ...placeInfo.value, selectedPlace });
        }
      );
      return;
    }
    if (_.isNull(placeInfo.value.parentPlaces)) {
      getParentPlacesPromise(placeInfo.value.selectedPlace.dcid).then(
        (parentPlaces) => placeInfo.setParentPlaces(parentPlaces)
      );
      return;
    }
    if (
      placeInfo.value.enclosedPlaceType &&
      _.isEmpty(placeInfo.value.enclosingPlace.dcid)
    ) {
      loadEnclosingPlace(placeInfo);
    }
  }, [
    placeInfo.value.selectedPlace,
    placeInfo.value.parentPlaces,
    placeInfo.value.enclosedPlaceType,
  ]);

  return (
    <PlaceSelector
      selectedPlace={placeInfo.value.selectedPlace}
      enclosedPlaceType={placeInfo.value.enclosedPlaceType}
      onPlaceSelected={placeInfo.setSelectedPlace}
      onEnclosedPlaceTypeSelected={placeInfo.setEnclosedPlaceType}
      getEnclosedPlaceTypes={getAllChildPlaceTypes}
      customSearchPlaceholder={"Enter a country or state to get started"}
    >
      <Row className="d-lg-none">
        <Col>
          <Button color="primary" onClick={props.toggleSvHierarchyModal}>
            Select variable
          </Button>
        </Col>
      </Row>
    </PlaceSelector>
  );
}

function loadEnclosingPlace(place: PlaceInfoWrapper): void {
  const selectedPlace = place.value.selectedPlace;
  if (selectedPlace.types.indexOf(place.value.enclosedPlaceType) > -1) {
    for (const parent of place.value.parentPlaces) {
      if (
        getAllChildPlaceTypes(parent, place.value.parentPlaces).indexOf(
          place.value.enclosedPlaceType
        ) > -1
      ) {
        place.setEnclosingPlace({ dcid: parent.dcid, name: parent.name });
        return;
      }
    }
  }
  place.setEnclosingPlace({
    dcid: selectedPlace.dcid,
    name: selectedPlace.name,
  });
}
