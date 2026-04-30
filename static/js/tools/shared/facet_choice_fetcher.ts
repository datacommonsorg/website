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
 * File to contain helper functions for fetching facet choices for UI components.
 */

import { WEBSITE_SURFACE } from "../../shared/constants";
import { FacetSelectorFacetInfo } from "../../shared/facet_selector/facet_selector";
import {
  FacetResponse,
  getFacets,
  getFacetsWithin,
} from "../../utils/data_fetch_utils";
import { fetchFacetsWithMetadata } from "./metadata/metadata_fetcher";

/**
 * This module contains helper functions for fetching facet choices that are
 * suitable for use in UI components like FacetSelector.
 */

/**
 * Fetches base facet choices for charts that do not have an enclosed
 * place type.  This includes chart types such as line and highlight.
 *
 * @param placeDcids - Array of place DCIDs to fetch facets for
 * @param statVars - Array of stat vars
 * @returns Promise of an array of facet info objects for FacetSelector
 */
export async function fetchFacetChoices(
  placeDcids: string[],
  statVars: { dcid: string; name?: string }[]
): Promise<FacetSelectorFacetInfo[]> {
  const baseFacets = await getFacets(
    "",
    placeDcids,
    statVars.map((sv) => sv.dcid),
    WEBSITE_SURFACE
  );
  return statVars.map((sv) => ({
    dcid: sv.dcid,
    name: sv.name || sv.dcid,
    metadataMap: baseFacets[sv.dcid] || {},
  }));
}

/**
 * Fetches base facet choices for charts that have an enclosed
 * place type. This includes chart types such as scatter.
 *
 * @param parentPlace - The DCID of the parent place (e.g., a state or country)
 * @param enclosedPlaceType - The type of enclosed places to consider (e.g., county)
 * @param statVars - Array of stat vars
 * @returns Promise of an array of facet info objects for FacetSelector
 */
export async function fetchFacetChoicesWithin(
  parentPlace: string,
  enclosedPlaceType: string,
  statVars: { dcid: string; name?: string; date?: string }[]
): Promise<FacetSelectorFacetInfo[]> {
  const facetPromises = statVars.map((sv) =>
    getFacetsWithin(
      "",
      parentPlace,
      enclosedPlaceType,
      [sv.dcid],
      sv.date,
      WEBSITE_SURFACE
    )
  );
  const baseFacets = Object.assign({}, ...(await Promise.all(facetPromises)));

  return statVars.map((sv) => ({
    dcid: sv.dcid,
    name: sv.name || sv.dcid,
    metadataMap: baseFacets[sv.dcid] || {},
  }));
}

/**
 * Enriches a list of facet choices with metadata.
 *
 * @param facetList - The list of facets to enrich
 * @param options - Options for enrichment (entities or parentPlace/enclosedPlaceType)
 * @returns Promise of an array of enriched facet info objects
 */
export async function enrichFacetChoices(
  facetList: FacetSelectorFacetInfo[],
  options: {
    entities?: string[];
    parentPlace?: string;
    enclosedPlaceType?: string;
  }
): Promise<FacetSelectorFacetInfo[]> {
  const baseFacets: FacetResponse = {};
  facetList.forEach((f) => {
    baseFacets[f.dcid] = f.metadataMap;
  });

  const enriched = await fetchFacetsWithMetadata(baseFacets, options);

  return facetList.map((f) => ({
    ...f,
    metadataMap: enriched[f.dcid] || {},
  }));
}
