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

import { SURFACE_HEADER_NAME } from "../../../shared/constants";
import { StatMetadata } from "../../../shared/stat_types";
import { NamedNode, StatVarFacetMap } from "../../../shared/types";
import { FacetResponse } from "../../../utils/data_fetch_utils";
import { StatVarMetadata } from "./metadata";

/**
 * This module contains helper functions for fetching and processing metadata.
 */

/**
 * Retrieves the full stat var names from the DCIDs
 *
 * @param statVars - Array of stat var DCIDs
 * @param dataCommonsClient - Client for Data Commons API calls
 * @returns Promise of an array of named nodes sorted by name
 */
export async function fetchStatVarNames(
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
 * Fetches and enriches facet metadata with human-readable and supplementary
 * information like source names, date ranges, and descriptions.
 * @param facets The basic facet response from an API call like getFacets.
 * @param entityContext The specific entities or expression used to determine dates.
 * @param apiRoot Optional API root URL for requests.
 * @returns The facets with enriched StatMetadata.
 */
export async function fetchFacetsWithMetadata(
  facets: FacetResponse,
  entityContext: {
    entities?: string[];
    parentPlace?: string;
    enclosedPlaceType?: string;
  },
  apiRoot = "",
  surface?: string
): Promise<FacetResponse> {
  const statVars = Object.keys(facets);
  if (!statVars.length) return facets;

  try {
    const headers = { "Content-Type": "application/json" };
    if (surface) {
      headers[SURFACE_HEADER_NAME] = surface;
    }

    const response = await fetch(`${apiRoot}/api/metadata/facets`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        facets,
        statVars,
        entities: entityContext.entities,
        parentPlace: entityContext.parentPlace,
        enclosedPlaceType: entityContext.enclosedPlaceType,
      }),
    });
    if (!response.ok) {
      console.error("Failed to enrich facets via API");
      return facets;
    }
    return await response.json();
  } catch (e) {
    console.error("Error enriching facets:", e);
    return facets;
  }
}

/**
 * Function to fetch comprehensive metadata for a list of entities and stat vars.
 *
 * @param entities - Array of entity DCIDs to fetch metadata for
 * @param statVarSet - Set of stat var DCIDs to fetch metadata for
 * @param statVarToFacets - Optional mapping of stat vars to their facets
 * @param apiRoot - Optional API root URL for requests
 * @param facets - Optional map of the facet id to StatMetadata
 * @returns Promise resolving to an object containing two attributes, metadata and statVarList.
 *          The metadata attribute is a mapping of stat var ids to metadata.
 *          The statVarList is list of stat var nodes containing full names.
 */
export async function fetchMetadata(
  entities: string[],
  statVarSet: Set<string>,
  statVarToFacets?: StatVarFacetMap,
  apiRoot?: string,
  facets?: Record<string, StatMetadata>,
  surface?: string
): Promise<{
  metadata: Record<string, StatVarMetadata[]>;
  statVarList: NamedNode[];
}> {
  const statVars = [...statVarSet];
  if (!statVars.length) return { metadata: {}, statVarList: [] };

  const convertedStatVarToFacets: Record<string, string[]> = {};
  if (statVarToFacets) {
    for (const [sv, facetSet] of Object.entries(statVarToFacets)) {
      convertedStatVarToFacets[sv] = Array.isArray(facetSet)
        ? facetSet
        : Array.from(facetSet);
    }
  }

  const headers = { "Content-Type": "application/json" };
  if (surface) {
    headers[SURFACE_HEADER_NAME] = surface;
  }

  const response = await fetch(`${apiRoot || ""}/api/metadata`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      entities,
      statVars,
      statVarToFacets: convertedStatVarToFacets,
      facets: facets ? Object.keys(facets) : undefined,
    }),
  });

  if (!response.ok) {
    console.error("Failed to fetch metadata", await response.text());
    return { metadata: {}, statVarList: [] };
  }

  return response.json();
}
