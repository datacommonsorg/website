/**
 * Copyright 2020 Google LLC
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
 * Place options for selecting the child place type and the enclosing place.
 */

import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import axios from "axios";
import { Card } from "reactstrap";
import { Context, IsLoadingWrapper, PlaceInfoWrapper } from "./context";
import { SearchBar } from "../timeline/search";
import { isPlacePicked, ScatterChartType } from "./util";

import { Container, CustomInput } from "reactstrap";
import { EARTH_NAMED_TYPED_PLACE } from "../../shared/constants";

const USA_CITY_CHILD_TYPES = ["CensusZipCodeTabulationArea", "City"];
const USA_COUNTY_CHILD_TYPES = ["Town", "Village", ...USA_CITY_CHILD_TYPES];
const USA_STATE_CHILD_TYPES = ["County", ...USA_COUNTY_CHILD_TYPES];
const USA_COUNTRY_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];

const USA_CHILD_PLACE_TYPES = {
  Country: USA_COUNTRY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
  County: USA_COUNTY_CHILD_TYPES,
  City: USA_CITY_CHILD_TYPES,
};

const NON_USA_PLACE_TYPES = [
  "EurostatNUTS1",
  "EurostatNUTS2",
  "EurostatNUTS3",
  "AdministrativeArea1",
  "AdministrativeArea2",
  "AdministrativeArea3",
  "AdministrativeArea4",
  "AdministrativeArea5",
];

/**
 * Possible child place types.
 */
const ALL_PLACE_TYPES = [
  "Country",
  "State",
  "County",
  "City",
  "Town",
  "Village",
  "Borough",
  "CensusZipCodeTabulationArea",
  ...NON_USA_PLACE_TYPES,
];

