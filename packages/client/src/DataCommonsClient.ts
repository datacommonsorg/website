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

import { Feature, FeatureCollection, Geometry } from "geojson";
import * as _ from "lodash";
import {
  ApiNodePropvalOutResponse,
  Observation,
  PointApiResponse,
  SeriesApiResponse,
} from "./types";
import { encodeCsvRow, toURLSearchParams } from "./utils";

// Total population stat var
const TOTAL_POPULATION_VARIABLE = "Count_Person";
// Name attribute for entities and variables
const NAME_ATTRIBUTE = "name";
// ISO 3166-2 code property name for place entities
const ISO_CODE_ATTRIBUTE = "isoCode";
// Fetch these entity and variable properties by default
const DEFAULT_ENTITY_PROPS = [NAME_ATTRIBUTE, ISO_CODE_ATTRIBUTE];
const DEFAULT_VARIABLE_PROPS = [NAME_ATTRIBUTE];

export interface DatacommonsWebClientParams {
  /** Web api root endpoint. Default: `"https://datacommons.org/""` */
  apiRoot?: string;
}

export interface BaseGetDataRowsParams {
  /** Variable DCIDs */
  variables: string[];
  /** Example: 2023 */
  date?: string;
  facetIds?: string[];
  /** Fetch these entity properties from the knowledge graph. Default: `["name", "isoCode"]` */
  entityProps?: string[];
  /** Fetch these variable properties from the knowledge graph. Default: `["name"]` */
  variableProps?: string[];
  /**
   * Performs per-capita caluclation for any of these variables.
   * Must be a subset of `variables` param.
   */
  perCapitaVariables?: string[];
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

export type GetGeoJSONParams = GetDataRowsParams & {
  /** GeoJSON property name in the knowledge graph. Inferred if not provided. */
  geoJsonProperty?: string;
};

export interface DataRow {
  [key: string]: string | number | boolean | null;
}

export type NodePropValues = Record<string, Record<string, string | null>>;

class DataCommonsWebClient {
  apiRoot?: string;

  constructor(params?: DatacommonsWebClientParams) {
    const p = params || {};
    this.apiRoot =
      p.apiRoot !== undefined
        ? p.apiRoot.replace(/\/$/, "")
        : "https://datacommons.org";
  }

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

  async getGeoJSON(params: GetGeoJSONParams): Promise<FeatureCollection> {
    const geoJsonProperty = params.geoJsonProperty || "geoJsonCoordinatesDP1";
    const dataRows = await this.getDataRows({
      ...params,
      entityProps: [
        geoJsonProperty,
        ...(params.entityProps ? params.entityProps : DEFAULT_ENTITY_PROPS),
      ],
    });

    const geoJson: FeatureCollection = {
      type: "FeatureCollection",
      features: dataRows
        .filter((dataRow) => {
          const geometryString = dataRow[`entity.${geoJsonProperty}`];
          if (geometryString !== "string") {
            return true;
          }
        })
        .map((dataRow) => {
          const geometryString = dataRow[`entity.${geoJsonProperty}`] as string;
          const geometry = JSON.parse(geometryString) as Geometry;
          const properties = { ...dataRow };
          delete properties[`entity.${geoJsonProperty}`];
          const feature: Feature = {
            type: "Feature",
            properties,
            geometry,
          };
          return feature;
        }),
    };
    return geoJson;
  }

