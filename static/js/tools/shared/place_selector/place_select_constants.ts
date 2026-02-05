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

import {
  ARGENTINA_PLACE_DCID,
  BANGLADESH_PLACE_DCID,
  BELARUS_PLACE_DCID,
  BELIZE_PLACE_DCID,
  BENIN_PLACE_DCID,
  BHUTAN_PLACE_DCID,
  BRAZIL_PLACE_DCID,
  BULGARIA_PLACE_DCID,
  BURUNDI_PLACE_DCID,
  CAMEROON_PLACE_DCID,
  CANADA_PLACE_DCID,
  CAPE_VERDE_PLACE_DCID,
  CHINA_PLACE_DCID,
  COLOMBIA_PLACE_DCID,
  COMOROS_PLACE_DCID,
  CONGO_PLACE_DCID,
  CUBA_PLACE_DCID,
  DJIBOUTI_PLACE_DCID,
  ESTONIA_PLACE_DCID,
  ETHIOPIA_PLACE_DCID,
  EUROPE_NAMED_TYPED_PLACE,
  GHANA_PLACE_DCID,
  GUINEA_PLACE_DCID,
  INDIA_PLACE_DCID,
  INDONESIA_PLACE_DCID,
  JAMAICA_PLACE_DCID,
  JAPAN_PLACE_DCID,
  JORDAN_PLACE_DCID,
  KENYA_PLACE_DCID,
  KUWAIT_PLACE_DCID,
  KYRGYZSTAN_PLACE_DCID,
  LATVIA_PLACE_DCID,
  LESOTHO_PLACE_DCID,
  LITHUANIA_PLACE_DCID,
  MALAWI_PLACE_DCID,
  MALAYSIA_PLACE_DCID,
  MALI_PLACE_DCID,
  MEXICO_PLACE_DCID,
  MONGOLIA_PLACE_DCID,
  MOROCCO_PLACE_DCID,
  MYANMAR_PLACE_DCID,
  NEPAL_PLACE_DCID,
  NICARAGUA_PLACE_DCID,
  NORTH_KOREA_PLACE_DCID,
  PAKISTAN_PLACE_DCID,
  PALESTINE_PLACE_DCID,
  PHILIPPINES_PLACE_DCID,
  QATAR_PLACE_DCID,
  RWANDA_PLACE_DCID,
  SAINT_LUCIA_PLACE_DCID,
  SLOVAKIA_PLACE_DCID,
  SOUTH_AFRICA_PLACE_DCID,
  SOUTH_KOREA_PLACE_DCID,
  SWITZERLAND_PLACE_DCID,
  UAE_PLACE_DCID,
  USA_PLACE_DCID,
} from "../../../shared/constants";

/**
 * Constants for the place selector on our visualization tools
 */

const USA_CITY_CHILD_TYPES = ["CensusZipCodeTabulationArea", "City"];
const USA_COUNTY_CHILD_TYPES = ["Town", "Village", ...USA_CITY_CHILD_TYPES];
const USA_STATE_CHILD_TYPES = ["County", ...USA_COUNTY_CHILD_TYPES];
const USA_COUNTRY_CHILD_TYPES = ["State", ...USA_STATE_CHILD_TYPES];

const IPCC_PLACE_50_TYPE_DCID = "IPCCPlace_50";

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

export const ALL_PLACE_CHILD_TYPES = {
  Planet: ["Country"],
  Continent: ["Country", IPCC_PLACE_50_TYPE_DCID],
  Country: [IPCC_PLACE_50_TYPE_DCID],
  OceanicBasin: ["GeoGridPlace_1Deg"],
};

const USA_CHILD_PLACE_TYPES = {
  Country: ["State", "County"],
  State: ["County", "City", "CensusTract", "CensusZipCodeTabulationArea"],
  County: ["County", "City", "CensusTract", "CensusZipCodeTabulationArea"],
  CensusRegion: ["State", "County"],
  CensusDivision: ["State", "County"],
};

export const AA1_AA2_CHILD_PLACE_TYPES = {
  Country: ["AdministrativeArea1", "AdministrativeArea2"],
  AdministrativeArea1: ["AdministrativeArea2"],
  State: ["AdministrativeArea2"],
  AdministrativeArea2: ["AdministrativeArea2"],
};

const AA1_AA3_CHILD_PLACE_TYPES = {
  AdministrativeArea1: ["AdministrativeArea3"],
  AdministrativeArea2: ["AdministrativeArea3"],
  Country: ["AdministrativeArea1", "AdministrativeArea3"],
  State: ["AdministrativeArea3"],
};

export const EUROPE_CHILD_PLACE_TYPES = {
  Continent: ["EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  Country: ["EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS1: ["EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS2: ["EurostatNUTS3"],
  EurostatNUTS3: ["EurostatNUTS3"],
};

export const AA1_AA2_PLACES = new Set([
  ARGENTINA_PLACE_DCID,
  BENIN_PLACE_DCID,
  BELIZE_PLACE_DCID,
  BANGLADESH_PLACE_DCID,
  BELARUS_PLACE_DCID,
  BRAZIL_PLACE_DCID,
  BHUTAN_PLACE_DCID,
  BULGARIA_PLACE_DCID,
  BURUNDI_PLACE_DCID,
  CAMEROON_PLACE_DCID,
  CANADA_PLACE_DCID,
  CAPE_VERDE_PLACE_DCID,
  CHINA_PLACE_DCID,
  COLOMBIA_PLACE_DCID,
  COMOROS_PLACE_DCID,
  CONGO_PLACE_DCID,
  CUBA_PLACE_DCID,
  DJIBOUTI_PLACE_DCID,
  ESTONIA_PLACE_DCID,
  ETHIOPIA_PLACE_DCID,
  GHANA_PLACE_DCID,
  GUINEA_PLACE_DCID,
  INDIA_PLACE_DCID,
  INDONESIA_PLACE_DCID,
  JAMAICA_PLACE_DCID,
  JAPAN_PLACE_DCID,
  JORDAN_PLACE_DCID,
  KENYA_PLACE_DCID,
  KUWAIT_PLACE_DCID,
  KYRGYZSTAN_PLACE_DCID,
  LATVIA_PLACE_DCID,
  LESOTHO_PLACE_DCID,
  LITHUANIA_PLACE_DCID,
  MALAWI_PLACE_DCID,
  MALAYSIA_PLACE_DCID,
  MALI_PLACE_DCID,
  MEXICO_PLACE_DCID,
  MONGOLIA_PLACE_DCID,
  MOROCCO_PLACE_DCID,
  MYANMAR_PLACE_DCID,
  NEPAL_PLACE_DCID,
  NICARAGUA_PLACE_DCID,
  NORTH_KOREA_PLACE_DCID,
  PAKISTAN_PLACE_DCID,
  PALESTINE_PLACE_DCID,
  PHILIPPINES_PLACE_DCID,
  QATAR_PLACE_DCID,
  RWANDA_PLACE_DCID,
  SAINT_LUCIA_PLACE_DCID,
  SLOVAKIA_PLACE_DCID,
  SOUTH_AFRICA_PLACE_DCID,
  SOUTH_KOREA_PLACE_DCID,
  SWITZERLAND_PLACE_DCID,
  UAE_PLACE_DCID,
]);

export const CHILD_PLACE_TYPE_MAPPING = {
  [USA_PLACE_DCID]: USA_CHILD_PLACE_TYPES,
  [PAKISTAN_PLACE_DCID]: AA1_AA3_CHILD_PLACE_TYPES,
  [EUROPE_NAMED_TYPED_PLACE.dcid]: EUROPE_CHILD_PLACE_TYPES,
};
