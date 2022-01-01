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

import axios from "axios";
import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";
import { Container, CustomInput } from "reactstrap";
import { Card } from "reactstrap";

import { EARTH_NAMED_TYPED_PLACE } from "../../shared/constants";
import { loadParentPlaces } from "../../shared/util";
import { getAllChildPlaceTypes } from "../map/util";
import { getNamedTypedPlace } from "../shared_util";
import { SearchBar } from "../timeline/search";
import {
  Context,
  IsLoadingWrapper,
  PlaceInfo,
  PlaceInfoWrapper,
} from "./context";
import { isPlacePicked, ScatterChartType } from "./util";

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

const AA4_CHILD_PLACE_TYPES = ["AdministrativeArea5"];
const AA3_CHILD_PLACE_TYPES = ["AdministrativeArea4", ...AA4_CHILD_PLACE_TYPES];
const AA2_CHILD_PLACE_TYPES = ["AdministrativeArea3", ...AA3_CHILD_PLACE_TYPES];
const AA1_CHILD_PLACE_TYPES = ["AdministrativeArea2", ...AA2_CHILD_PLACE_TYPES];
const NUTS2_CHILD_PLACE_TYPES = ["EurostatNUTS3"];
const NUTS1_CHILD_PLACE_TYPES = ["EurostatNUTS2", ...NUTS2_CHILD_PLACE_TYPES];
const NON_USA_COUNTRY_PLACE_TYPES = [
  "AdministrativeArea1",
  ...AA1_CHILD_PLACE_TYPES,
  "EurostatNUTS1",
  ...NUTS1_CHILD_PLACE_TYPES,
];
const CONTINENT_PLACE_TYPES = ["Country", ...NON_USA_COUNTRY_PLACE_TYPES];
const CHILD_PLACE_TYPES = {
  Planet: ["Continent", ...CONTINENT_PLACE_TYPES, ...USA_COUNTRY_CHILD_TYPES],
  Continent: CONTINENT_PLACE_TYPES,
  Country: NON_USA_COUNTRY_PLACE_TYPES,
  EurostatNUTS1: NUTS1_CHILD_PLACE_TYPES,
  EurostatNUTS2: NUTS2_CHILD_PLACE_TYPES,
  AdministrativeArea1: AA1_CHILD_PLACE_TYPES,
  AdministrativeArea2: AA2_CHILD_PLACE_TYPES,
  AdministrativeArea3: AA3_CHILD_PLACE_TYPES,
  AdministrativeArea4: AA4_CHILD_PLACE_TYPES,
};

function PlaceAndTypeOptions(): JSX.Element {
  const { place, isLoading, display } = useContext(Context);
  const [childPlaceTypes, setChildPlaceTypes] = useState([]);

  /**
   * Watch and update place info
   */
  useEffect(() => {
    if (!place.value.enclosingPlace.dcid) {
      // Do nothing here because no place has been chosen yet.
      return;
    }
    if (_.isNull(place.value.enclosingPlace.types)) {
      getNamedTypedPlace(place.value.enclosingPlace.dcid).then(
        (enclosingPlace) => {
          place.set({ ...place.value, enclosingPlace });
        }
      );
      return;
    }
    if (_.isNull(place.value.parentPlaces)) {
      loadParentPlaces(place.value.enclosingPlace.dcid, place.setParentPlaces);
      return;
    }
    const newChildPlaceTypes = getChildPlaceTypes(place.value);
    if (newChildPlaceTypes !== childPlaceTypes) {
      setChildPlaceTypes(newChildPlaceTypes);
    }
    if (isPlacePicked(place.value) && _.isEmpty(place.value.enclosedPlaces)) {
      loadPlaces(place, isLoading);
    }
  }, [place.value]);

  /**
   * If map view is selected, check that map view is possible before rendering
   * the view. If map view is not possible, alert and render scatter view.
   */
  useEffect(() => {
    if (
      isPlacePicked(place.value) &&
      display.chartType === ScatterChartType.MAP &&
      !_.isNull(place.value.parentPlaces)
    ) {
      const hasMapView =
        getAllChildPlaceTypes(
          place.value.enclosingPlace,
          place.value.parentPlaces
        ).indexOf(place.value.enclosedPlaceType) > -1;
      if (!hasMapView) {
        display.setChartType(ScatterChartType.SCATTER);
        alert(
          `Sorry, map view is not supported for places in ${place.value.enclosingPlace.name} of type ${place.value.enclosedPlaceType}`
        );
      }
    }
  }, [place.value, display.chartType]);

  return (
    <Card className="place-and-type-options-card">
      <Container className="place-and-type-options" fluid={true}>
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
              {childPlaceTypes &&
                childPlaceTypes.map((type) => (
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
          place.setEnclosedPlaceType("");
          alert(
            `Sorry, ${place.value.enclosingPlace.name} does not contain places of type ` +
              `${childPlaceType}. Try picking another type or place.`
          );
          document.getElementById("place-list").innerHTML = "";
          const select = document.getElementById(
            "enclosed-place-type"
          ) as HTMLInputElement;
          select.value = "";
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
  place.setEnclosedPlaceType(placeType);
}

/**
 * Selects the enclosing place.
 * @param place
 * @param dcid
 */
function selectEnclosingPlace(place: PlaceInfoWrapper, dcid: string) {
  getNamedTypedPlace(dcid).then((enclosingPlace) =>
    place.setEnclosingPlace(enclosingPlace)
  );
}

function getChildPlaceTypes(place: PlaceInfo) {
  if (place.enclosingPlace.dcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return CHILD_PLACE_TYPES[EARTH_NAMED_TYPED_PLACE.types[0]];
  }
  const isUSPlace =
    place.enclosingPlace.dcid === "country/USA" ||
    place.parentPlaces.findIndex((parent) => parent.dcid === "country/USA") >
      -1;
  if (_.isEmpty(place.enclosingPlace.types)) return;
  const placeType = place.enclosingPlace.types[0];
  if (isUSPlace) {
    if (placeType in USA_CHILD_PLACE_TYPES) {
      return USA_CHILD_PLACE_TYPES[placeType];
    }
  } else {
    return CHILD_PLACE_TYPES[placeType];
  }
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
  setChildPlaceTypes([]);
}

export { PlaceAndTypeOptions as PlaceOptions };
