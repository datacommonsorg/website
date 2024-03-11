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

/**
 * Data Commons Client for fetching data as CSV, JSON, and GeoJSON.
 */

import rewind from "@turf/rewind";
import { Feature, FeatureCollection, Geometry } from "geojson";
import * as _ from "lodash";

import {
  DataRow,
  GetDataRowsParams,
  GetGeoJSONParams,
  NodePropValues,
} from "./data_commons_client_types";
import { DataCommonsWebClient } from "./data_commons_web_client";
import {
  Observation,
  PointApiResponse,
  Series,
  SeriesApiResponse,
} from "./data_commons_web_client_types";
import { computeRatio, encodeCsvRow } from "./utils";

// Total population stat var
const TOTAL_POPULATION_VARIABLE = "Count_Person";
// Name attribute for entities and variables
const NAME_ATTRIBUTE = "name";
// ISO 3166-2 code property name for place entities
const ISO_CODE_ATTRIBUTE = "isoCode";
// Fetch these entity and variable properties by default
const DEFAULT_ENTITY_PROPS = [NAME_ATTRIBUTE, ISO_CODE_ATTRIBUTE];
const DEFAULT_VARIABLE_PROPS = [NAME_ATTRIBUTE];
// GeoJSON is stored in this property name by default
export const DEFAULT_GEOJSON_PROPERTY_NAME = "geoJsonCoordinatesDP1";
// Delimit fields
export const DEFAULT_FIELD_DELIMITER = "__";

export interface DatacommonsClientParams {
  /** Web api root endpoint. Default: `"https://datacommons.org/"` */
  apiRoot?: string;
}

class DataCommonsClient {
  apiRoot?: string;
  webClient: DataCommonsWebClient;

