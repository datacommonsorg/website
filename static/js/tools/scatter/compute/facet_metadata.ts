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
 * Hook to compute the enriched list of facets to show in source selector.
 */

import _ from "lodash";
import { useEffect, useState } from "react";

import { getDataCommonsClient } from "../../../utils/data_commons_client";
import { FacetResponse } from "../../../utils/data_fetch_utils";
import { fetchFacetsWithMetadata } from "../../shared/metadata/metadata_fetcher";

type FacetMetadataReturn = {
  // the enriched facets (or empty on error)
  facetSelectorMetadata: FacetResponse;
  // true while metadata is loading
  facetListLoading: boolean;
  // true if the metadata fetch failed
  facetListError: boolean;
};

/**
 * This hook takes a mapping of stat vars to facets, and enriches each facet
 * with the metadata required to display the rich dataset select dialog.
 *
 * @param baseFacets A map of stat vars to facets.
 * @param surface Used in mixer usage logs. Indicates which surface (website, web components, etc) is making the call.
 * @returns An object containing the enriched facet data, loading state, and
 * error state.
 */
export function useFacetMetadata(
  baseFacets: FacetResponse | null,
  surface: string
): FacetMetadataReturn {
  const [facetMetadata, setFacetMetadata] = useState<FacetMetadataReturn>({
    facetSelectorMetadata: {},
    facetListLoading: !_.isEmpty(baseFacets),
    facetListError: false,
  });

  useEffect(() => {
    if (_.isEmpty(baseFacets)) return;

    let cancelled = false;

    const fetchMetadata = async (): Promise<void> => {
      setFacetMetadata((currentFacetMetadata) => ({
        ...currentFacetMetadata,
        facetListLoading: true,
      }));

      try {
        const resp = await fetchFacetsWithMetadata(
          baseFacets,
          getDataCommonsClient(null, surface)
        );

        if (cancelled) return;

        setFacetMetadata({
          facetSelectorMetadata: resp,
          facetListLoading: false,
          facetListError: false,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading datasets for selection.");
        setFacetMetadata({
          facetSelectorMetadata: {},
          facetListLoading: false,
          facetListError: true,
        });
      }
    };

    void fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [baseFacets]);

  return facetMetadata;
}
