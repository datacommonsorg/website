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
 * Observation with calculated per capita value. The "date' and "value" fields
 * (from the parent Observation interface) will be set to the population
 * observation's respective values, and perCapitaValue is the statistical
 * variable observation value divided by the population observation value.
 *
 * TODO(dwnoble): Revisit how this interface is structured to be more intuitive.
 * Maybe: calculate quotient value on the fly and only store the population
 * observation here.
 */
export interface PerCapitaObservation extends Observation {
  /** Derived per capita value */
  perCapitaValue: number;
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

export type BaseGetCsvParams = {
  // Optional callback to transform and format a column header
  transformHeader?: (columnHeader: string) => string;
};

/**
 * Parameters for data commons client getDataRow method
 */
export type GetDataRowsParams = BaseGetDataRowsParams & DataRowsDateFilter;

/**
 * Parameters for data commons client getCsv method
 */
export type GetCsvParams = GetDataRowsParams & BaseGetCsvParams;

/**
 * Parameters for getDataRowSeries method
 */
export type GetDataRowSeriesParams = BaseGetDataRowsParams &
  DataRowsDateRangeFilter;

/**
 * Parameters for getCsvSeries method
 */
export type GetCsvSeriesParams = GetDataRowSeriesParams & BaseGetCsvParams;

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
 * Data row helper interface for storing a per capita observation and
 * derived quotient value
 */
export type DataRowPerCapitaVariable = {
  dcid: string;
  properties: DataRowNodeProperties;
  observation: DataRowObservation;
  perCapitaValue: number | null;
};

/**
 * Data row helper interface for storing variable, observation, and per capita
 * values
 */
export type DataRowVariable = {
  dcid: string;
  properties: DataRowNodeProperties;
  observation: DataRowObservation;
  perCapita?: DataRowPerCapitaVariable;
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

/**
 * Overrides observation facet StatMetadata values by unit DCID.
 * Use this as a temporary shim for corrections to observation facets
 * while knowledge graph fixes are pending.
 */
export interface FacetOverride {
  [unitDcid: string]: StatMetadata;
}
