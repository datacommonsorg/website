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

import { isChildPlaceOf } from "../tools/shared_util";
import {
  ENCLOSED_PLACE_TYPE_NAMES,
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../utils/place_utils";
import { EARTH_NAMED_TYPED_PLACE, USA_PLACE_DCID } from "./constants";
import {
  GA_EVENT_TOOL_PLACE_ADD,
  GA_PARAM_PLACE_DCID,
  triggerGAEvent,
} from "./ga_events";
import { SearchBar } from "./place_search_bar";
import { NamedTypedPlace } from "./types";

const EMPTY_NAMED_TYPED_PLACE = { dcid: "", name: "", types: null };
const SELECTOR_PREFIX = "place-selector";
const USA_CITY_CHILD_TYPES = ["CensusZipCodeTabulationArea", "City"];
const USA_COUNTY_CHILD_TYPES = ["Town", "Village", ...USA_CITY_CHILD_TYPES];
const USA_STATE_CHILD_TYPES = ["County", ...USA_COUNTY_CHILD_TYPES];
const USA_COUNTRY_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];
const USA_CENSUS_DIV_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];
const USA_CENSUS_REGION_CHILD_TYPES = [
  "CensusDivision",
  ...USA_CENSUS_DIV_CHILD_TYPES,
];

const USA_CHILD_PLACE_TYPES = {
  City: USA_CITY_CHILD_TYPES,
  Country: USA_COUNTRY_CHILD_TYPES,
  County: USA_COUNTY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
  CensusDivision: USA_CENSUS_DIV_CHILD_TYPES,
  CensusRegion: USA_CENSUS_REGION_CHILD_TYPES,
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
  AdministrativeArea1: AA1_CHILD_PLACE_TYPES,
  AdministrativeArea2: AA2_CHILD_PLACE_TYPES,
  AdministrativeArea3: AA3_CHILD_PLACE_TYPES,
  AdministrativeArea4: AA4_CHILD_PLACE_TYPES,
  Continent: CONTINENT_PLACE_TYPES,
  Country: NON_USA_COUNTRY_PLACE_TYPES,
  EurostatNUTS1: NUTS1_CHILD_PLACE_TYPES,
  EurostatNUTS2: NUTS2_CHILD_PLACE_TYPES,
  Planet: ["Continent", ...CONTINENT_PLACE_TYPES, ...USA_COUNTRY_CHILD_TYPES],
  State: AA1_CHILD_PLACE_TYPES,
};

const DEFAULT_PLACE_SEARCH_LABEL = "Plot places in";
interface PlaceSelectorProps {
  selectedPlace: NamedTypedPlace;
  enclosedPlaceType: string;
  onPlaceSelected: (place: NamedTypedPlace) => void;
  onEnclosedPlaceTypeSelected: (type: string) => void;
  // special handling of how to get enclosed place types
  getEnclosedPlaceTypes?: (
    place: NamedTypedPlace,
    parentPlaces: NamedTypedPlace[]
  ) => string[];
  customSearchPlaceholder?: string;
  children?: React.ReactNode;
  customPlaceSearchLabel?: string;
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
        <div className={`${SELECTOR_PREFIX}-main-selectors`}>
          <div
            className={`${SELECTOR_PREFIX}-section`}
            id={`${SELECTOR_PREFIX}-search-section`}
          >
            <div className={`${SELECTOR_PREFIX}-label`}>
              {props.customPlaceSearchLabel || DEFAULT_PLACE_SEARCH_LABEL}
            </div>
            <SearchBar
              places={
                props.selectedPlace.dcid
                  ? { [props.selectedPlace.dcid]: props.selectedPlace.name }
                  : {}
              }
              addPlace={(e) => {
                selectPlace(e, props.onPlaceSelected);
                triggerGAEvent(GA_EVENT_TOOL_PLACE_ADD, {
                  [GA_PARAM_PLACE_DCID]: e,
                });
              }}
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
                id={`${SELECTOR_PREFIX}-place-type`}
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
        </div>
        {props.children}
      </Container>
    </Card>
  );

  function loadChildPlaceTypes(): void {
    getParentPlacesPromise(props.selectedPlace.dcid)
      .then((parentPlaces) => {
        const getEnclosedPlaceTypesFn =
          props.getEnclosedPlaceTypes || getEnclosedPlaceTypes;
        const newChildPlaceTypes = getEnclosedPlaceTypesFn(
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
        } else if (
          newChildPlaceTypes.length === 1 &&
          !props.enclosedPlaceType
        ) {
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

function getEnclosedPlaceTypes(
  place: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[]
): string[] {
  if (place.dcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return CHILD_PLACE_TYPES[EARTH_NAMED_TYPED_PLACE.types[0]];
  }
  if (_.isEmpty(place.types)) {
    return [];
  }
  const isUSPlace = isChildPlaceOf(place.dcid, USA_PLACE_DCID, parentPlaces);
  for (const type of place.types) {
    if (isUSPlace) {
      if (type in USA_CHILD_PLACE_TYPES) {
        return USA_CHILD_PLACE_TYPES[type];
      }
    } else {
      if (type in CHILD_PLACE_TYPES) {
        return CHILD_PLACE_TYPES[type];
      }
    }
  }
  return [];
}
