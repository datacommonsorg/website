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
import { Feature, FeatureCollection, Geometry, Point } from "geojson";
import * as _ from "lodash";

import {
  DEFAULT_ENTITY_PROPS,
  DEFAULT_FIELD_DELIMITER,
  DEFAULT_GEOJSON_PROPERTY_NAME,
  DEFAULT_VARIABLE_PROPS,
  NAME_ATTRIBUTE,
  TOTAL_POPULATION_VARIABLE,
} from "./constants";
import {
  DataRow,
  DataRowPerCapitaVariable,
  EntityGroupedDataRow,
  FacetOverride,
  GetCsvParams,
  GetCsvSeriesParams,
  GetDataRowSeriesParams,
  GetDataRowsParams,
  GetGeoJSONParams,
  NodePropValues,
  PerCapitaObservation,
} from "./data_commons_client_types";
import { DataCommonsWebClient } from "./data_commons_web_client";
import {
  FacetStore,
  Observation,
  PointApiResponse,
  Series,
  SeriesApiResponse,
  StatMetadata,
} from "./data_commons_web_client_types";
import {
  DEFAULT_FACET_OVERRIDE,
  computePerCapitaRatio,
  dataRowsToCsv,
  flattenNestedObject,
  isDateInRange,
  parseWebsiteApiRoot,
} from "./utils";

export interface DatacommonsClientParams {
  /** Web api root endpoint. Default: `"https://datacommons.org/"` */
  apiRoot?: string;
  /** Overrides observation facet StatMetadata values by unit DCID. */
  facetOverride?: FacetOverride | null;
}

class DataCommonsClient {
  /** Website API Root */
  apiRoot?: string;
  webClient: DataCommonsWebClient;
  facetOverride: FacetOverride;

