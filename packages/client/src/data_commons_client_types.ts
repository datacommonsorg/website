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

import { Observation, StatMetadata } from "./data_commons_web_client_types";

/**
 * Interface definitions supporting DataCommonsClient
 */

/**
 * Observation with calculated quotient value (for per-capita values)
 */
export interface QuotientObservation extends Observation {
  /** Derived quotient value */
  quotientValue: number;
}

export interface BaseGetDataRowsParams {
  /** Variable DCIDs */
  variables: string[];
  /** Example: 2023 */
  date?: string;
  /** Fetch these entity properties from the knowledge graph. Default: `["name", "isoCode"]` */
  entityProps?: string[];
  /** Fetch these variable properties from the knowledge graph. Default: `["name"]` */
  variableProps?: string[];
  /**
   * Performs per-capita caluclation for all of these variables.
   * Must be a subset of `variables` param.
   */
  perCapitaVariables?: string[];
  /**
   * Delimiter for field header.
   * Example, if fieldDelimiter = ".", entity value header will be "entity.value"
   *
   * Default: "__"
   */
  fieldDelimiter?: string;
}

export interface GetDataRowsParamsWithin extends BaseGetDataRowsParams {
  /** Parent entity DCID. Example: `"country/USA"` */
  parentEntity: string;
  /** Child node type. Example: `"State"` */
  childType: string;
}

export interface GetDataRowsParamsEntities extends BaseGetDataRowsParams {
  /** Entity DCIDs. Example: `["country/USA", "country/IND"]` */
  entities: string[];
}
export type GetDataRowsParams =
  | GetDataRowsParamsWithin
  | GetDataRowsParamsEntities;

export type GetDataRowSeriesParams =
  | GetDataRowsParamsWithin
  | GetDataRowsParamsEntities;

export type GetGeoJSONParams = GetDataRowsParams & {
  /** GeoJSON property name in the knowledge graph. Inferred if not provided. */
  geoJsonProperty?: string;
  /**
   * If true, returns "rewound" geometries that are opposite of the right-hand rule.
   * Default: true.
   */
  rewind?: boolean;
};

export type DataRowObservation = {
  date: string | null;
  value: number | null;
  metadata: StatMetadata;
};
export type DataRowNodeProperties = {
  name: string;
  [propertyName: string]: string | number | boolean | null;
};
export type DataRowVariable = {
  dcid: string;
  properties: DataRowNodeProperties;
  observation: DataRowObservation;
  denominator?: {
    dcid: string;
    properties: DataRowNodeProperties;
    observation: DataRowObservation;
    quotientValue: number | null;
  };
};
export type DataRow = {
  entity: {
    dcid: string;
    properties: DataRowNodeProperties;
  };
  variable: DataRowVariable;
};
export type EntityGroupedDataRow = {
  entity: {
    dcid: string;
    properties: DataRowNodeProperties;
  };
  variables: {
    [variableName: string]: DataRowVariable;
  };
};
export type NodePropValues = {
  [propertyName: string]: {
    [nodeDcid: string]: string | null;
  };
};
