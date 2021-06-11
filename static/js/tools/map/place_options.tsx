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
    if (placeInfo.value.enclosingPlace.dcid) {
      updateEnclosedPlaceTypes(
        placeInfo.value.enclosingPlace.dcid,
        setEnclosedPlaceTypes
      );
    }
  }, [placeInfo.value.enclosingPlace]);
  useEffect(() => {
    const placeInfoVal = placeInfo.value;
    if (placeInfoVal.enclosingPlace.dcid) {
      if (_.isNull(placeInfoVal.parentPlaces)) {
        loadParentPlaces(placeInfo);
      }
      if (
        placeInfoVal.enclosedPlaceType &&
        _.isEmpty(placeInfoVal.enclosedPlaces)
      ) {
        loadEnclosedPlaces(placeInfo, isLoading);
      }
    }
  }, [placeInfo.value]);
  return (
    <Card className="place-options-card">
      <Container className="place-options">
        <div className="place-options-section" id="place-search-section">
          <div className="place-options-label">Plot places in</div>
          <div id="search">
            <SearchBar
              places={
                placeInfo.value.enclosingPlace.dcid
                  ? {
                      [placeInfo.value.enclosingPlace.dcid]:
                        placeInfo.value.enclosingPlace.name,
                    }
                  : {}
              }
              addPlace={(e) => selectEnclosingPlace(placeInfo, e)}
              removePlace={() =>
                unselectEnclosingPlace(placeInfo, setEnclosedPlaceTypes)
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
function selectEnclosingPlace(place: PlaceInfoWrapper, dcid: string): void {
  axios
    .get(`/api/place/name?dcid=${dcid}`)
    .then((resp) => {
      place.setEnclosingPlace({ dcid: dcid, name: resp.data[dcid] });
    })
    .catch(() => {
      place.setEnclosingPlace({ dcid: dcid, name: dcid });
    });
}

/**
 * Removes the enclosing place
 * @param place
 */
function unselectEnclosingPlace(
  place: PlaceInfoWrapper,
  setEnclosedPlaceTypes: (placeTypes: string[]) => void
): void {
  place.setEnclosingPlace({ dcid: "", name: "" });
  setEnclosedPlaceTypes([]);
}

function updateEnclosedPlaceTypes(
  dcid: string,
  setEnclosedPlaceTypes: (placeTypes: string[]) => void
): void {
  const parentPlacePromise = axios
    .get(`/api/place/parent/${dcid}`)
    .then((resp) => resp.data);
  const placeTypePromise = axios
    .get(`/api/place/type/${dcid}`)
    .then((resp) => resp.data);
  Promise.all([parentPlacePromise, placeTypePromise])
    .then(([parents, placeType]) => {
      const isUSPlace =
        dcid === "country/USA" ||
        parents.findIndex((parent) => parent.dcid === "country/USA") > -1;
      if (isUSPlace) {
        if (placeType in USA_CHILD_PLACE_TYPES) {
          setEnclosedPlaceTypes(USA_CHILD_PLACE_TYPES[placeType]);
        }
      } else {
        setEnclosedPlaceTypes([]);
      }
    })
    .catch(() => {
      setEnclosedPlaceTypes([]);
    });
}

function loadParentPlaces(place: PlaceInfoWrapper): void {
  const placeDcid = place.value.enclosingPlace.dcid;
  axios
    .get(`/api/place/parent/${placeDcid}`)
    .then((resp) => {
      const parentsData = resp.data;
      const filteredParentsData = parentsData.filter(
        (parent) => parent.types.indexOf("Continent") == -1
      );
      const parentNamedPlaces = filteredParentsData.map((parent) => {
        return { dcid: parent.dcid, name: parent.name, types: parent.types };
      });
      place.setParentPlaces(parentNamedPlaces);
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
        place.setEnclosedPlaces(enclosedPlaces);
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
