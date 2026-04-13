/**
 * Copyright 2026 Google LLC
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

import { useCallback, useEffect, useMemo, useState } from "react";

import { FacetSelectorFacetInfo } from "../facet_selector/facet_selector";

export interface FacetEnrichmentResult {
  /**
   * The list of facets, falling back to base facets if not yet enriched.
   */
  facetList: FacetSelectorFacetInfo[] | null;
  /**
   * Whether the enrichment fetch is currently in progress.
   */
  loading: boolean;
  /**
   * Callback to trigger the enrichment fetch, typically called when the facet selector modal opens.
   */
  onModalOpen: () => void;
  /**
   * The total number of available facets
   */
  totalFacetCount: number;
}

/**
 * A hook to manage enrichment of facet metadata.
 * It caches the result and resets when the key changes.
 *
 * @param facetListCacheKey A unique string representing the state that facets depend on.
 *                          When this key changes, the cached enriched facets are cleared.
 * @param fetchFn Function that triggers the enrichment call.
 */
export function useFacetEnrichment(
  facetListCacheKey: string,
  baseFacets: FacetSelectorFacetInfo[] | null,
  fetchFn: () => Promise<FacetSelectorFacetInfo[]>
): FacetEnrichmentResult {
  const [enrichedFacetList, setEnrichedFacetList] = useState<
    FacetSelectorFacetInfo[] | null
  >(null);
  const [loading, setLoading] = useState(false);

  // Automatically clear cache if key changes
  useEffect(() => {
    setEnrichedFacetList(null);
  }, [facetListCacheKey]);

  const onModalOpen = useCallback(async () => {
    if (enrichedFacetList || loading) {
      // if we have already fetched or are currently fetching, don't fetch again
      return;
    }
    setLoading(true);
    try {
      const data = await fetchFn();
      setEnrichedFacetList(data);
    } catch (e) {
      console.error("Failed to enrich facets", e);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, enrichedFacetList, loading]);

  const totalFacetCount = useMemo(() => {
    if (!baseFacets) return 0;
    const uniqueFacetIds = new Set<string>();
    baseFacets.forEach((facetInfo) => {
      Object.keys(facetInfo.metadataMap).forEach((facetId) => {
        if (facetId !== "") {
          uniqueFacetIds.add(facetId);
        }
      });
    });
    return uniqueFacetIds.size;
  }, [baseFacets]);

  const facetList = enrichedFacetList || baseFacets;

  return { facetList, loading, onModalOpen, totalFacetCount };
}
