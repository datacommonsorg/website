/**
 * Copyright 2025 Google LLC
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
 * File to contain helper functions related to fetching metadata.
 */

import { DataCommonsClient } from "@datacommonsorg/client";

import { StatMetadata } from "../../../shared/stat_types";
import { NamedNode, StatVarFacetMap } from "../../../shared/types";
import { FacetResponse } from "../../../utils/data_fetch_utils";
import {
  Provenance,
  SeriesSummary,
  StatVarMetadata,
  StatVarProvenanceSummaries,
} from "./metadata";

/**
 * This module contains helper functions for fetching and processing metadata.
 */

/*
  TODO (nick-next): provide options on degree of metadata returned, in order
      to accommodate requests such as those for just enough information
      to build citations.
 */

/**
 * Retrieves facet information for a given stat variable and facet ID.
 *
 * @param statVarDcid - The DCID of the stat var
 * @param facetId - The identifier of the facet to retrieve
 * @param facets - A map of the facet id to StatMetadata
 * @returns The facet metadata if found, otherwise undefined
 */
function getFacetInfo(
  statVarDcid: string,
  facetId: string,
  facets: FacetResponse | Record<string, StatMetadata>
): StatMetadata | undefined {
  return facets[statVarDcid]?.[facetId] || facets[facetId];
}

/**
 * Determines if a series summary matches the criteria defined in a facet.
 * Compares measurement method, observation period, unit, and scaling factor.
 *
 * This function is run on series entries from a list of series summaries
 * that have already been limited to a particular import id. Because of
 * that, it determines whether there is a match based only the series key
 * which only can contain the attributes above (that vary within a
 * provenance).
 *
 * @param series - The series summary whose key will be checked for a match
 * @param facet - The facet whose attributes will be checked against the key
 * @returns true if the series key matches the facet criteria, otherwise false
 */
function seriesFacetMatch(series: SeriesSummary, facet: StatMetadata): boolean {
  const key = series.seriesKey ?? {};
  return (
    (facet.measurementMethod == null ||
      key.measurementMethod === facet.measurementMethod) &&
    (facet.observationPeriod == null ||
      key.observationPeriod === facet.observationPeriod) &&
    (facet.unit == null || key.unit === facet.unit) &&
    (facet.scalingFactor == null || key.scalingFactor === facet.scalingFactor)
  );
}

/**
 * Finds the first series in a list that matches the given facet criteria.
 *
 * @param seriesList - Array of series summaries
 * @param facet - The facet information containing match criteria
 * @returns The matching series if found, otherwise undefined
 */
function matchSeriesByFacet(
  seriesList: SeriesSummary[] | undefined,
  facet: StatMetadata
): SeriesSummary | undefined {
  return seriesList?.find((series) => seriesFacetMatch(series, facet));
}

/**
 * Retrieves the full stat var names from the DCIDs
 *
 * @param statVars - Array of stat var DCIDs
 * @param dataCommonsClient - Client for Data Commons API calls
 * @returns Promise of an array of named nodes sorted by name
 */
async function fetchStatVarNames(
  statVars: string[],
  dataCommonsClient: DataCommonsClient
): Promise<NamedNode[]> {
  if (!statVars.length) {
    return [];
  }

  const statVarList: NamedNode[] = [];

  const responseObj = await dataCommonsClient.getFirstNodeValues({
    dcids: statVars,
    prop: "name",
  });
  for (const dcid in responseObj) {
    statVarList.push({ dcid, name: responseObj[dcid] });
  }

  return statVarList;
}

/**
 * Fetches the stat var categories (e.g., ["Demographics"]) corresponding
 * to the given stat vars.
 *
 * @param statVars - array of stat var DCIDs
 * @param apiRoot - Optional API root URL for requests
 * @returns Promise of a mapping of stat var DCIDs to category names
 */
