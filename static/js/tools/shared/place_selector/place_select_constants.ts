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

// DCID for the IPCC 0.5 arc degree grid place type
const IPCC_PLACE_50_TYPE_DCID = "IPCCPlace_50";

/**
 * Place type containment hierarchy constants
 *
 * Instead of reading data-availability in the KG, we hardcode which place types
 * are available for selection in the enclosed place type selector based on the
 * place type hierarchies defined in this file. This helps us avoid showing place types
 * which would overload our servers or the user's browser (e.g. showing all cities in the world)
 *
 * This means limiting the hierarchy to two levels deep (i.e.only taking place nodes that
 * are up to two containedInPlace levels away from the selected place type)
 */

// Containment for USA place types
const USA_CITY_CHILD_TYPES = ["CensusTract", "CensusZipCodeTabulationArea"];
const USA_COUNTY_CHILD_TYPES = [
  "City",
  "Town",
  "Village",
  "CensusTract",
  "CensusZipCodeTabulationArea",
];
const USA_STATE_CHILD_TYPES = ["County", "City", "Town", "Village"];
const USA_COUNTRY_CHILD_TYPES = ["State", "County", IPCC_PLACE_50_TYPE_DCID];
const USA_CENSUS_DIV_CHILD_TYPES = ["State", "County"];
const USA_CENSUS_REGION_CHILD_TYPES = ["CensusDivision", "State", "County"];

// Place type hierarchy for places in the USA
export const USA_CHILD_PLACE_TYPE_HIERARCHY = {
  Country: USA_COUNTRY_CHILD_TYPES,
  State: USA_STATE_CHILD_TYPES,
  County: USA_COUNTY_CHILD_TYPES,
  City: USA_CITY_CHILD_TYPES,
  CensusDivision: USA_CENSUS_DIV_CHILD_TYPES,
  CensusRegion: USA_CENSUS_REGION_CHILD_TYPES,
};

// Containment for non-USA place types
const AA4_CHILD_PLACE_TYPES = ["AdministrativeArea5"];
const AA3_CHILD_PLACE_TYPES = ["AdministrativeArea4", "AdministrativeArea5"];
const AA2_CHILD_PLACE_TYPES = ["AdministrativeArea3", "AdministrativeArea4"];
const AA1_CHILD_PLACE_TYPES = ["AdministrativeArea2", "AdministrativeArea3"];
const COUNTRY_PLACE_TYPES = [
  "AdministrativeArea1",
  "AdministrativeArea2",
  IPCC_PLACE_50_TYPE_DCID,
];
const CONTINENT_PLACE_TYPES = ["Country", "AdministrativeArea1"];

// Containment for Europe place types
const NUTS4_CHILD_PLACE_TYPES = ["EurostatNUTS5"];
const NUTS3_CHILD_PLACE_TYPES = ["EurostatNUTS4", "EurostatNUTS5"];
const NUTS2_CHILD_PLACE_TYPES = ["EurostatNUTS3", "EurostatNUTS4"];
const NUTS1_CHILD_PLACE_TYPES = ["EurostatNUTS2", "EurostatNUTS3"];
const EUROPEAN_COUNTRY_CHILD_PLACE_TYPES = [
  "AdministrativeArea1",
  "AdministrativeArea2",
  "EurostatNUTS1",
  "EurostatNUTS2",
  IPCC_PLACE_50_TYPE_DCID,
];
const EUROPE_CHILD_PLACE_TYPES = [
  "Country",
  "AdministrativeArea1",
  "EurostatNUTS1",
  "IPCCPlace_50",
];

// Place type hierarchy for places in Europe
export const EUROPE_CHILD_PLACE_TYPE_HIERARCHY = {
  Continent: EUROPE_CHILD_PLACE_TYPES,
  Country: EUROPEAN_COUNTRY_CHILD_PLACE_TYPES,
  EurostatNUTS1: NUTS1_CHILD_PLACE_TYPES,
  EurostatNUTS2: NUTS2_CHILD_PLACE_TYPES,
  EurostatNUTS3: NUTS3_CHILD_PLACE_TYPES,
  EurostatNUTS4: NUTS4_CHILD_PLACE_TYPES,
};

