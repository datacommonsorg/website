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
 * Denominator observation with calculated quotient value. Used for storing
 * per-capita derived values along side the original population observation.
 * "date' and "value" fields from the parent Observation interface will be set
 * to the original observation dates and values, and quotientValue is the
 * derived (per-capita) value.
 *
 * TODO(dwnoble): Revisit how this interface is structured to be more intuitive.
 * Maybe: calculate quotient value on the fly and only store the population
 * observation here.
 */
export interface QuotientObservation extends Observation {
  /** Derived quotient value */
  quotientValue: number;
}

export interface BaseGetDataRowsVariableParams {
  /** Variable DCIDs */
  variables: string[];
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

export interface DataRowsDateFilter {
  date?: string;
}

export interface DataRowsDateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface BaseGetDataRowsParamsWithin
  extends BaseGetDataRowsVariableParams {
  /** Parent entity DCID. Example: `"country/USA"` */
  parentEntity: string;
  /** Child node type. Example: `"State"` */
  childType: string;
}

export interface BaseGetDataRowsParamsEntities
  extends BaseGetDataRowsVariableParams {
  /** Entity DCIDs. Example: `["country/USA", "country/IND"]` */
  entities: string[];
}

export type BaseGetDataRowsParams =
  | BaseGetDataRowsParamsWithin
  | BaseGetDataRowsParamsEntities;

/**
 * Parameters for data commons client getDataRow and getCsv methods
 */
export type GetDataRowsParams = BaseGetDataRowsParams & DataRowsDateFilter;

/**
 * Parameters for etDataRowSeries and getCsvSeries methods
 */
export type GetDataRowSeriesParams = BaseGetDataRowsParams &
  DataRowsDateRangeFilter;

export type GetGeoJSONParams = BaseGetDataRowsParams & {
  /** GeoJSON property name in the knowledge graph. Inferred if not provided. */
  geoJsonProperty?: string;
  /**
   * If true, returns "rewound" geometries that are opposite of the right-hand rule.
   * Default: true.
   */
  rewind?: boolean;
};

/**
 * Data row helper interface for storing observation values
 */
export type DataRowObservation = {
  date: string | null;
  value: number | null;
  metadata: StatMetadata;
};

/**
 * Data row helper interface for storing node property dcids and values
 */
export type DataRowNodeProperties = {
  name: string;
  [propertyDcid: string]: string | number | boolean | null;
};

/**
 * Data row helper interface for storing a denominator observation and
 * derived quotient value
 */
export type DataRowDenominator = {
  dcid: string;
  properties: DataRowNodeProperties;
  observation: DataRowObservation;
  quotientValue: number | null;
};

/**
 * Data row helper interface for storing variable, observation, and denominator
 * values
 */
export type DataRowVariable = {
  dcid: string;
  properties: DataRowNodeProperties;
  observation: DataRowObservation;
  denominator?: DataRowDenominator;
};

/**
 * Data row about a single entity and single variable
 */
export type DataRow = {
  entity: {
    dcid: string;
    properties: DataRowNodeProperties;
  };
  variable: DataRowVariable;
};

/**
 * Data row about a single entity and multiple variable observations
 */
export type EntityGroupedDataRow = {
  entity: {
    dcid: string;
    properties: DataRowNodeProperties;
  };
  variables: {
    [variableName: string]: DataRowVariable;
  };
};

/**
 * Object of property dcids to node DCIDs to property values
 */
export type NodePropValues = {
  [propertyDcid: string]: {
    [nodeDcid: string]: string | null;
  };
};
