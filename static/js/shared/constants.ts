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

import { NamedTypedPlace } from "./types";

export const USA_PLACE_DCID = "country/USA";
export const INDIA_PLACE_DCID = "country/IND";
export const BANGLADESH_PLACE_DCID = "country/BGD";
export const BRAZIL_PLACE_DCID = "country/BRA";
export const NEPAL_PLACE_DCID = "country/NPL";
export const PAKISTAN_PLACE_DCID = "country/PAK";
export const CHINA_PLACE_DCID = "country/CHN";
export const MEXICO_PLACE_DCID = "country/MEX";
export const NORTH_AMERICA_DCID = "northamerica";
export const OCEANIA_DCID = "oceania";
export const AUSTRALIA_NEW_ZEALAND_DCID = "AustraliaAndNewZealand";
export const UAE_PLACE_DCID = "country/ARE";
export const BURUNDI_PLACE_DCID = "country/BDI";
export const BENIN_PLACE_DCID = "country/BEN";
export const BULGARIA_PLACE_DCID = "country/BGR";
export const BELIZE_PLACE_DCID = "country/BLZ";
export const BHUTAN_PLACE_DCID = "country/BTN";
export const SWITZERLAND_PLACE_DCID = "country/CHE";
export const CAMEROON_PLACE_DCID = "country/CMR";
export const COMOROS_PLACE_DCID = "country/COM";
export const ESTONIA_PLACE_DCID = "country/EST";
export const ETHIOPIA_PLACE_DCID = "country/ETH";
export const INDONESIA_PLACE_DCID = "country/IDN";
export const JAMAICA_PLACE_DCID = "country/JAM";
export const JORDAN_PLACE_DCID = "country/JOR";
export const JAPAN_PLACE_DCID = "country/JPN";
export const KENYA_PLACE_DCID = "country/KEN";
export const KYRGYZSTAN_PLACE_DCID = "country/KGZ";
export const KUWAIT_PLACE_DCID = "country/KWT";
export const MYANMAR_PLACE_DCID = "country/MMR";
export const MALAWI_PLACE_DCID = "country/MWI";
export const MALAYSIA_PLACE_DCID = "country/MYS";
export const NICARAGUA_PLACE_DCID = "country/NIC";
export const NORTH_KOREA_PLACE_DCID = "country/PRK";
export const ARGENTINA_PLACE_DCID = "country/ARG";
export const BELARUS_PLACE_DCID = "country/BLR";
export const CONGO_PLACE_DCID = "country/COG";
export const CAPE_VERDE_PLACE_DCID = "country/CPV";
export const CUBA_PLACE_DCID = "country/CUB";
export const DJIBOUTI_PLACE_DCID = "country/DJI";
export const GHANA_PLACE_DCID = "country/GHA";
export const GUINEA_PLACE_DCID = "country/GIN";
export const SAINT_LUCIA_PLACE_DCID = "country/LCA";
export const LESOTHO_PLACE_DCID = "country/LSO";
export const LITHUANIA_PLACE_DCID = "country/LTU";
export const LATVIA_PLACE_DCID = "country/LVA";
export const MOROCCO_PLACE_DCID = "country/MAR";
export const MALI_PLACE_DCID = "country/MLI";
export const PHILIPPINES_PLACE_DCID = "country/PHL";
export const PALESTINE_PLACE_DCID = "country/PSE";
export const QATAR_PLACE_DCID = "country/QAT";
export const RWANDA_PLACE_DCID = "country/RWA";
export const COLOMBIA_PLACE_DCID = "country/COL";
export const SOUTH_AFRICA_PLACE_DCID = "country/ZAF";
export const SLOVAKIA_PLACE_DCID = "country/SVK";
export const NORTHERN_EUROPE_DCID = "NorthernEurope";
export const EASTERN_EUROPE_DCID = "EasternEurope";
export const WESTERN_EUROPE_DCID = "WesternEurope";
export const EU_DCID = "EuropeanUnion";
export const MELANESIA_DCID = "Melanesia";
export const ASIA_NAMED_TYPED_PLACE: NamedTypedPlace = {
  dcid: "asia",
  name: "Asia",
  types: ["Continent"],
};
export const EUROPE_NAMED_TYPED_PLACE: NamedTypedPlace = {
  dcid: "europe",
  name: "Europe",
  types: ["Continent"],
};
export const EARTH_NAMED_TYPED_PLACE: NamedTypedPlace = {
  dcid: "Earth",
  name: "Earth",
  types: ["Planet"],
};
export const USA_NAMED_TYPED_PLACE: NamedTypedPlace = {
  dcid: "country/USA",
  name: "United States of America",
  types: ["Country"],
};
export const IPCC_PLACE_50_TYPE_DCID = "IPCCPlace_50";

