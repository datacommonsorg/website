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

import { useContext, useEffect, useState } from "react";

import { FacetSelectorFacetInfo } from "../../../shared/facet_selector/facet_selector";
import { DEFAULT_WEBSITE_DATA_COMMONS_CLIENT } from "../../../utils/data_commons_client";
import { FacetResponse } from "../../../utils/data_fetch_utils";
import { fetchFacetsWithMetadata } from "../../shared/metadata/metadata_fetcher";
import { ChartStore } from "../chart_store";
import { Context } from "../context";
import { useAllStatReady } from "../ready_hooks";

export function useComputeFacetList(chartStore: ChartStore): {
  facetList: FacetSelectorFacetInfo[];
  facetListLoading: boolean;
  facetListError: boolean;
} {
  const { statVar } = useContext(Context);
  const allStatReady = useAllStatReady(chartStore);
  const [facetList, setFacetList] = useState([]);
  const [facetListLoading, setFacetListLoading] = useState(false);
  const [facetListError, setFacetListError] = useState(false);
  const dataCommonsClient = DEFAULT_WEBSITE_DATA_COMMONS_CLIENT;

  useEffect(() => {
    if (!allStatReady()) {
      setFacetList([]);
      return;
    }

    setFacetListLoading(true);
    setFacetListError(false);

    const allStatData = chartStore.allStat.data;
    const svDcid = statVar.value.dcid;
    if (!svDcid) {
      setFacetList([]);
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

    fetchFacetsWithMetadata(baseFacets, dataCommonsClient)
      .then((enrichedMap) => {
        if (!enrichedMap[svDcid]) {
          setFacetList([]);
          setFacetListLoading(false);
          return;
        }
        const finalFacetList = [
          {
            dcid: svDcid,
            name: statVar.value.info[svDcid]?.title || svDcid,
            metadataMap: enrichedMap[svDcid],
          },
        ];
        setFacetList(finalFacetList);
        setFacetListLoading(false);
      })
      .catch(() => {
        setFacetListError(true);
        setFacetListLoading(false);
      });
  }, [allStatReady, chartStore.allStat.data, statVar.value, dataCommonsClient]);

  return { facetList, facetListLoading, facetListError };
}
