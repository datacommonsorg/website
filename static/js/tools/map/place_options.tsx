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

import axios from "axios";
import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";
import { Card, Container, CustomInput } from "reactstrap";

import { EARTH_NAMED_TYPED_PLACE } from "../../shared/constants";
import { loadParentPlaces } from "../../shared/util";
import { SearchBar } from "../timeline/search";
import { Context, IsLoadingWrapper, PlaceInfoWrapper } from "./context";
import { ENCLOSED_PLACE_TYPE_NAMES, getAllChildPlaceTypes } from "./util";

export function PlaceOptions(): JSX.Element {
  const { placeInfo, isLoading } = useContext(Context);
  const [enclosedPlaceTypes, setEnclosedPlaceTypes] = useState([]);
  useEffect(() => {
    if (placeInfo.value.selectedPlace.dcid) {
      updateEnclosedPlaceTypes(placeInfo, setEnclosedPlaceTypes);
    }
  }, [placeInfo.value.selectedPlace]);
  const placeInfoDeps = [
    placeInfo.value.enclosedPlaceType,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.selectedPlace.dcid,
    placeInfo.value.parentPlaces,
  ];
  useEffect(() => {
    if (placeInfo.value.selectedPlace.dcid) {
      if (_.isNull(placeInfo.value.parentPlaces)) {
        loadParentPlaces(
          placeInfo.value.selectedPlace.dcid,
          placeInfo.setParentPlaces
        );
      }
      if (
        placeInfo.value.enclosedPlaceType &&
        !_.isNull(placeInfo.value.parentPlaces) &&
        !placeInfo.value.enclosingPlace.dcid
      ) {
        loadEnclosingPlace(placeInfo);
      }
      if (
        placeInfo.value.enclosingPlace.dcid &&
        placeInfo.value.enclosedPlaceType &&
        _.isEmpty(placeInfo.value.enclosedPlaces)
      ) {
        loadEnclosedPlaces(placeInfo, isLoading);
      }
    }
  }, placeInfoDeps);
  return (
    <Card className="place-options-card">
      <Container className="place-options" fluid={true}>
        <div className="place-options-section" id="place-search-section">
          <div className="place-options-label">Plot places in</div>
          <div id="search">
            <SearchBar
              places={
                placeInfo.value.selectedPlace.dcid
                  ? {
                      [placeInfo.value.selectedPlace.dcid]:
                        placeInfo.value.selectedPlace.name,
                    }
                  : {}
              }
              addPlace={(e) => selectPlace(placeInfo, e)}
              removePlace={() =>
                unselectPlace(placeInfo, setEnclosedPlaceTypes)
              }
              numPlacesLimit={1}
              customPlaceHolder={"Enter a country or state to get started"}
              // Don't apply country restrictions and rely on alerts for
              // unsupported places since the API only allows 5 countries in the
              // restrictions list.
            />
          </div>
        </div>
        <div className="place-options-section">
          <div className="place-options-label">of type</div>
          <div>
            <CustomInput
              id="enclosed-place-type"
              type="select"
              value={placeInfo.value.enclosedPlaceType}
              onChange={(e) => selectEnclosedPlaceType(placeInfo, e)}
              className="pac-target-input"
            >
              <option value="">Select a place type</option>
              {enclosedPlaceTypes.map((type) => (
                <option value={type} key={type}>
                  {ENCLOSED_PLACE_TYPE_NAMES[type] || type}
                </option>
              ))}
            </CustomInput>
          </div>
        </div>
      </Container>
    </Card>
  );
}

function selectEnclosedPlaceType(
  placeInfo: PlaceInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>
): void {
  const placeType = event.target.value;
  placeInfo.setEnclosedPlaceType(placeType);
}

/**
 * Selects the enclosing place.
 * @param place
 * @param dcid
 */
function selectPlace(place: PlaceInfoWrapper, dcid: string): void {
  if (dcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    place.setSelectedPlace(EARTH_NAMED_TYPED_PLACE);
    return;
  }
  const placeTypePromise = axios
    .get(`/api/place/type/${dcid}`)
    .then((resp) => resp.data);
  const placeNamePromise = axios
    .get(`/api/place/name?dcid=${dcid}`)
    .then((resp) => resp.data);
  Promise.all([placeTypePromise, placeNamePromise])
    .then(([placeType, placeName]) => {
      const name = dcid in placeName ? placeName[dcid] : dcid;
      place.setSelectedPlace({ dcid, name, types: [placeType] });
    })
    .catch(() => {
      place.setSelectedPlace({ dcid, name: dcid, types: [] });
    });
}

/**
 * Removes the selected place
 * @param place
 */
function unselectPlace(
  place: PlaceInfoWrapper,
  setEnclosedPlaceTypes: (placeTypes: string[]) => void
): void {
  place.setSelectedPlace({ dcid: "", name: "", types: [] });
  setEnclosedPlaceTypes([]);
}

function updateEnclosedPlaceTypes(
  place: PlaceInfoWrapper,
  setEnclosedPlaceTypes: (placeTypes: string[]) => void
): void {
  const parentPlacePromise = axios
    .get(`/api/place/parent/${place.value.selectedPlace.dcid}`)
    .then((resp) => resp.data);
  const placeTypePromise = axios
    .get(`/api/place/type/${place.value.selectedPlace.dcid}`)
    .then((resp) => resp.data);
  Promise.all([parentPlacePromise, placeTypePromise])
    .then(([parents, placeType]) => {
      // TODO: manage state better here to avoid duplicate calls.
      // TODO: move Earth info to Flask (or update KG) to keep things consistent
      const selectedPlace =
        place.value.selectedPlace.dcid === EARTH_NAMED_TYPED_PLACE.dcid
          ? EARTH_NAMED_TYPED_PLACE
          : {
              dcid: place.value.selectedPlace.dcid,
              name: place.value.selectedPlace.name,
              types: [placeType],
            };
      const enclosedPlaceTypes = getAllChildPlaceTypes(selectedPlace, parents);
      if (enclosedPlaceTypes.length === 1) {
        place.setEnclosedPlaceType(enclosedPlaceTypes[0]);
      }
      setEnclosedPlaceTypes(enclosedPlaceTypes);
      if (_.isEmpty(enclosedPlaceTypes)) {
        alert(
          `Sorry, we don't support maps for ${place.value.selectedPlace.name}. ` +
            "Please select a different place."
        );
        setEnclosedPlaceTypes([]);
      }
    })
    .catch(() => {
      setEnclosedPlaceTypes([]);
    });
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

function loadEnclosedPlaces(
  place: PlaceInfoWrapper,
  isLoading: IsLoadingWrapper
): void {
  const placeDcid = place.value.enclosingPlace.dcid;
  const enclosedPlaceType = place.value.enclosedPlaceType;
  isLoading.setIsPlaceInfoLoading(true);
  axios
    .get(
      `/api/place/places-in?dcid=${placeDcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => {
      const enclosedPlaces = resp.data[placeDcid];
      isLoading.setIsPlaceInfoLoading(false);
      if (!_.isEmpty(enclosedPlaces)) {
        place.setEnclosedPlaces(
          enclosedPlaces.map((dcid) => {
            return {
              dcid,
              name: dcid,
            };
          })
        );
      } else {
        alert(
          `Sorry, ${place.value.enclosingPlace.name} does not contain places of type ` +
            `${enclosedPlaceType}. Try picking another type or place.`
        );
      }
    })
    .catch(() => {
      isLoading.setIsPlaceInfoLoading(false);
      alert(
        `Error fetching places of type ${enclosedPlaceType} for ${place.value.enclosingPlace.name}.`
      );
    });
}