  /**
   * Fetches data commons variable values about an entity or entities.
   * @param params
   * @returns
   */
  async getDataRows(params: GetDataRowsParams): Promise<DataRow[]> {
    // Fetch variable observations
    const pointApiResponse =
      "parentEntity" in params
        ? await this.getObservationsPointWithin(params)
        : await this.getObservationsPoint(params);
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
          ? await this.getObservationsSeriesWithin({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
            })
          : await this.getObservationsSeries({
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

  async getFirstNodeValues(params: {
    dcids: string[];
    prop: string;
  }): Promise<Record<string, string | null>> {
    const nodePropvals = await this.getNodePropvals(params);
    const nodeValues: Record<string, string | null> = {};
    Object.keys(nodePropvals).forEach((variableDcid) => {
      nodeValues[variableDcid] =
        nodePropvals[variableDcid].length > 0
          ? nodePropvals[variableDcid][0].value
          : null;
    });
    return nodeValues;
  }

  async getNodePropvals(params: {
    dcids: string[];
    prop: string;
  }): Promise<ApiNodePropvalOutResponse> {
    const queryString = toURLSearchParams({
      dcids: params.dcids,
      prop: params.prop,
    });
    const url = `${this.apiRoot || ""}/api/node/propvals/out?${queryString}`;
    return (await (await fetch(url)).json()) as ApiNodePropvalOutResponse;
  }

  /**
   * Fetches place/entity names
   * @param entityDcids list of entity DCIDs
   * @param prop optional entity name property
   */
  async getPlaceNames(params: {
    dcids: string[];
    prop?: string;
  }): Promise<Record<string, string>> {
    if (!params.dcids.length) {
      return Promise.resolve({});
    }
    const url = `${this.apiRoot || ""}/api/place/name`;
    const response = await fetch(url, {
      method: "post",
      body: JSON.stringify({
        dcids: params.dcids,
        prop: params.prop,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return (await response.json()) as Record<string, string>;
  }

  /**
   * Gets and processes the data from /api/observations/point endpoint
   * @param apiRoot api root
   * @param entities list of entitites to get data for
   * @param variables list of variables to get data for
   * @param date date to get the data for
   * @param alignedVariables groups of variables that should have the same unit
   */
  async getObservationsPoint(params: {
    date?: string;
    entities: string[];
    variables: string[];
  }): Promise<PointApiResponse> {
    const queryString = toURLSearchParams({
      date: params.date,
      entities: params.entities,
      variables: params.variables,
    });
    const url = `${this.apiRoot || ""}/api/observations/point?${queryString}`;
    return (await (await fetch(url)).json()) as PointApiResponse;
  }

  /**
   * Fetches point observations related to entities of type childType
   * that are contained within the specified parentEntity
   *
   * Uses /api/observations/point/within endpoint
   * @param childType type of entity to get data for
   * @param parentEntity the parent entity of the entities to get data for
   * @param variables list of variables to get data for
   * @param date date to get the data for
   */
  async getObservationsPointWithin(params: {
    parentEntity: string;
    childType: string;
    variables: string[];
    date?: string;
    facetIds?: string[];
  }): Promise<PointApiResponse> {
    const queryString = toURLSearchParams({
      parentEntity: params.parentEntity,
      childType: params.childType,
      variables: params.variables,
      date: params.date,
      facetIds: params.facetIds,
    });
    const url = `${
      this.apiRoot || ""
    }/api/observations/point/within?${queryString}`;
    return (await (await fetch(url)).json()) as PointApiResponse;
  }

  /**
   * Gets the data from /api/observations/series endpoint.
   * @param entities list of enitites to get data for
   * @param variables list of variables to get data for
   */
  async getObservationsSeries(params: {
    entities: string[];
    variables: string[];
    facetIds?: string[];
  }): Promise<SeriesApiResponse> {
    const queryString = toURLSearchParams({
      entities: params.entities,
      variables: params.variables,
      facetIds: params.facetIds,
    });
    const url = `${this.apiRoot || ""}/api/observations/series?${queryString}`;
    return (await (await fetch(url)).json()) as SeriesApiResponse;
  }

  /**
   * Gets the data from /api/observations/series/within endpoint.
   * @param parentEntity parent place to get the data for
   * @param childType place type to get the data for
   * @param variables variables to get data for
   * @returns
   */
  async getObservationsSeriesWithin(params: {
    parentEntity: string;
    childType: string;
    variables: string[];
    facetIds?: string[];
  }): Promise<SeriesApiResponse> {
    const queryString = toURLSearchParams({
      parentEntity: params.parentEntity,
      childType: params.childType,
      variables: params.variables,
      facetIds: params.facetIds,
    });
    const url = `${
      this.apiRoot || ""
    }/api/observations/series/within?${queryString}`;
    return (await (await fetch(url)).json()) as SeriesApiResponse;
  }

  /**
   * Fetches node properties from the provided list of dcids
   * @param dcids node dcids
   * @param props properties to fetch
   * @returns
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
   */
  private getClosestObservationToDate(
    observations: Observation[],
    targetDate: string
  ): Observation | undefined {
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
  ) {
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
        if (TOTAL_POPULATION_VARIABLE in populationObservations.data) {
          const series =
            populationObservations.data[TOTAL_POPULATION_VARIABLE][entityDcid];
          const closestPopulationObservation = this.getClosestObservationToDate(
            series.series,
            observation.date
          );
          row[`${variableDcid}.perCapita.value`] = closestPopulationObservation
            ? observation.value / closestPopulationObservation.value
            : null;
          row[`${variableDcid}.perCapita.populationVariable`] =
            TOTAL_POPULATION_VARIABLE;
          row[`${variableDcid}.perCapita.date`] = closestPopulationObservation
            ? closestPopulationObservation.date
            : null;
          row[`${variableDcid}.perCapita.populationValue`] =
            closestPopulationObservation
              ? closestPopulationObservation.value
              : null;
        }
      });

      dataRows.push(row);
    });
    return dataRows;
  }
}
export { DataCommonsWebClient };
