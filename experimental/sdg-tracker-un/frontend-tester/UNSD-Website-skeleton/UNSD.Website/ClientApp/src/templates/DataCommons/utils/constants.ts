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

import appConfig from "../config/appConfig.json";

/**
 * DCID for the Earth/World
 */
export const EARTH_PLACE_DCID = "Earth";

/**
 * Place name for Earth/World
 */
export const EARTH_PLACE_NAME = "World";

/**
 * Country place type
 */
export const COUNTRY_PLACE_TYPE = "Country";

export const EARTH_COUNTRIES = [
  "country/AUS",
  "country/USA",
  "country/MEX",
  "country/BRA",
  "country/COL",
  "country/IND",
  "country/CHN",
  "country/RUS",
  "country/NGA",
  "country/ETH",
  "country/SOM",
  "country/KEN",
  "country/FRA",
  "country/UKR",
  "country/DEU",
  "country/JPN",
  "country/IDN",
  "country/PHL",
  "country/SAU",
  "country/IRN",
  "country/KAZ",
];

/**
 * Variable DCID url parameter
 */
export const QUERY_PARAM_VARIABLE = "v";

/**
 * Place DCID url parameter
 */
export const QUERY_PARAM_PLACE = "p";

/**
 * Query search text url parameter
 */
export const QUERY_PARAM_QUERY = "q";

/**
 * Root SDG variable group
 */
export const ROOT_TOPIC = "dc/topic/sdg";

/**
 * DCID returned by fulfillment when no topic is identified
 */
export const NULL_TOPIC = "dc/topic/Root";

/**
 * Web api root
 */
export const WEB_API_ENDPOINT = appConfig.webApiEndpoint;

/**
 * URL to the SDG wheel icon
 */
export const SDG_ICON_URL = "./images/datacommons/sdg-wheel-transparent.png";

/**
 * Number of characters on footnote to show before ...
 */
export const FOOTNOTE_CHAR_LIMIT = 100;
