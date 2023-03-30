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
export const NEPAL_PLACE_DCID = "country/NPL";
export const PAKISTAN_PLACE_DCID = "country/PAK";
export const CHINA_PLACE_DCID = "country/CHN";
export const NORTH_AMERICA_DCID = "northamerica";
export const OCEANIA_DCID = "oceania";
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
