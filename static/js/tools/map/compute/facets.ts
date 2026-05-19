/**
 * Copyright 2022 Google LLC
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

// Custom hook to compute the list of facets to show in source selector.

import { useCallback, useContext, useEffect, useState } from "react";

import { FacetSelectorFacetInfo } from "../../../shared/facet_selector/facet_selector";
import { useFacetEnrichment } from "../../../shared/hooks/use_facet_enrichment";
import { FacetResponse } from "../../../utils/data_fetch_utils";
import { enrichFacetChoices } from "../../shared/facet_choice_fetcher";
import { ChartStore } from "../chart_store";
import { Context } from "../context";
import { useAllStatReady } from "../ready_hooks";

export function useComputeFacetList(chartStore: ChartStore): {
  facetList: FacetSelectorFacetInfo[];
  facetListLoading: boolean;
  facetListError: boolean;
  onFacetSelectorModalOpen: () => void;
  totalFacetCount: number;
} {
  const { statVar } = useContext(Context);
  const allStatReady = useAllStatReady(chartStore);
  const [baseFacetList, setBaseFacetList] = useState<FacetSelectorFacetInfo[]>(
    []
  );
  const [facetListLoading, setFacetListLoading] = useState(false);
  const [facetListError, setFacetListError] = useState(false);

  useEffect(() => {
    if (!allStatReady()) {
      setBaseFacetList([]);
      return;
    }

    setFacetListLoading(true);
    setFacetListError(false);

    const allStatData = chartStore.allStat.data;
    const svDcid = statVar.value.dcid;
    if (!svDcid) {
      setBaseFacetList([]);
      setFacetListLoading(false);
      return;
    }

    const baseFacets: FacetResponse = { [svDcid]: {} };
    const data = allStatData.data;

    if (data) {
      for (const place in data) {
        for (const obs of data[place]) {
          if (allStatData.facets[obs.facet]) {
            baseFacets[svDcid][obs.facet] = allStatData.facets[obs.facet];
          }
        }
      }
    }

    const finalFacetList = [
      {
        dcid: svDcid,
        name: statVar.value.info[svDcid]?.title || svDcid,
        metadataMap: baseFacets[svDcid] || {},
      },
    ];
    setBaseFacetList(finalFacetList);
    setFacetListLoading(false);
  }, [allStatReady, chartStore.allStat.data, statVar.value]);

  const entities = chartStore.allStat.data?.data
    ? Object.keys(chartStore.allStat.data.data)
    : [];
  const entitiesString = entities.join(",");
  const cacheKey = `${statVar.value.dcid}-${entitiesString}`;

  const {
    facetList,
    loading: enrichmentLoading,
    onModalOpen,
    totalFacetCount,
  } = useFacetEnrichment(
    cacheKey,
    baseFacetList,
    useCallback(async () => {
      if (baseFacetList.length === 0) return [];
      return enrichFacetChoices(baseFacetList, {
        entities: entitiesString ? entitiesString.split(",") : [],
      });
    }, [baseFacetList, entitiesString])
  );

  return {
    facetList: facetList || [],
    facetListLoading: facetListLoading || enrichmentLoading,
    facetListError,
    onFacetSelectorModalOpen: onModalOpen,
    totalFacetCount,
  };
}