async function fetchStatVarCategories(
  statVars: string[],
  apiRoot = ""
): Promise<Record<string, string[]>> {
  if (statVars.length === 0) {
    return {};
  }

  // 1. get the category paths
  const categoryPathPromises = statVars.map((statVarId) =>
    fetch(`${apiRoot || ""}/api/variable/path?dcid=${statVarId}`).then(
      (response) => response.json()
    )
  );
  const categoryPathResults = await Promise.all(categoryPathPromises);

  const categoryPaths = new Set<string>();
  statVars.forEach((_, index) => {
    const categories: string[] = categoryPathResults[index]?.slice(1) ?? [];
    const lastDcid = categories[categories.length - 1];
    if (lastDcid) categoryPaths.add(lastDcid);
  });

  // 2. from those paths, get the absolute names
  const categoryInfoMap: Record<string, string> = {};
  const categoryPromises = Array.from(categoryPaths).map(
    async (categoryPath) => {
      const response = await fetch(`${apiRoot || ""}/api/variable-group/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dcid: categoryPath,
          entities: [],
          numEntitiesExistence: 0,
        }),
      });
      const data = await response.json();
      categoryInfoMap[categoryPath] =
        data.absoluteName || categoryPath.split("/").pop();
    }
  );
  await Promise.all(categoryPromises);

  const statVarCategoryMap: Record<string, string[]> = {};
  statVars.forEach((statVarId, index) => {
    const categories: string[] = categoryPathResults[index]?.slice(1) ?? [];
    const lastDcid = categories[categories.length - 1];
    const topic = lastDcid && categoryInfoMap[lastDcid];
    statVarCategoryMap[statVarId] = topic ? [topic] : [];
  });

  return statVarCategoryMap;
}

/**
 * Fetches the provenance summaries (including keys)
 * from the given list of stat vars
 *
 * @param statVars - array of stat var DCIDs
 * @param apiRoot - Optional API root URL for requests
 * @returns A mapping of stat var DCIDs to provenance/series summaries
 */
async function fetchStatVarProvenanceSummaries(
  statVars: string[],
  apiRoot = ""
): Promise<Record<string, StatVarProvenanceSummaries>> {
  if (!statVars.length) return {};
  const dcidsParam = statVars.map((id) => `dcids=${id}`).join("&");
  const variableResponse = await fetch(
    `${apiRoot || ""}/api/variable/info?${dcidsParam}`
  );
  return variableResponse.json();
}

/**
 * Fetches provenance information for stat vars by collecting unique import names
 * from facets and making API calls to retrieve provenance data.
 *
 * @param statVars - array of stat var DCIDs
 * @param facets - Facet data containing import names
 * @param statVarToFacets - Optional mapping of stat vars to their facets
 * @param apiRoot - Optional API root URL for requests
 * @returns A mapping of stat var DCIDs to provenance data
 */
async function fetchProvenanceInfo(
  statVars: string[],
  facets: FacetResponse | Record<string, StatMetadata>,
  statVarToFacets: StatVarFacetMap | undefined,
  apiRoot = ""
): Promise<Record<string, Provenance>> {
  const provenanceEndpoints = new Set<string>();
  statVars.forEach((statVarId) => {
    if (statVarToFacets[statVarId]) {
      statVarToFacets[statVarId].forEach((facetId) => {
        const importName = getFacetInfo(statVarId, facetId, facets)?.importName;
        if (importName) {
          provenanceEndpoints.add(`dc/base/${importName}`);
        }
      });
    }
  });

  const provenanceMap: Record<string, Provenance> = {};
  await Promise.all(
    Array.from(provenanceEndpoints).map(async (providenceEndpoint) => {
      const response = await fetch(
        `${apiRoot}/api/node/triples/out/${providenceEndpoint}`
      );
      provenanceMap[providenceEndpoint] = await response.json();
    })
  );
  return provenanceMap;
}

/**
 * Fetches descriptions of the measurement methods from a
 * list of identifiers.
 *
 * @param measurementMethods - Set of measurement method identifiers
 * @param dataCommonsClient - Client for Data Commons API calls
 * @returns A mapping of measurement methods to descriptions
 */
async function fetchMeasurementMethodDescriptions(
  measurementMethods: Set<string>,
  dataCommonsClient: DataCommonsClient
): Promise<Record<string, string>> {
  if (!measurementMethods.size) return {};
  return dataCommonsClient.getFirstNodeValues({
    dcids: Array.from(measurementMethods),
    prop: "description",
  });
}

/**
 * Function to fetch comprehensive metadata for a list of stat vars and data.
 *
 * @param statVarSet - Set of stat var DCIDs to fetch metadata for
 * @param facets - A map of the facet id to StatMetadata
 * @param dataCommonsClient - Client for Data Commons API calls
 * @param statVarToFacets - Optional mapping of stat vars to their facets
 * @param apiRoot - Optional API root URL for requests
 * @returns An object containing two attributes, metadata and statVarList.
 *          The metadata attribute is a mapping of stat var ids to metadata.
 *          The statVarList is list of stat var nodes containing full names.
 */
export async function fetchMetadata(
  statVarSet: Set<string>,
  facets: FacetResponse | Record<string, StatMetadata>,
  dataCommonsClient: DataCommonsClient,
  statVarToFacets?: StatVarFacetMap,
  apiRoot?: string
): Promise<{
  metadata: Record<string, StatVarMetadata[]>;
  statVarList: NamedNode[];
}> {
  const statVars = [...statVarSet];
  if (!statVars.length) return { metadata: {}, statVarList: [] };

  const [statVarList, statVarCategoryMap, variableData] = await Promise.all([
    fetchStatVarNames(statVars, dataCommonsClient),
    fetchStatVarCategories(statVars, apiRoot),
    fetchStatVarProvenanceSummaries(statVars, apiRoot),
  ]);

  const provenanceMap = await fetchProvenanceInfo(
    statVars,
    facets,
    statVarToFacets,
    apiRoot
  );

  const measurementMethods = new Set<string>();
  for (const statVarId of statVars) {
    (statVarToFacets?.[statVarId] ?? new Set<string>()).forEach((facetId) => {
      const facetInfo = getFacetInfo(statVarId, facetId, facets);
      if (!facetInfo?.importName) return;

      const provId = `dc/base/${facetInfo.importName}`;
      const seriesList =
        variableData[statVarId]?.provenanceSummary?.[provId]?.seriesSummary;
      const matched = Array.isArray(seriesList)
        ? matchSeriesByFacet(seriesList, facetInfo)
        : undefined;
      const measurementMethod = matched?.seriesKey?.measurementMethod;
      if (measurementMethod) {
        measurementMethods.add(measurementMethod);
      }
    });
  }
  const measurementMethodMap = await fetchMeasurementMethodDescriptions(
    measurementMethods,
    dataCommonsClient
  );

  const metadata: Record<string, StatVarMetadata[]> = {};
  for (const statVarId of statVars) {
    const facetIdSet = statVarToFacets?.[statVarId] || new Set<string>();
    metadata[statVarId] = [];

    for (const facetId of facetIdSet) {
      const facetInfo = getFacetInfo(statVarId, facetId, facets);

      if (!facetInfo?.importName) continue;

      const importName = facetInfo.importName;
      const provenanceId = `dc/base/${importName}`;
      const provenanceData = provenanceMap[provenanceId];

      if (!provenanceData) continue;

      const seriesList =
        variableData[statVarId]?.provenanceSummary?.[provenanceId]
          ?.seriesSummary;
      const matchedSeries = Array.isArray(seriesList)
        ? matchSeriesByFacet(seriesList, facetInfo)
        : undefined;

      const key = matchedSeries?.seriesKey ?? {};

      metadata[statVarId].push({
        statVarId,
        statVarName:
          statVarList.find((node) => node.dcid === statVarId)?.name ??
          statVarId,
        categories: statVarCategoryMap[statVarId] ?? [],
        sourceName: provenanceData?.source?.[0]?.name,
        provenanceUrl: provenanceData?.url?.[0]?.value,
        provenanceName:
          provenanceData?.isPartOf?.[0]?.name ||
          provenanceData?.name?.[0]?.value ||
          importName,
        dateRangeStart: matchedSeries?.earliestDate,
        dateRangeEnd: matchedSeries?.latestDate,
        unit: key.unit,
        observationPeriod: key.observationPeriod,
        periodicity:
          variableData[statVarId]?.provenanceSummary?.[provenanceId]
            ?.releaseFrequency,
        license: provenanceData?.licenseType?.[0]?.name,
        licenseDcid: provenanceData?.licenseType?.[0]?.dcid,
        measurementMethod: key.measurementMethod,
        measurementMethodDescription:
          key.measurementMethod &&
          (measurementMethodMap[key.measurementMethod] ??
            key.measurementMethod),
      });
    }
  }

  return { metadata, statVarList };
}