  constructor(params?: DatacommonsClientParams) {
    const p = params || {};
    this.apiRoot = p.apiRoot
      ? p.apiRoot.replace(/\/$/, "")
      : "https://datacommons.org";
    this.webClient = new DataCommonsWebClient({
      apiRoot: this.apiRoot,
    });
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities as CSV.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns CSV string
   */
  async getCsv(params: GetDataRowsParams): Promise<string> {
    const dataRows = await this.getDataRows(params);

    if (dataRows.length === 0) {
      return "";
    }

    const header = Object.keys(dataRows[0]).sort();
    const rows = dataRows.map((dataRow) =>
      header.map((column) => dataRow[column])
    );
    const csvRows = [header, ...rows];
    const csvLines = csvRows.map(encodeCsvRow);
    return csvLines.join("\n");
  }

  /**
   * Fetches most recent data commons observation(s) about an entity or
   * entities as GeoJSON.
   *
   * Uses "geoJsonCoordinatesDP1" node property to fetch GeoJSON by default.
   *
   * @param params {GetGeoJSONParams} Entities and variables to fetch data for
   * @returns GeoJSON object
   */
  async getGeoJSON(params: GetGeoJSONParams): Promise<FeatureCollection> {
    const geoJsonProperty =
      params.geoJsonProperty || DEFAULT_GEOJSON_PROPERTY_NAME;
    const dataRows = await this.getDataRows({
      ...params,
      entityProps: [
        geoJsonProperty,
        ...(params.entityProps || DEFAULT_ENTITY_PROPS),
      ],
    });
    const fieldDelimiter = params.fieldDelimiter || DEFAULT_FIELD_DELIMITER;

    // Rewind geometries by default
    const shouldRewind = params.rewind === undefined || params.rewind;

    const geoJson: FeatureCollection = {
      features: dataRows
        .filter((dataRow) => {
          const geometryString =
            dataRow[`entity${fieldDelimiter}${geoJsonProperty}`];
          return typeof geometryString === "string";
        })
        .map((dataRow) => {
          const geometryString = dataRow[
            `entity${fieldDelimiter}${geoJsonProperty}`
          ] as string;
          const geometry = JSON.parse(geometryString) as Geometry;
          const properties = { ...dataRow };
          delete properties[`entity${fieldDelimiter}${geoJsonProperty}`];
          const feature: Feature = {
            geometry,
            properties,
            type: "Feature",
          };
          if (feature.geometry && shouldRewind) {
            return rewind(feature, { reverse: true });
          }
          return feature;
        }),
      type: "FeatureCollection",
    };
    return geoJson;
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns Data rows list
   */
  async getDataRows(params: GetDataRowsParams): Promise<DataRow[]> {
    // Fetch variable observations
    const pointApiResponse =
      "parentEntity" in params
        ? await this.webClient.getObservationsPointWithin(params)
        : await this.webClient.getObservationsPoint(params);
    if (!pointApiResponse) {
      return [];
    }
    const entityDcids =
      this.getEntityDcidsFromObservationApiResponse(pointApiResponse);
    // Fetch relevant entity and variable property values
    const entityPropValues = await this.getNodePropValues(
      entityDcids,
      params.entityProps || DEFAULT_ENTITY_PROPS
    );
    const variablePropValues = await this.getNodePropValues(
      params.variables,
      params.variableProps || DEFAULT_VARIABLE_PROPS
    );

    // Fetch population data for per capita calculations
    let populationObservations: SeriesApiResponse = { data: {}, facets: {} };
    if (!_.isEmpty(params.perCapitaVariables)) {
      populationObservations =
        "parentEntity" in params
          ? await this.webClient.getObservationsSeriesWithin({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            })
          : await this.webClient.getObservationsSeries({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            });
    }

    const dataRows = this.getDataRowsFromPointObservations(
      entityDcids,
      params.variables,
      pointApiResponse,
      entityPropValues,
      variablePropValues,
      populationObservations,
      params.fieldDelimiter || DEFAULT_FIELD_DELIMITER
    );

    return Promise.resolve(dataRows);
  }

  /**
   * Fetches all Data Commons variable observation about an entity or entities
   * as CSV.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns CSV string
   */
  async getCsvSeries(params: GetDataRowsParams): Promise<string> {
    const dataRows = await this.getDataRowSeries(params);

    if (dataRows.length === 0) {
      return "";
    }

    const header = Object.keys(dataRows[0]).sort();
    const rows = dataRows.map((dataRow) =>
      header.map((column) => dataRow[column])
    );
    const csvRows = [header, ...rows];
    const csvLines = csvRows.map(encodeCsvRow);
    return csvLines.join("\n");
  }

  /**
   * Fetches data commons observation series about an entity or entities.
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns Data rows list
   */
  async getDataRowSeries(params: GetDataRowsParams): Promise<DataRow[]> {
    // Fetch variable observations
    const seriesApiResponse =
      "parentEntity" in params
        ? await this.webClient.getObservationsSeriesWithin(params)
        : await this.webClient.getObservationsSeries(params);
    if (!seriesApiResponse) {
      return [];
    }
    const entityDcids =
      this.getEntityDcidsFromObservationApiResponse(seriesApiResponse);
    // Fetch relevant entity and variable property values
    const entityPropValues = await this.getNodePropValues(
      entityDcids,
      params.entityProps || DEFAULT_ENTITY_PROPS
    );
    const variablePropValues = await this.getNodePropValues(
      params.variables,
      params.variableProps || DEFAULT_VARIABLE_PROPS
    );

    // Fetch population data for per capita calculations
    let populationObservations: SeriesApiResponse = { data: {}, facets: {} };
    if (!_.isEmpty(params.perCapitaVariables)) {
      populationObservations =
        "parentEntity" in params
          ? await this.webClient.getObservationsSeriesWithin({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            })
          : await this.webClient.getObservationsSeries({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            });
    }

    const dataRows = this.getDataRowsFromSeriesObservations(
      entityDcids,
      params.variables,
      seriesApiResponse,
      entityPropValues,
      variablePropValues,
      populationObservations,
      params.fieldDelimiter || DEFAULT_FIELD_DELIMITER
    );

    return Promise.resolve(dataRows);
  }

  /**
   * Fetches the first node property value for the given property name
   * @param params.dcids List of dcids to fetch property values for
   * @param params.prop Property name to fetch
   */
  async getFirstNodeValues(params: {
    dcids: string[];
    prop: string;
  }): Promise<Record<string, string | null>> {
    const nodePropvals = await this.webClient.getNodePropvals(params);
    const nodeValues: Record<string, string | null> = {};
    Object.keys(nodePropvals).forEach((nodeDcid) => {
      nodeValues[nodeDcid] =
        nodePropvals[nodeDcid].length > 0
          ? nodePropvals[nodeDcid][0].value
          : null;
    });
    return nodeValues;
  }

  /**
   * Fetches node properties from the provided list of dcids
   * @param dcids node dcids
   * @param props properties to fetch
   * @returns Nested object mapping property names to dcids to values
   */
  private async getNodePropValues(
    dcids: string[],
    props: string[]
  ): Promise<NodePropValues> {
    if (dcids.length === 0 || props.length === 0) {
      return {};
    }
    const nodePropValues: NodePropValues = {};
    for (const propName of props) {
      nodePropValues[propName] = await this.getFirstNodeValues({
        dcids,
        prop: propName,
      });
    }
    return nodePropValues;
  }

  /**
   * Find the observation with the closest date to targetDate
   * @param observations sorted observations
   * @param targetDate date string
   * @returns closest observation or undefined if no observations are given
   */
  private getClosestObservationToDate(
    observations: Observation[],
    targetDate: string
  ): Observation | undefined {
    // If no target date is passed in, return the most recent observation
    if (!targetDate) {
      return observations[observations.length - 1];
    }
    const index = _.sortedIndexBy(
      observations,
      { value: 0, date: targetDate },
      (o) => o.date
    );
    return observations[index];
  }

  /**
   * Returns all entity DCIDs found in the given PointApiResponse
   * @param apiResponse
   * @returns entity DCIDs
   */
  private getEntityDcidsFromObservationApiResponse(
    apiResponse: PointApiResponse | SeriesApiResponse
  ): string[] {
    const allEntityDcids = new Set<string>();
    Object.keys(apiResponse.data).forEach((variableDcid) => {
      Object.keys(apiResponse.data[variableDcid]).forEach((entityDcid) => {
        allEntityDcids.add(entityDcid);
      });
    });
    return Array.from(allEntityDcids);
  }

  /**
   * Enriches PointApiResponse and converts response into a list of `DataRow`s
   * @param entityDcids Entity DCIDs
   * @param variableDcids Variable DCIDs
   * @param pointApiResponse Entity/variable observations
   * @param entityPropValues Additional entity properties to fetch
   * @param variablePropValues Additional variable properties to fetch
   * @param populationObservations Population observations for our list of entities for per-capita calculations
   * @returns data rows
   */
  private getDataRowsFromPointObservations(
    entityDcids: string[],
    variableDcids: string[],
    pointApiResponse: PointApiResponse,
    entityPropValues: NodePropValues,
    variablePropValues: NodePropValues,
    populationObservations: SeriesApiResponse,
    fieldDelimiter: string
  ): DataRow[] {
    const dataRows: DataRow[] = [];
    entityDcids.forEach((entityDcid) => {
      const row: DataRow = {
        [`entity${fieldDelimiter}dcid`]: entityDcid,
      };
      Object.keys(entityPropValues).forEach((entityProp) => {
        row[`entity${fieldDelimiter}${entityProp}`] =
          entityPropValues[entityProp][entityDcid];
      });
      variableDcids.forEach((variableDcid) => {
        const observation =
          pointApiResponse.data[variableDcid][entityDcid] || {};
        const facet = _.get(
          pointApiResponse.facets,
          observation.facet || "",
          {}
        );
        row[`${variableDcid}${fieldDelimiter}value`] = _.get(
          observation,
          "value",
          null
        );
        row[`${variableDcid}${fieldDelimiter}date`] = _.get(
          observation,
          "date",
          null
        );
        row[`${variableDcid}${fieldDelimiter}unit`] = _.get(
          facet,
          "unit",
          null
        );
        row[`${variableDcid}${fieldDelimiter}unitDisplayName`] = _.get(
          observation,
          "unitDisplayName",
          _.get(facet, "unitDisplayName", null)
        );
        Object.keys(variablePropValues).forEach((variableProp) => {
          row[`${variableDcid}${fieldDelimiter}${variableProp}`] =
            variablePropValues[variableProp][variableDcid];
        });
        // Set per-capita data
        if (
          TOTAL_POPULATION_VARIABLE in populationObservations.data &&
          entityDcid in populationObservations.data[TOTAL_POPULATION_VARIABLE]
        ) {
          const series =
            populationObservations.data[TOTAL_POPULATION_VARIABLE][entityDcid];

          const closestPopulationObservation = this.getClosestObservationToDate(
            series.series,
            observation.date
          );
          row[
            `${variableDcid}${fieldDelimiter}perCapita${fieldDelimiter}value`
          ] =
            closestPopulationObservation && !_.isEmpty(observation)
              ? observation.value / closestPopulationObservation.value
              : null;
          row[
            `${variableDcid}${fieldDelimiter}perCapita${fieldDelimiter}populationVariable`
          ] = TOTAL_POPULATION_VARIABLE;
          row[
            `${variableDcid}${fieldDelimiter}perCapita${fieldDelimiter}date`
          ] =
            closestPopulationObservation && !_.isEmpty(observation)
              ? closestPopulationObservation.date
              : null;
          row[
            `${variableDcid}${fieldDelimiter}perCapita${fieldDelimiter}populationValue`
          ] =
            closestPopulationObservation && !_.isEmpty(observation)
              ? closestPopulationObservation.value
              : null;
        }
      });

      dataRows.push(row);
    });
    return dataRows;
  }

  /**
   * Enriches SeriesApiResponse and converts response into a list of `DataRow`s
   * @param entityDcids Entity DCIDs
   * @param variableDcids Variable DCIDs
   * @param seriesApiResponse Entity/variable observations
   * @param entityPropValues Additional entity properties to fetch
   * @param variablePropValues Additional variable properties to fetch
   * @param populationObservations Population observations for our list of entities for per-capita calculations
   * @returns data rows
   */
  private getDataRowsFromSeriesObservations(
    entityDcids: string[],
    variableDcids: string[],
    seriesApiResponse: SeriesApiResponse,
    entityPropValues: NodePropValues,
    variablePropValues: NodePropValues,
    populationObservations: SeriesApiResponse,
    fieldDelimiter: string
  ): DataRow[] {
    const dataRows: DataRow[] = [];
    entityDcids.forEach((entityDcid) => {
      variableDcids.forEach((variableDcid) => {
        const series = seriesApiResponse.data[variableDcid][entityDcid] || {};
        if (_.isEmpty(series)) {
          return;
        }
        const facet = _.get(seriesApiResponse.facets, series.facet || "", {});
        let perCapitaObservations: Observation[] = [];
        let populationSeries: Series | null = null;
        if (
          TOTAL_POPULATION_VARIABLE in populationObservations.data &&
          entityDcid in populationObservations.data[TOTAL_POPULATION_VARIABLE]
        ) {
          populationSeries =
            populationObservations.data[TOTAL_POPULATION_VARIABLE][entityDcid];
          perCapitaObservations = computeRatio(
            series.series,
            populationSeries.series
          );
        }
        series.series.forEach((observation, observationIndex) => {
          const row: DataRow = {
            [`entity${fieldDelimiter}dcid`]: entityDcid,
          };
          Object.keys(entityPropValues).forEach((entityProp) => {
            row[`entity${fieldDelimiter}${entityProp}`] =
              entityPropValues[entityProp][entityDcid];
          });
          row[`variable${fieldDelimiter}dcid`] = variableDcid;
          row[`variable${fieldDelimiter}value`] = observation.value;
          row[`variable${fieldDelimiter}date`] = observation.date;
          row[`variable${fieldDelimiter}unit`] = _.get(facet, "unit", null);
          row[`variable${fieldDelimiter}unitDisplayName`] = _.get(
            observation,
            "unitDisplayName",
            _.get(facet, "unitDisplayName", null)
          );
          Object.keys(variablePropValues).forEach((variableProp) => {
            row[`variable${fieldDelimiter}${variableProp}`] =
              variablePropValues[variableProp][variableDcid];
          });

          // Set per-capita data
          if (perCapitaObservations.length === series.series.length) {
            const perCapitaObservation =
              perCapitaObservations[observationIndex];
            row[`perCapita${fieldDelimiter}value`] = perCapitaObservation.value;
            row[`perCapita${fieldDelimiter}date`] = perCapitaObservation.date;
            row[`perCapita${fieldDelimiter}populationVariable`] =
              TOTAL_POPULATION_VARIABLE;
            // Compute population using population = observationValue / perCapitaValue
            row[`perCapita${fieldDelimiter}populationValue`] =
              perCapitaObservation.value > 0
                ? Math.round(observation.value / perCapitaObservation.value)
                : null;
          }
          dataRows.push(row);
        });
      });
    });
    return dataRows;
  }
}
export { DataCommonsClient };
