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
 * Util functions used by the visualization tool.
 */

import _ from "lodash";

import { VIS_TYPE_SELECTOR_CONFIGS } from "../../apps/visualization/vis_type_configs";
import {
  EARTH_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { StatVarInfo } from "../../shared/stat_var";
import { NamedTypedPlace } from "../../shared/types";
import { isChildPlaceOf } from "../../tools/shared_util";

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

/**
 * Default function used to get enclosed place types for a place and list of its
 * parent places.
 * @param place place to get enclosed place types for
 * @param parentPlaces list of parent places for the place
 */
export function getEnclosedPlaceTypes(
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

/**
 * Returns whether or not selection of options is complete
 * @param visType selected vis type
 * @param places selected list of places
 * @param enclosedPlaceType selected enclosed place type
 * @param statVars selected list of stat vars
 */
export function isSelectionComplete(
  visType: string,
  places: NamedTypedPlace[],
  enclosedPlaceType: string,
  statVars: { dcid: string; info: StatVarInfo }[]
): boolean {
  const visTypeConfig = VIS_TYPE_SELECTOR_CONFIGS[visType];
  if (_.isEmpty(places)) {
    return false;
  }
  if (!visTypeConfig.skipEnclosedPlaceType && !enclosedPlaceType) {
    return false;
  }
  if (_.isEmpty(statVars)) {
    return false;
  }
  if (visTypeConfig.numSv && statVars.length < visTypeConfig.numSv) {
    return false;
  }
  return true;
}
