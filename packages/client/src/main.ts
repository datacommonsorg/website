/**
 * Copyright 2024 Google LLC
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
  DEFAULT_ENTITY_PROPS,
  DEFAULT_FIELD_DELIMITER,
  DEFAULT_GEOJSON_PROPERTY_NAME,
  DEFAULT_VARIABLE_PROPS,
  ISO_CODE_ATTRIBUTE,
  NAME_ATTRIBUTE,
  TOTAL_POPULATION_VARIABLE,
} from "./constants";
import { DataCommonsClient } from "./data_commons_client";
import { DataRow } from "./data_commons_client_types";
import { DataCommonsWebClient } from "./data_commons_web_client";
import {
  PointApiResponse,
  SeriesApiResponse,
} from "./data_commons_web_client_types";
import { dataRowsToCsv, isDateInRange } from "./utils";

export {
  DEFAULT_ENTITY_PROPS,
  DEFAULT_FIELD_DELIMITER,
  DEFAULT_GEOJSON_PROPERTY_NAME,
  DEFAULT_VARIABLE_PROPS,
  DataCommonsClient,
  DataCommonsWebClient,
  ISO_CODE_ATTRIBUTE,
  NAME_ATTRIBUTE,
  TOTAL_POPULATION_VARIABLE,
  dataRowsToCsv,
  isDateInRange,
};
export type { DataRow, PointApiResponse, SeriesApiResponse };
