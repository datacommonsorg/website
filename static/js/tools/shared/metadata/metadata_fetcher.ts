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
  StatVarMetadata,
  StatVarProvenanceSummaries,
} from "./metadata";

/**
 * This module contains helper functions for fetching and processing metadata.
 */

// TODO(gmechali): Splitting up this function into smaller ones might be helpful for maintainability.

function getFacetInfo(
  statVarDcid: string,
  facetId: string,
  facets: FacetResponse | Record<string, StatMetadata>
): StatMetadata | undefined {
  return facets[statVarDcid]?.[facetId] || facets[facetId];
}
/**
 * Fetch metadata from a given URL.
 * @param url - The URL to fetch metadata from.
 * @returns A promise that resolves to the fetched metadata.
 */
/* eslint-disable complexity */
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
  const statVarList: NamedNode[] = [];
  try {
    const statVars = [...statVarSet];
    if (statVars.length === 0) {
      return { metadata: {}, statVarList: [] };
    }

    /*
       1. We retrieve the full stat var names from the DCIDs
       */
    const responseObj = await dataCommonsClient.getFirstNodeValues({
      dcids: statVars,
      prop: "name",
    });
    for (const dcid in responseObj) {
      statVarList.push({ dcid, name: responseObj[dcid] });
    }
    statVarList.sort((a, b) => (a.name > b.name ? 1 : -1));

    /*
      2.  We get the stat var categories (e.g., "Demographics").
          This is a two-step process: first we look up the path to the variable
          group. We then look up the group itself to get the "absoluteName", which
          is the readable name of the category.
       */

    // 1 a. get the category paths
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

    // 1 b. from those paths, get the absolute names
    const categoryInfoMap: Record<string, string> = {};
    const categoryPromises = Array.from(categoryPaths).map(
      async (categoryPath) => {
        const response = await fetch(
          `${apiRoot || ""}/api/variable-group/info`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              dcid: categoryPath,
              entities: [],
              numEntitiesExistence: 0,
            }),
          }
        );
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

    /*
        3.  We now pull the full stat var information for each stat var. The
            results contain a lookup for each stat var of the sources, and under
            that, information we need about the stat var-source combo
       */
    const dcidsParam = statVars.map((id) => `dcids=${id}`).join("&");
    const variableResponse = await fetch(
      `${apiRoot || ""}/api/variable/info?${dcidsParam}`
    );
    const variableData: Record<string, StatVarProvenanceSummaries> =
      await variableResponse.json();

    const provenances = new Set<string>();
    const measurementMethods = new Set<string>();

    statVars.forEach((statVarId) => {
      const facetIdSet = statVarToFacets?.[statVarId] || new Set<string>();

      facetIdSet.forEach((facetId) => {
        const facetInfo = getFacetInfo(statVarId, facetId, facets);

        if (facetInfo?.importName) {
          const provenanceFullPath = `dc/base/${facetInfo.importName}`;
          provenances.add(provenanceFullPath);

          const summary =
            variableData[statVarId]?.provenanceSummary?.[provenanceFullPath]
              ?.seriesSummary;
          const measurementMethod = summary?.[0]?.seriesKey?.measurementMethod;
          if (measurementMethod) measurementMethods.add(measurementMethod);
        }
      });
    });

    /*
        4.  We now look up the base information about each source (provenance).
            This gives us some of the core information we need about the source itself.
       */
    const provenanceMap: Record<string, Provenance> = {};
    const provenancePromises = Array.from(provenances).map((provenanceId) =>
      fetch(`${apiRoot || ""}/api/node/triples/out/${provenanceId}`)
        .then((response) => response.json())
        .then((data) => {
          provenanceMap[provenanceId] = data;
        })
    );
    await Promise.all(provenancePromises);

    /*
        5.  We now look up some attributes of required fields for which we have only the dcid.
            Currently, this is the description of the measurement method.
       */
    let measurementMethodMap: Record<string, string> = {};
    if (measurementMethods.size) {
      measurementMethodMap = await dataCommonsClient.getFirstNodeValues({
        dcids: Array.from(measurementMethods),
        prop: "description",
      });
    }

    const metadata: Record<string, StatVarMetadata[]> = {};

    /*
        With all the data collected together above, we collate it into a final
        data structure that we send into the metadata content for actual display.
       */
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

        let unit: string | undefined;
        let releaseFrequency: string | undefined;
        let observationPeriod: string | undefined;
        let dateRangeStart: string | undefined;
        let dateRangeEnd: string | undefined;
        let measurementMethod: string | undefined;
        let measurementMethodDescription: string | undefined;

        if (variableData[statVarId]?.provenanceSummary) {
          const source =
            variableData[statVarId].provenanceSummary?.[provenanceId];
          if (source) {
            releaseFrequency = source.releaseFrequency;

            /*
                  We look up the series key that matches the attributes
                  associated with the facets.
                 */
            const matchedSeries = source.seriesSummary?.find((series) => {
              const key = series.seriesKey ?? {};
              return (
                (facetInfo.measurementMethod == null ||
                  key.measurementMethod === facetInfo.measurementMethod) &&
                (facetInfo.observationPeriod == null ||
                  key.observationPeriod === facetInfo.observationPeriod) &&
                (facetInfo.unit == null || key.unit === facetInfo.unit) &&
                (facetInfo.scalingFactor == null ||
                  key.scalingFactor === facetInfo.scalingFactor)
              );
            });

            if (matchedSeries) {
              dateRangeStart = matchedSeries.earliestDate;
              dateRangeEnd = matchedSeries.latestDate;

              const key = matchedSeries.seriesKey ?? {};
              unit = key.unit;
              observationPeriod = key.observationPeriod;
              measurementMethod = key.measurementMethod;

              if (measurementMethod) {
                measurementMethodDescription =
                  measurementMethodMap[measurementMethod] || measurementMethod;
              }
            }
          }
        }

        metadata[statVarId].push({
          statVarId,
          statVarName: responseObj[statVarId] || statVarId,
          categories: statVarCategoryMap[statVarId],
          sourceName: provenanceData?.source?.[0]?.name,
          provenanceUrl: provenanceData?.url?.[0]?.value,
          provenanceName:
            provenanceData?.isPartOf?.[0]?.name ||
            provenanceData?.name?.[0]?.value ||
            importName,
          dateRangeStart,
          dateRangeEnd,
          unit,
          observationPeriod,
          periodicity: releaseFrequency,
          license: provenanceData?.licenseType?.[0]?.name,
          licenseDcid: provenanceData?.licenseType?.[0]?.dcid,
          measurementMethod,
          measurementMethodDescription,
        });
      }
    }

    return { metadata, statVarList };
  } catch (error) {
    console.error("Error fetching metadata:", error);
  }
}
