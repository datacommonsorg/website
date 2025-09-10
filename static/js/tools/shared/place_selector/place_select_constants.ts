/**
 * Copyright 2025 Google LLC
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
 * Constants for the place selector on our visualization tools
 */

export const EMPTY_NAMED_TYPED_PLACE = { dcid: "", name: "", types: null };
export const USA_CITY_CHILD_TYPES = ["CensusZipCodeTabulationArea", "City"];
export const USA_COUNTY_CHILD_TYPES = [
  "Town",
  "Village",
  ...USA_CITY_CHILD_TYPES,
];
export const USA_STATE_CHILD_TYPES = ["County", ...USA_COUNTY_CHILD_TYPES];
export const USA_COUNTRY_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];
export const USA_CENSUS_DIV_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];
export const USA_CENSUS_REGION_CHILD_TYPES = [
  "CensusDivision",
  ...USA_CENSUS_DIV_CHILD_TYPES,
];

export const USA_CHILD_PLACE_TYPES = {
  City: USA_CITY_CHILD_TYPES,
  Country: USA_COUNTRY_CHILD_TYPES,
  County: USA_COUNTY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
  CensusDivision: USA_CENSUS_DIV_CHILD_TYPES,
  CensusRegion: USA_CENSUS_REGION_CHILD_TYPES,
};

export const AA4_CHILD_PLACE_TYPES = ["AdministrativeArea5"];
export const AA3_CHILD_PLACE_TYPES = [
  "AdministrativeArea4",
  ...AA4_CHILD_PLACE_TYPES,
];
export const AA2_CHILD_PLACE_TYPES = [
  "AdministrativeArea3",
  ...AA3_CHILD_PLACE_TYPES,
];
export const AA1_CHILD_PLACE_TYPES = [
  "AdministrativeArea2",
  ...AA2_CHILD_PLACE_TYPES,
];
export const NUTS2_CHILD_PLACE_TYPES = ["EurostatNUTS3"];
export const NUTS1_CHILD_PLACE_TYPES = [
  "EurostatNUTS2",
  ...NUTS2_CHILD_PLACE_TYPES,
];
export const NON_USA_COUNTRY_PLACE_TYPES = [
  "AdministrativeArea1",
  ...AA1_CHILD_PLACE_TYPES,
  "EurostatNUTS1",
  ...NUTS1_CHILD_PLACE_TYPES,
];
export const CONTINENT_PLACE_TYPES = [
  "Country",
  ...NON_USA_COUNTRY_PLACE_TYPES,
];
export const CHILD_PLACE_TYPES = {
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