// Default place type hierarchy
export const DEFAULT_CHILD_PLACE_TYPE_HIERARCHY = {
  AdministrativeArea1: AA1_CHILD_PLACE_TYPES,
  AdministrativeArea2: AA2_CHILD_PLACE_TYPES,
  AdministrativeArea3: AA3_CHILD_PLACE_TYPES,
  AdministrativeArea4: AA4_CHILD_PLACE_TYPES,
  Continent: CONTINENT_PLACE_TYPES,
  Country: COUNTRY_PLACE_TYPES,
  Planet: ["Continent", "Country"],
};

/**
 * Constants specific to the maps place type selector
 *
 * The place type hierarchy for maps is different from the default place type hierarchy
 * because we want to show the enclosed place types that have both stat vars and geojsons
 * available for the selected place type.
 */

// Countries that have stat vars and geojsons at the AA1 and AA2 level available.
export const COUNTRIES_WITH_AA1_AND_AA2_MAPS = new Set([
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

// Default hierarchy for maps
export const MAPS_DEFAULT_PLACE_TYPE_HIERARCHY = {
  Planet: ["Country"],
  Continent: ["Country", IPCC_PLACE_50_TYPE_DCID],
  OceanicBasin: ["GeoGridPlace_1Deg"],
  Country: [IPCC_PLACE_50_TYPE_DCID],
  // Unfortunately, not all AAX's are guaranteed to have maps
  // So we default to no child place types in this case
  AdministrativeArea1: [],
  AdministrativeArea2: [],
  AdministrativeArea3: [],
  AdministrativeArea4: [],
};

// Hierarchy for places in the USA with maps
const MAPS_USA_CHILD_PLACE_TYPE_HIERARCHY = {
  Country: ["State", "County", IPCC_PLACE_50_TYPE_DCID],
  State: ["County", "City", "CensusTract", "CensusZipCodeTabulationArea"],
  County: ["City", "CensusTract", "CensusZipCodeTabulationArea"],
  CensusRegion: ["State", "County"],
  CensusDivision: ["State", "County"],
};

// Hierarchy for places that have AA1 and AA2 data with maps
export const MAPS_AA1_AA2_CHILD_PLACE_TYPE_HIERARCHY = {
  Country: [
    "AdministrativeArea1",
    "AdministrativeArea2",
    IPCC_PLACE_50_TYPE_DCID,
  ],
  State: ["AdministrativeArea2"],
  AdministrativeArea1: ["AdministrativeArea2"],
  AdministrativeArea2: ["AdministrativeArea2"],
};

// Hierarchy for places that jump from AA1 to AA3 with maps
// This handles places like Pakistan, which have quirks in our KG
const MAPS_AA1_AA3_CHILD_PLACE_TYPE_HIERARCHY = {
  Country: [
    "AdministrativeArea1",
    "AdministrativeArea3",
    IPCC_PLACE_50_TYPE_DCID,
  ],
  State: ["AdministrativeArea3"],
  AdministrativeArea1: ["AdministrativeArea3"],
  AdministrativeArea2: ["AdministrativeArea3"],
};

// Hierarchy of child place types for Europe with maps
export const MAPS_EUROPE_CHILD_PLACE_TYPE_HIERARCHY = {
  Continent: [
    "Country",
    "EurostatNUTS1",
    "EurostatNUTS2",
    "EurostatNUTS3",
    IPCC_PLACE_50_TYPE_DCID,
  ],
  Country: [
    "EurostatNUTS1",
    "EurostatNUTS2",
    "EurostatNUTS3",
    IPCC_PLACE_50_TYPE_DCID,
  ],
  EurostatNUTS1: ["EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS2: ["EurostatNUTS3"],
  EurostatNUTS3: ["EurostatNUTS3"],
};

// Place DCIDs that have a different child place type hierarchy than the default for maps
export const MAPS_SPECIAL_HANDLING_HIERARCHY_MAPPING = {
  [USA_PLACE_DCID]: MAPS_USA_CHILD_PLACE_TYPE_HIERARCHY,
  [PAKISTAN_PLACE_DCID]: MAPS_AA1_AA3_CHILD_PLACE_TYPE_HIERARCHY,
  [EUROPE_NAMED_TYPED_PLACE.dcid]: MAPS_EUROPE_CHILD_PLACE_TYPE_HIERARCHY,
};