function PlaceAndTypeOptions(): JSX.Element {
  const { place, isLoading, display } = useContext(Context);
  const [childPlaceTypes, setChildPlaceTypes] = useState(ALL_PLACE_TYPES);
  if (place.value.enclosingPlace.dcid && childPlaceTypes === ALL_PLACE_TYPES) {
    updateChildPlaceTypes(place.value.enclosingPlace.dcid, setChildPlaceTypes);
  }
  /**
   * Reloads child places if the enclosing place or child place type changes.
   */
  useEffect(() => {
    if (isPlacePicked(place.value) && _.isEmpty(place.value.enclosedPlaces)) {
      loadPlaces(place, isLoading);
    }
  }, [place.value]);

  return (
    <Card className="place-and-type-options-card">
      <Container className="place-and-type-options">
        <div
          className="place-and-type-options-section"
          id="place-search-section"
        >
          <div className="place-and-type-options-label">Plot places in</div>
          <div id="search">
            <SearchBar
              places={
                place.value.enclosingPlace.dcid
                  ? {
                      [place.value.enclosingPlace.dcid]:
                        place.value.enclosingPlace.name,
                    }
                  : {}
              }
              addPlace={(e) => selectEnclosingPlace(place, e)}
              removePlace={() =>
                unselectEnclosingPlace(place, setChildPlaceTypes)
              }
              numPlacesLimit={1}
            />
          </div>
        </div>
        <div className="place-and-type-options-section">
          <div className="place-and-type-options-label">of type</div>
          <div>
            <CustomInput
              id="enclosed-place-type"
              type="select"
              value={place.value.enclosedPlaceType}
              onChange={(e) => selectEnclosedPlaceType(place, e)}
              className="pac-target-input"
            >
              <option value="">Select a place type</option>
              {childPlaceTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </CustomInput>
          </div>
        </div>
        <div className="place-and-type-options-section">
          <div className="chart-type-toggle">
            <div
              className={`${
                display.chartType === ScatterChartType.SCATTER
                  ? "selected-chart-option"
                  : "chart-type-option"
              }`}
              onClick={() => display.setChartType(ScatterChartType.SCATTER)}
            >
              <i className="material-icons-outlined">scatter_plot</i>
            </div>
            <div
              className={`${
                display.chartType === ScatterChartType.MAP
                  ? "selected-chart-option"
                  : "chart-type-option"
              }`}
              onClick={() => display.setChartType(ScatterChartType.MAP)}
            >
              <i className="material-icons-outlined">public</i>
            </div>
          </div>
        </div>
      </Container>
    </Card>
  );
}

/**
 * Loads child places.
 * @param place
 * @param isLoading
 */
async function loadPlaces(
  place: PlaceInfoWrapper,
  isLoading: IsLoadingWrapper
): Promise<void> {
  const placeDcid = place.value.enclosingPlace.dcid;
  const childPlaceType = place.value.enclosedPlaceType;
  let placeNamesRetrieved = false;
  axios
    .get(
      `/api/place/places-in-names?dcid=${placeDcid}&placeType=${childPlaceType}`
    )
    .then((resp) => {
      const childPlacesToNames = resp.data;
      if (!_.isEmpty(childPlacesToNames)) {
        const enclosedPlaces = Object.keys(childPlacesToNames).map((dcid) => {
          return {
            dcid: dcid,
            name: childPlacesToNames[dcid],
          };
        });
        place.setEnclosedPlaces(enclosedPlaces);
        placeNamesRetrieved = true;
      }
    })
    .catch(() => (placeNamesRetrieved = false));
  isLoading.setArePlacesLoading(true);
  axios
    .get(`/api/place/places-in?dcid=${placeDcid}&placeType=${childPlaceType}`)
    .then((resp) => {
      const childPlaces = resp.data[placeDcid];
      if (!placeNamesRetrieved) {
        const enclosedPlaces = childPlaces.map((dcid) => {
          return {
            dcid: dcid,
            name: dcid,
          };
        });
        if (!_.isEmpty(enclosedPlaces)) {
          place.setEnclosedPlaces(enclosedPlaces);
        } else {
          alert(
            `Sorry, ${place.value.enclosingPlace.name} does not contain places of type ` +
              `${childPlaceType}. Try picking another type or place.`
          );
        }
      }
      isLoading.setArePlacesLoading(false);
    })
    .catch(() => {
      isLoading.setArePlacesLoading(false);
      alert(
        `Error fetching places of type ${childPlaceType} for ${place.value.enclosingPlace.name}.`
      );
    });
}

/**
 * Selects child place type.
 * @param place
 * @param event
 */
function selectEnclosedPlaceType(
  place: PlaceInfoWrapper,
  event: React.ChangeEvent<HTMLInputElement>
) {
  const placeType = event.target.value;
  if (placeType === "Country") {
    place.set({
      ...place.value,
      enclosedPlaceType: placeType,
      enclosingPlace: EARTH_NAMED_TYPED_PLACE,
    });
  } else {
    place.setEnclosedPlaceType(placeType);
  }
}

/**
 * Selects the enclosing place.
 * @param place
 * @param dcid
 */
function selectEnclosingPlace(place: PlaceInfoWrapper, dcid: string) {
  const placeTypePromise = axios
    .get(`/api/place/type/${dcid}`)
    .then((resp) => resp.data);
  const placeNamePromise = axios
    .get(`/api/place/name?dcid=${dcid}`)
    .then((resp) => resp.data);
  Promise.all([placeTypePromise, placeNamePromise])
    .then(([placeType, placeName]) => {
      const name = dcid in placeName ? placeName[dcid] : dcid;
      place.setEnclosingPlace({ dcid, name, types: [placeType] });
    })
    .catch(() => {
      place.setEnclosingPlace({ dcid, name: dcid, types: [] });
    });
}

function updateChildPlaceTypes(
  dcid: string,
  setChildPlaceTypes: (childPlaceTypes: string[]) => void
) {
  if (dcid === "Earth") {
    return;
  }
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
          setChildPlaceTypes(USA_CHILD_PLACE_TYPES[placeType]);
        }
      } else {
        setChildPlaceTypes(NON_USA_PLACE_TYPES);
      }
    })
    .catch(() => {
      setChildPlaceTypes(ALL_PLACE_TYPES);
    });
}

/**
 * Removes the enclosing place
 * @param place
 * @param setChildPlaceTypes
 */
function unselectEnclosingPlace(
  place: PlaceInfoWrapper,
  setChildPlaceTypes: (childPlaceTypes: string[]) => void
) {
  place.setEnclosingPlace({ dcid: "", name: "", types: [] });
  setChildPlaceTypes(ALL_PLACE_TYPES);
}

export { PlaceAndTypeOptions as PlaceOptions };
