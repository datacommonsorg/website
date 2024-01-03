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
  SeriesApiResponse,
} from "./data_commons_web_client_types";
import { encodeCsvRow } from "./utils";

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
   * Fetches data commons variable values about an entity or entities as CSV.
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns
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
   * Fetches data commons variable values about an entity or entities as GeoJSON.
   * Uses "geoJsonCoordinatesDP1" node property to fetch GeoJSON by default.
   * @param params {GetGeoJSONParams} Entities and variables to fetch data for
   * @returns
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

    // Rewind geometries by default
    const shouldRewind = params.rewind === undefined || params.rewind;

    const geoJson: FeatureCollection = {
      features: dataRows
        .filter((dataRow) => {
          const geometryString = dataRow[`entity.${geoJsonProperty}`];
          return typeof geometryString === "string";
        })
        .map((dataRow) => {
          const geometryString = dataRow[`entity.${geoJsonProperty}`] as string;
          const geometry = JSON.parse(geometryString) as Geometry;
          const properties = { ...dataRow };
          delete properties[`entity.${geoJsonProperty}`];
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
   * Fetches data commons variable values about an entity or entities.
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns
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
      this.getEntityDcidsFromPointApiResponse(pointApiResponse);
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

    const dataRows = this.getDataRowsFromObservations(
      entityDcids,
      params.variables,
      pointApiResponse,
      entityPropValues,
      variablePropValues,
      populationObservations
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
   * @param pointApiResponse
   * @returns entity DCIDs
   */
  private getEntityDcidsFromPointApiResponse(
    pointApiResponse: PointApiResponse
  ): string[] {
    const allEntityDcids = new Set<string>();
    Object.keys(pointApiResponse.data).forEach((variableDcid) => {
      Object.keys(pointApiResponse.data[variableDcid]).forEach((entityDcid) => {
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
  private getDataRowsFromObservations(
    entityDcids: string[],
    variableDcids: string[],
    pointApiResponse: PointApiResponse,
    entityPropValues: NodePropValues,
    variablePropValues: NodePropValues,
    populationObservations: SeriesApiResponse
  ): DataRow[] {
    const dataRows: DataRow[] = [];
    entityDcids.forEach((entityDcid) => {
      const row: DataRow = {
        "entity.dcid": entityDcid,
      };
      Object.keys(entityPropValues).forEach((entityProp) => {
        row[`entity.${entityProp}`] = entityPropValues[entityProp][entityDcid];
      });
      variableDcids.forEach((variableDcid) => {
        const observation =
          pointApiResponse.data[variableDcid][entityDcid] || {};
        const facet = _.get(
          pointApiResponse.facets,
          observation.facet || "",
          {}
        );
        row[`${variableDcid}.value`] = _.get(observation, "value", null);
        row[`${variableDcid}.date`] = _.get(observation, "date", null);
        row[`${variableDcid}.unit`] = _.get(facet, "unit", null);
        row[`${variableDcid}.unitDisplayName`] = _.get(
          observation,
          "unitDisplayName",
          _.get(facet, "unitDisplayName", null)
        );
        Object.keys(variablePropValues).forEach((variableProp) => {
          row[`${variableDcid}.${variableProp}`] =
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
          row[`${variableDcid}.perCapita.value`] =
            closestPopulationObservation && !_.isEmpty(observation)
              ? observation.value / closestPopulationObservation.value
              : null;
          row[`${variableDcid}.perCapita.populationVariable`] =
            TOTAL_POPULATION_VARIABLE;
          row[`${variableDcid}.perCapita.date`] =
            closestPopulationObservation && !_.isEmpty(observation)
              ? closestPopulationObservation.date
              : null;
          row[`${variableDcid}.perCapita.populationValue`] =
            closestPopulationObservation && !_.isEmpty(observation)
              ? closestPopulationObservation.value
              : null;
        }
      });

      dataRows.push(row);
    });
    return dataRows;
  }
}
export { DataCommonsClient };