export const MAX_YEAR = "2050";
export const MAX_DATE = "2050-06";

export const DEFAULT_POPULATION_DCID = "Count_Person";

export const DENOM_INPUT_PLACEHOLDER =
  "Enter a variable dcid e.g. Count_Person";

export const SOURCE_DISPLAY_NAME = {
  "https://unstats.un.org/sdgs/dataportal": "Global SDG Database",
};

export const THING_PLACE_TYPE = "Thing";

export const PLACE_TYPES = new Set([
  "Continent",
  "OceanicBasin",
  "Country",
  "State",
  "County",
  "City",
  "Town",
  "Village",
  "School",
  "PublicSchool",
  "PrivateSchool",
  "ElementarySchool",
  "HighSchool",
  "MiddleSchool",
  "SecondarySchool",
  "SchoolDistrict",
  "Borough",
  "StateComponent",
  "CollegeOrUniversity",
  "CensusRegion",
  "CensusDivision",
  "CensusCountyDivision",
  "CensusZipCodeTabulationArea",
  "CongressionalDistrict",
  "ElementarySchoolDistrict",
  "HighSchoolDistrict",
  "EurostatNUTS1",
  "EurostatNUTS2",
  "EurostatNUTS3",
  "AdministrativeArea1",
  "AdministrativeArea2",
  "AdministrativeArea3",
  "AdministrativeArea4",
  "AdministrativeArea5",
  "AdministrativeArea",
  "Neighborhood",
  "CensusCoreBasedStatisticalArea",
  "USMetropolitanDivision",
  "CommutingZone",
  "PowerPlant",
  "PowerPlantUnit",
  "PublicUtility",
  "ElectricUtility",
  "CensusTract",
  "CensusBlockGroup",
  "AirQualitySite",
  "WaterQualitySite",
  "SuperfundSite",
  "SuperfundMeasurementSite",
  "EpaReportingFacility",
  "EpaParentCompany",
  "UDISEDistrict",
  "FoodEstablishment",
  "UDISEBlock",
  "IPCCPlace_50",
  "S2CellLevel7",
  "S2CellLevel8",
  "S2CellLevel9",
  "S2CellLevel10",
  "S2CellLevel11",
  "S2CellLevel13",
  "Glacier",
  "TideGaugeStation",
  "GeoGridPlace_1Deg",
  "GeoGridPlace_0.25Deg",
  "GeoGridPlace_4KM",
  "ContinentalUnion",
  "GeoRegion",
  "UNGeoRegion",
  "UsdaSummerMealSite",
]);

/**
 * date query param value for requesting latest overall available for
 * /api/observations/point/* endpoints
 */
export const DATE_HIGHEST_COVERAGE = "HIGHEST_COVERAGE";

/**
 * date query param value for requesting latest observations from REST v2 API
 */
export const DATE_LATEST = "LATEST";

/**
 * AbortController cancelled code
 */
export const ABORT_CONTROLLER_CANCELLED = "ERR_CANCELED";
