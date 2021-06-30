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

import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import axios from "axios";
import { Card, Container, CustomInput } from "reactstrap";
import { Context, IsLoadingWrapper, PlaceInfoWrapper } from "./context";
import { SearchBar } from "../timeline/search";
import { USA_CHILD_PLACE_TYPES } from "./util";

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
        loadParentPlaces(placeInfo);
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
      <Container className="place-options">
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
              countryRestrictions={["us"]}
              customPlaceHolder={"Enter a country or state to get started"}
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
                  {type}
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
  placeInfo.setEnclosedPlaceType(event.target.value);
}

/**
 * Selects the enclosing place.
 * @param place
 * @param dcid
 */
function selectPlace(place: PlaceInfoWrapper, dcid: string): void {
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
      const isUSPlace =
        place.value.selectedPlace.dcid === "country/USA" ||
        parents.findIndex((parent) => parent.dcid === "country/USA") > -1;
      let hasEnclosedPlaceTypes = false;
      if (isUSPlace && placeType in USA_CHILD_PLACE_TYPES) {
        hasEnclosedPlaceTypes = true;
        const enclosedPlacetypes = USA_CHILD_PLACE_TYPES[placeType];
        if (enclosedPlacetypes.length === 1) {
          place.setEnclosedPlaceType(enclosedPlacetypes[0]);
        }
        setEnclosedPlaceTypes(enclosedPlacetypes);
      }
      if (!hasEnclosedPlaceTypes) {
        alert(
          `Sorry, we don't support maps for ${place.value.selectedPlace.name}.` +
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
      for (const type of parent.types) {
        if (
          type in USA_CHILD_PLACE_TYPES &&
          USA_CHILD_PLACE_TYPES[type].indexOf(place.value.enclosedPlaceType) >
            -1
        ) {
          place.setEnclosingPlace({ dcid: parent.dcid, name: parent.name });
          return;
        }
      }
    }
  }
  place.setEnclosingPlace({
    dcid: selectedPlace.dcid,
    name: selectedPlace.name,
  });
}

function loadParentPlaces(place: PlaceInfoWrapper): void {
  const placeDcid = place.value.selectedPlace.dcid;
  axios
    .get(`/api/place/parent/${placeDcid}`)
    .then((resp) => {
      const parentsData = resp.data;
      const possibleTypes = Object.keys(USA_CHILD_PLACE_TYPES);
      const filteredParentsData = parentsData.filter((parent) => {
        for (const type of parent.types) {
          if (possibleTypes.includes(type)) {
            return true;
          }
        }
        return false;
      });
      const parentPlaces = filteredParentsData.map((parent) => {
        return { dcid: parent.dcid, name: parent.name, types: parent.types };
      });
      place.setParentPlaces(parentPlaces);
    })
    .catch(() => place.setParentPlaces([]));
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