  constructor(params?: DatacommonsClientParams) {
    const p = params || {};
    this.apiRoot = parseWebsiteApiRoot(p.apiRoot);
    // Initialize DataCommonsWebClient with p.apiRoot since the client will call
    // parseWebsiteApiRoot on its own
    this.webClient = new DataCommonsWebClient({
      apiRoot: p.apiRoot,
    });
    if (p.facetOverride === undefined) {
      this.facetOverride = DEFAULT_FACET_OVERRIDE;
    } else {
      this.facetOverride = p.facetOverride || {};
    }
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities as CSV.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns CSV string
   */
  async getCsv(params: GetCsvParams): Promise<string> {
    const dataRows = await this.getDataRows(params);
    return dataRowsToCsv(
      dataRows,
      params.fieldDelimiter,
      params.transformHeader
    );
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities as CSV. Each result row has data about a single entity and all
   * requested variable observations
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns CSV string
   */
  async getCsvGroupedByEntity(params: GetCsvParams): Promise<string> {
    const dataRows = await this.getDataRowsGroupedByEntity(params);
    return dataRowsToCsv(
      dataRows,
      params.fieldDelimiter,
      params.transformHeader
    );
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
    const dataRows = await this.getDataRowsGroupedByEntity({
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
          const geometryString = dataRow.entity.properties[geoJsonProperty];
          return typeof geometryString === "string";
        })
        .map((dataRow) => {
          const geometryString = dataRow.entity.properties[
            geoJsonProperty
          ] as string;
          const geometry = JSON.parse(geometryString) as Geometry;
          const dataRowCopy = _.cloneDeep(dataRow);
          delete dataRowCopy.entity.properties[geoJsonProperty];
          const feature: Feature = {
            geometry,
            properties: flattenNestedObject(dataRowCopy, fieldDelimiter),
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
   * entities. Each result row has data about a single entity and single variable
   * observation
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
    pointApiResponse.facets = this.overrideFacetValues(
      pointApiResponse.facets,
      this.facetOverride
    );
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
    const validPerCapitaVariables = _.intersection(
      params.perCapitaVariables,
      params.variables
    );
    const populationPropValues = !_.isEmpty(params.perCapitaVariables)
      ? await this.getNodePropValues(
          [TOTAL_POPULATION_VARIABLE],
          DEFAULT_VARIABLE_PROPS
        )
      : ({} as NodePropValues);

    const denoms = validPerCapitaVariables;
    let denomsByFacet: Record<string, SeriesApiResponse | null> = {};
    let defaultDenomData: SeriesApiResponse | null = null;
    if (!_.isEmpty(denoms)) {
      [denomsByFacet, defaultDenomData] = await this.getDenomData(
        denoms,
        pointApiResponse.facets,
        params
      );
    }
    const rows = this.getDataRowsFromPointObservations(
      entityDcids,
      params.variables,
      pointApiResponse,
      entityPropValues,
      variablePropValues,
      populationPropValues,
      denomsByFacet,
      defaultDenomData
    );
    return Promise.resolve(rows);
  }

  /**
   * Fetches most recent data commons variable observation(s) about an entity or
   * entities. Each result row has data about a single entity and all requested
   * variable observations
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns List of data rows grouped by entity
   */
  async getDataRowsGroupedByEntity(
    params: GetDataRowsParams
  ): Promise<EntityGroupedDataRow[]> {
    // Fetch data rows with one entity and variable observation per row
    const dataRows = await this.getDataRows(params);

    // Group rows by entity dcid
    const dataRowsGroupedByEntityDcid = _.groupBy(
      dataRows,
      (r) => r.entity.dcid
    );

    // Fetch variable property values. Used to fill in properties for entities
    // that do not have an observation for the particular variable.
    // TODO: make this more efficient as these variable properties were already
    // fetched once in getDataRows
    const variablePropValues = await this.getNodePropValues(
      params.variables,
      params.variableProps || DEFAULT_VARIABLE_PROPS
    );

    // Combine grouped rows into `EntityGroupedDataRow`s
    const entityGroupedDataRows: EntityGroupedDataRow[] = [];
    Object.keys(dataRowsGroupedByEntityDcid).forEach((entityDcid) => {
      const variablesSet = new Set(params.variables);
      const dataRowsForEntity = dataRowsGroupedByEntityDcid[entityDcid];
      if (dataRowsForEntity.length === 0) {
        return;
      }
      const entityGroupedDataRow: EntityGroupedDataRow = {
        entity: dataRowsForEntity[0].entity,
        variables: {},
      };
      dataRowsForEntity.forEach((dataRow) => {
        variablesSet.delete(dataRow.variable.dcid);
        entityGroupedDataRow.variables[dataRow.variable.dcid] =
          dataRow.variable;
      });
      // Add empty variable entries if this entity had no applicable values
      variablesSet.forEach((variableDcid) => {
        entityGroupedDataRow.variables[variableDcid] = {
          dcid: variableDcid,
          observation: {
            date: null,
            metadata: {},
            value: null,
          },
          properties: {
            name: "",
          },
        };
        // Fill in variable property values
        Object.keys(variablePropValues).forEach((propName) => {
          entityGroupedDataRow.variables[variableDcid].properties[propName] =
            variablePropValues[propName][variableDcid];
        });
      });
      entityGroupedDataRows.push(entityGroupedDataRow);
    });
    return entityGroupedDataRows;
  }

  /**
   * Fetches all Data Commons variable observation about an entity or entities
   * as CSV. Each result row has data about a single entity and single variable
   * observation.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns CSV string
   */
  async getCsvSeries(params: GetCsvSeriesParams): Promise<string> {
    const dataRows = await this.getDataRowSeries(params);
    return dataRowsToCsv(
      dataRows,
      params.fieldDelimiter,
      params.transformHeader
    );
  }

  private async getDenomData(
    denoms: string[],
    apiResponseFacets: FacetStore,
    params: GetDataRowSeriesParams
  ): Promise<
    [Record<string, SeriesApiResponse | null>, SeriesApiResponse | null]
  > {
    let denomsByFacet: Record<string, SeriesApiResponse | null> = {};
    let defaultDenomData: SeriesApiResponse | null = null;
    const facetIds =
      !_.isEmpty(denoms) && apiResponseFacets
        ? Object.keys(apiResponseFacets)
        : [];

    for (const facetId of facetIds) {
      denomsByFacet[facetId] =
        "parentEntity" in params
          ? await this.webClient.getObservationsSeriesWithin({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
              facetIds: [facetId],
            })
          : await this.webClient.getObservationsSeries({
              ...params,
              variables: [TOTAL_POPULATION_VARIABLE],
              facetIds: [facetId],
            });
    }

    // default denom data with no facet filter
    defaultDenomData =
      "parentEntity" in params
        ? await this.webClient.getObservationsSeriesWithin({
            ...params,
            variables: [TOTAL_POPULATION_VARIABLE],
          })
        : await this.webClient.getObservationsSeries({
            ...params,
            variables: [TOTAL_POPULATION_VARIABLE],
          });

    return [denomsByFacet, defaultDenomData];
  }

  /**
   * Fetches data commons observation series about an entity or entities. Each
   * result row has data about a single entity and single variable observation.
   *
   * @param params {GetDataRowsParams} Entities and variables to fetch data for
   * @returns Data rows list
   */
  async getDataRowSeries(params: GetDataRowSeriesParams): Promise<DataRow[]> {
    // Fetch variable observations
    const seriesApiResponse =
      "parentEntity" in params
        ? await this.webClient.getObservationsSeriesWithin(params)
        : await this.webClient.getObservationsSeries(params);
    if (!seriesApiResponse) {
      return [];
    }

    seriesApiResponse.facets = this.overrideFacetValues(
      seriesApiResponse.facets,
      this.facetOverride
    );
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
    const validPerCapitaVariables = _.intersection(
      params.perCapitaVariables,
      params.variables
    );
    const populationPropValues = !_.isEmpty(params.perCapitaVariables)
      ? await this.getNodePropValues(
          [TOTAL_POPULATION_VARIABLE],
          DEFAULT_VARIABLE_PROPS
        )
      : ({} as NodePropValues);

    // Fetch population data for per capita calculations
    const denoms = validPerCapitaVariables;
    let denomsByFacet: Record<string, SeriesApiResponse | null> = {};
    let defaultDenomData: SeriesApiResponse | null = null;
    if (!_.isEmpty(denoms)) {
      [denomsByFacet, defaultDenomData] = await this.getDenomData(
        denoms,
        seriesApiResponse.facets,
        params
      );
    }
    const dataRows = this.getDataRowsFromSeriesObservations(
      entityDcids,
      params.variables,
      seriesApiResponse,
      entityPropValues,
      variablePropValues,
      populationPropValues,
      denomsByFacet,
      defaultDenomData
    );

    // Filter by start/end date if specified
    if (params.startDate || params.endDate) {
      return Promise.resolve(
        dataRows.filter((dataRow) => {
          const observationDate = dataRow.variable.observation.date;
          if (!observationDate) {
            return false;
          }
          return isDateInRange(
            observationDate,
            params.startDate,
            params.endDate
          );
        })
      );
    }

    return Promise.resolve(dataRows);
  }

  /**
   * Overrides facet from a series or point API response's FacetStore
   * object with values from facetOverride. Overrides values in FacetStore based
   * on the facet / StatMetadata unit.
   *
   * @param facets Facets for an api response keyed by facet ID
   * @param facetOverride Facets to override keyed by facet unit
   * @returns facets with overridden values
   */
  overrideFacetValues(
    facets: FacetStore,
    facetOverride: FacetOverride | undefined
  ): FacetStore {
    if (_.isEmpty(facetOverride)) {
      return facets;
    }
    const newFacets = {
      ...facets,
    };
    Object.keys(newFacets).forEach((facetId) => {
      const facet = newFacets[facetId];
      if (facet.unit && facet.unit in this.facetOverride) {
        newFacets[facetId] = {
          ...facet,
          ...this.facetOverride[facet.unit],
        };
      }
    });
    return newFacets;
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
    const nodePropvals = await this.webClient.getNodePropvalsOut(params);
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
  ): Observation {
    // If no target date is passed in, return the most recent observation
    if (!targetDate) {
      return observations[observations.length - 1];
    }
    const index = _.sortedIndexBy(
      observations,
      { value: 0, date: targetDate },
      (o) => o.date
    );
    // sortedIndexBy can return i === arr.length, meaning the target date is
    // closest to the last observation
    if (index >= observations.length) {
      return observations[observations.length - 1];
    }
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
   * Gets information needed to calculate per capita for a single stat data point.
   * Uses the denom value with the closest date to the mainStatDate and returns
   * null if no matching value is found or matching value is 0. If available, uses
   * the denom value that comes from the same facet as the data point. Otherwise, the best
   * general denom option is used.
   * @param svSpec the stat var spec of the data point to calculate per capita for
   * @param denomData map facet ID -> population data. If the facet used in the stat var spec
   * has denominator data, we use information from that facet.
   * @param placeDcid place of the data point
   * @param mainStatDate date of the data point
   * @param facetUsed facet used for the data point
   * @param defaultDenomData If there isn't denominator data available for the facet used in
   * svSpec, we use the default data that is fetched with no particular facet
   */

  // --> Need the series for this particular entity, and the facet ID it comes from
  // then we do this if that denom info exists
  private getDenomSeries(
    denomVar: string,
    denomsByFacet: Record<string, SeriesApiResponse | null>,
    defaultDenomData: SeriesApiResponse | null,
    placeDcid: string,
    numeratorFacet?: string
  ): [Series | null, StatMetadata | null] {
    let matchingDenomData: SeriesApiResponse | null = null;
    let placeDenomData: Series | undefined | null = null;
    let facetUsed: StatMetadata | null = null;

    // find the matching denominator data if it exists, for the facet used in the numerator
    if (numeratorFacet) {
      matchingDenomData = denomsByFacet?.[numeratorFacet];
      placeDenomData = matchingDenomData?.data?.[denomVar]?.[placeDcid];

      // getting the facet metadata for the facet we're using
      facetUsed = _.get(
        denomsByFacet?.[numeratorFacet]?.facets,
        numeratorFacet || "",
        {} as StatMetadata
      );
    }

    if (!placeDenomData || _.isEmpty(placeDenomData.series)) {
      matchingDenomData = defaultDenomData;
      placeDenomData = matchingDenomData?.data?.[denomVar]?.[placeDcid];
      facetUsed = placeDenomData
        ? _.get(
            defaultDenomData?.facets,
            placeDenomData.facet || "",
            {} as StatMetadata
          )
        : null;
    }

    placeDenomData = placeDenomData ?? null;

    return [placeDenomData, facetUsed];
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
    populationPropValues: NodePropValues,
    denomsByFacet: Record<string, SeriesApiResponse | null>,
    defaultDenomData: SeriesApiResponse | null
  ): DataRow[] {
    const dataRows: DataRow[] = [];
    entityDcids.forEach((entityDcid) => {
      variableDcids.forEach((variableDcid) => {
        const observation =
          pointApiResponse.data[variableDcid][entityDcid] || {};
        if (_.isEmpty(observation)) {
          return;
        }
        const facet = _.get(
          pointApiResponse.facets,
          observation.facet || "",
          {} as StatMetadata
        );
        const row: DataRow = this.buildDataRow(
          entityDcid,
          entityPropValues,
          variableDcid,
          variablePropValues,
          observation,
          facet
        );
        // Set per-capita data
        const [series, populationFacet] = this.getDenomSeries(
          TOTAL_POPULATION_VARIABLE,
          denomsByFacet,
          defaultDenomData,
          entityDcid,
          observation.facet
        );
        // if we have denom data
        if (series && populationFacet) {
          const closestPopulationObservation = this.getClosestObservationToDate(
            series.series,
            observation.date
          );
          const scalingFactor = facet.scalingFactor || 1;
          const quotientValue =
            !_.isEmpty(closestPopulationObservation) &&
            closestPopulationObservation?.value > 0
              ? observation.value /
                closestPopulationObservation?.value /
                scalingFactor
              : 0;
          const perCapitaQuotientObservation: PerCapitaObservation = {
            ...closestPopulationObservation,
            perCapitaValue: quotientValue,
          };
          row.variable.perCapita = this.buildDataRowPerCapitaVariable(
            perCapitaQuotientObservation,
            populationPropValues,
            populationFacet
          );
        }
        dataRows.push(row);
      });
    });
    return dataRows;
  }

  /**
   * Build DataRow per capita variable object from a PerCapitaObservation and
   * its associated properties
   * @param perCapitaObservation Per capita and population observation
   * @param perCapitaVariablePropValues per capita population variable property
   *        values
   * @param perCapitaFacet facet for per capita population observation
   * @returns data row per capita variable
   */
  private buildDataRowPerCapitaVariable(
    perCapitaObservation: PerCapitaObservation,
    perCapitaVariablePropValues: NodePropValues,
    perCapitaFacet: StatMetadata
  ): DataRowPerCapitaVariable {
    return {
      dcid: TOTAL_POPULATION_VARIABLE,
      properties: {
        name:
          perCapitaVariablePropValues[NAME_ATTRIBUTE][
            TOTAL_POPULATION_VARIABLE
          ] || "",
      },
      observation: {
        date: perCapitaObservation.date,
        value: perCapitaObservation.value,
        metadata: {
          importName: _.get(perCapitaFacet, "importName", null),
          scalingFactor: _.get(perCapitaFacet, "scalingFactor", null),
          provenanceUrl: _.get(perCapitaFacet, "provenanceUrl", null),
          unit: _.get(perCapitaFacet, "unit", null),
          unitDisplayName: _.get(
            perCapitaObservation,
            "unitDisplayName",
            _.get(perCapitaFacet, "unitDisplayName", null)
          ),
        },
      },
      perCapitaValue: perCapitaObservation.perCapitaValue,
    };
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
    populationPropValues: NodePropValues,
    denomsByFacet: Record<string, SeriesApiResponse | null>,
    defaultDenomData: SeriesApiResponse | null
  ): DataRow[] {
    const dataRows: DataRow[] = [];
    entityDcids.forEach((entityDcid) => {
      variableDcids.forEach((variableDcid) => {
        const series = seriesApiResponse.data[variableDcid][entityDcid] || {};
        if (_.isEmpty(series)) {
          return;
        }
        const facet = _.get(
          seriesApiResponse.facets,
          series.facet || "",
          {} as StatMetadata
        );
        let perCapitaObservations: PerCapitaObservation[] = [];
        // Set per-capita data
        const [populationSeries, populationFacet] = this.getDenomSeries(
          TOTAL_POPULATION_VARIABLE,
          denomsByFacet,
          defaultDenomData,
          entityDcid,
          series.facet
        );
        if (populationSeries && populationFacet) {
          perCapitaObservations = computePerCapitaRatio(
            series.series,
            populationSeries.series,
            facet.scalingFactor || 1
          );
        }
        // if we have denom data
        series.series.forEach((observation, observationIndex) => {
          const row: DataRow = this.buildDataRow(
            entityDcid,
            entityPropValues,
            variableDcid,
            variablePropValues,
            observation,
            facet
          );
          // Set per-capita data
          if (
            perCapitaObservations &&
            populationFacet &&
            perCapitaObservations.length === series.series.length
          ) {
            // perCapitaObservations is a parallel array with the data series
            const perCapitaObservation =
              perCapitaObservations[observationIndex];
            row.variable.perCapita = this.buildDataRowPerCapitaVariable(
              perCapitaObservation,
              populationPropValues,
              populationFacet
            );
          }
          dataRows.push(row);
        });
      });
    });
    return dataRows;
  }

  /**
   * Helper for building a DataRow from entity, variable, and observation
   * building blocks.
   * @param entityDcid Entity DCID
   * @param entityPropValues Entity property values
   * @param variableDcid Variable DCID
   * @param variablePropValues Variable property values
   * @param observation Variable observation
   * @param facet Observation facet metadata
   * @returns data row
   */
  private buildDataRow(
    entityDcid: string,
    entityPropValues: NodePropValues,
    variableDcid: string,
    variablePropValues: NodePropValues,
    observation: Observation,
    facet: StatMetadata
  ): DataRow {
    const row: DataRow = {
      entity: {
        dcid: entityDcid,
        properties: {
          name: _.get(
            _.get(entityPropValues, NAME_ATTRIBUTE, {}),
            entityDcid,
            ""
          ),
        },
      },
      variable: {
        dcid: variableDcid,
        properties: {
          name: _.get(
            _.get(variablePropValues, NAME_ATTRIBUTE, {}),
            variableDcid,
            ""
          ),
        },
        observation: {
          date: observation.date,
          metadata: {
            importName: _.get(facet, "importName", null),
            provenanceUrl: _.get(facet, "provenanceUrl", null),
            scalingFactor: _.get(facet, "scalingFactor", null),
            unit: _.get(facet, "unit", null),
            unitDisplayName: _.get(
              observation,
              "unitDisplayName",
              _.get(facet, "unitDisplayName", null)
            ),
          },
          value: observation.value,
        },
      },
    };
    Object.keys(entityPropValues).forEach((entityProp) => {
      row.entity.properties[entityProp] =
        entityPropValues[entityProp][entityDcid];
    });
    Object.keys(variablePropValues).forEach((variableProp) => {
      row.variable.properties[variableProp] =
        variablePropValues[variableProp][variableDcid];
    });
    return row;
  }
}
export { DataCommonsClient };
