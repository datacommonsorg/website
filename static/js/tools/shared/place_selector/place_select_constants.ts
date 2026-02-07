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
 *
 * Instead of reading data-availability in the KG, we hardcode which place types
 * are available for selection in the enclosed place type selector based on the
 * place type hierarchies defined in this file.
 */

// DCID for the IPCC 0.5 arc degree grid place type
const IPCC_PLACE_50_TYPE_DCID = "IPCCPlace_50";

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

// Default hierarchy for places
export const MAPS_DEFAULT_PLACE_TYPE_HIERARCHY = {
  Planet: ["Country"],
  Continent: ["Country", IPCC_PLACE_50_TYPE_DCID],
  OceanicBasin: ["GeoGridPlace_1Deg"],
  // Unfortunately, not all countries and AAX's are guaranteed to have maps
  // So we default to no child place types in this case
  Country: [],
  AdministrativeArea1: [],
  AdministrativeArea2: [],
  AdministrativeArea3: [],
  AdministrativeArea4: [],
};

// Hierarchy for places in the USA
const MAPS_USA_CHILD_PLACE_TYPE_HIERARCHY = {
  Country: ["State", "County"],
  State: ["County", "City", "CensusTract", "CensusZipCodeTabulationArea"],
  County: ["City", "CensusTract", "CensusZipCodeTabulationArea"],
  CensusRegion: ["State", "County"],
  CensusDivision: ["State", "County"],
};

// Hierarchy for places that have AA1 and AA2 data
export const MAPS_AA1_AA2_CHILD_PLACE_TYPE_HIERARCHY = {
  Country: ["AdministrativeArea1", "AdministrativeArea2"],
  AdministrativeArea1: ["AdministrativeArea2"],
  State: ["AdministrativeArea2"],
  AdministrativeArea2: ["AdministrativeArea2"],
};

// Hierarchy for places that jump from AA1 to AA3
// This handles places like Pakistan, which have quirks in our KG
const MAPS_AA1_AA3_CHILD_PLACE_TYPE_HIERARCHY = {
  AdministrativeArea1: ["AdministrativeArea3"],
  AdministrativeArea2: ["AdministrativeArea3"],
  Country: ["AdministrativeArea1", "AdministrativeArea3"],
  State: ["AdministrativeArea3"],
};

// Hierarchy of child place types for Europe.
export const MAPS_EUROPE_CHILD_PLACE_TYPE_HIERARCHY = {
  Continent: ["Country", "EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  Country: ["EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS1: ["EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS2: ["EurostatNUTS3"],
  EurostatNUTS3: ["EurostatNUTS3"],
};

// Place DCIDs that have a different child place type hierarchy than the default.
export const MAPS_SPECIAL_HANDLING_HIERARCHY_MAPPING = {
  [USA_PLACE_DCID]: MAPS_USA_CHILD_PLACE_TYPE_HIERARCHY,
  [PAKISTAN_PLACE_DCID]: MAPS_AA1_AA3_CHILD_PLACE_TYPE_HIERARCHY,
  [EUROPE_NAMED_TYPED_PLACE.dcid]: MAPS_EUROPE_CHILD_PLACE_TYPE_HIERARCHY,
};

// Child place types that are valid for all places regardless of whether they use one of the special hierarchies.
// These types get added at the end of the hierarchy for each place type.
export const MAPS_ALL_PLACE_CHILD_TYPES = {
  Continent: [IPCC_PLACE_50_TYPE_DCID], // Needs to be added here because Europe gets special handling
  Country: [IPCC_PLACE_50_TYPE_DCID], // Needs to be added here because USA & Pakistan get special handling
};
