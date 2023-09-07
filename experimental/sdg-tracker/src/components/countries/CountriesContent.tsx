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

import { LoadingOutlined } from "@ant-design/icons";
import { Layout, Spin } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";

import styled from "styled-components";
import { useStoreActions, useStoreState } from "../../state";
import { WEB_API_ENDPOINT } from "../../utils/constants";
import {
  ChartConfigCategory,
  ChartConfigTile,
  FulfillResponse,
  VarToTopicMapping,
} from "../../utils/types";
import { HeadlineTile, PlaceHeaderCard, SearchBar } from "../layout/components";
import { useLocation } from "react-router";
import _ from "lodash";

// Approximate chart heights for lazy-loading
const CHART_HEIGHT = 389;
const HIGHLIGHT_CHART_HEIGHT = 155;

const SearchCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  h5 {
    font-size: 1rem;
    font-weight: 300;
    padding: 0;
    margin: 0;
  }

  margin: 0 0 1rem;
  padding: 1rem 24px;
  background: white;
  box-shadow: 0px 0px 6px rgba(3, 7, 18, 0.03),
    0px 1px 22px rgba(3, 7, 18, 0.06);
`;
const ChartContentHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 2rem;
  width: 100%;
  img {
    width: 5rem;
    height: 5rem;
    margin-right: 2rem;
    border-radius: 1rem;
  }
  h3 {
    font-size: 1.5rem;
    font-weight: 300;
    margin-bottom: 0.25rem;
  }
`;
const ChartContentBody = styled.div`
  h3 {
    font-size: 2.5rem;
    font-weight: 300;
  }
`;
const ContentCard = styled.div`
  margin: 0 0 1rem;
  padding: 24px;
  background: white;
  border-radius: 1rem;
`;

const Spinner: React.FC<{ fontSize?: string }> = ({ fontSize }) => {
  const DEFAULT_SPINNER_FONT_SIZE = "1.5rem";
  return (
    <Spin
      indicator={
        <LoadingOutlined
          style={{ fontSize: fontSize || DEFAULT_SPINNER_FONT_SIZE }}
          spin
        />
      }
    />
  );
};

const CountriesContent: React.FC<{
  hidePlaceSearch?: boolean;
  onSearch?: (query: string) => void;
  showNLSearch?: boolean;
  variableDcids: string[];
  placeDcid?: string;
  query?: string;
  setPlaceDcid: (placeDcid: string) => void;
}> = ({
  hidePlaceSearch,
  showNLSearch,
  onSearch,
  placeDcid,
  query,
  setPlaceDcid,
  variableDcids,
}) => {
  const fulfillmentsById = useStoreState((s) => s.fulfillments.byId);
  const fetchTopicFulfillment = useStoreActions((a) => a.fetchTopicFulfillment);
  const [isFetchingFulfillment, setIsFetchingFulfillment] = useState(false);
  const [fulfillmentResponse, setFulfillmentResponse] =
    useState<FulfillResponse>();
  const placeName = useStoreState((s) => {
    if (placeDcid && placeDcid in s.countries.byDcid) {
      return s.countries.byDcid[placeDcid].name;
    }
    if (placeDcid && placeDcid in s.regions.byDcid) {
      return s.regions.byDcid[placeDcid].name;
    }
    return undefined;
  });

  // Determine if we're in the search pages.
  // Used to hide PageHeaderCard if we're showing search results
  const location = useLocation();
  const isSearch = location.pathname.includes("/search");

  /**
   * Fetch page content
   */
  useEffect(() => {
    if (!variableDcids || variableDcids.length === 0 || !placeDcid) {
      return;
    }
    (async () => {
      setIsFetchingFulfillment(true);
      const topicDcids = variableDcids.map((dcid) => {
        if (dcid.indexOf("/g/") !== -1) {
          return dcid.replace("/g/", "/topic/").toLocaleLowerCase();
        }
        return dcid;
      });

      const fulfillment = await fetchTopicFulfillment({
        entityDcids: [placeDcid],
        variableDcids: topicDcids,
        fulfillmentsById,
      });
      setIsFetchingFulfillment(false);
      setFulfillmentResponse(fulfillment);
    })();
  }, [placeDcid, variableDcids]);

  return (
    <Layout style={{ height: "100%", flexGrow: 1 }}>
      <Layout.Content style={{ padding: "0rem 0" }}>
        {showNLSearch && (
          <SearchCard>
            <SearchBar
              initialQuery={query}
              isSearching={isFetchingFulfillment}
              onSearch={(query) => {
                if (onSearch) {
                  onSearch(query);
                }
              }}
            />
          </SearchCard>
        )}
        {!isSearch && (
          <Layout.Content style={{ padding: "0 24px 24px" }}>
            <PlaceHeaderCard
              currentPlaceName={placeName}
              hidePlaceSearch={hidePlaceSearch}
              setSelectedPlaceDcid={setPlaceDcid}
              variableDcids={variableDcids}
            />
          </Layout.Content>
        )}
        <Layout.Content style={{ padding: "0 24px 24px" }}>
          {isFetchingFulfillment ? (
            <ContentCard>
              <Spinner />
            </ContentCard>
          ) : (
            <ChartContent
              fulfillmentResponse={fulfillmentResponse}
              placeDcid={placeDcid}
              selectedVariableDcids={variableDcids}
            />
          )}
        </Layout.Content>
      </Layout.Content>
    </Layout>
  );
};

const ChartContent: React.FC<{
  fulfillmentResponse?: FulfillResponse;
  placeDcid?: string;
  selectedVariableDcids?: string[];
}> = (props) => {
  const { fulfillmentResponse, placeDcid, selectedVariableDcids } = props;

  if (
    !selectedVariableDcids ||
    selectedVariableDcids.length === 0 ||
    !fulfillmentResponse ||
    !placeDcid
  ) {
    return (
      <ContentCard>
        <h5>Explore SDG progress</h5>
        <p>Select a country to get started.</p>
      </ContentCard>
    );
  }
  if (fulfillmentResponse.failure || fulfillmentResponse.userMessage) {
    return (
      <ContentCard>
        <ChartContentHeader>
          <div>
            <h3>No information found</h3>
          </div>
        </ChartContentHeader>
        <ChartContentBody>
          {fulfillmentResponse.failure || fulfillmentResponse.userMessage}
        </ChartContentBody>
      </ContentCard>
    );
  }
  return (
    <>
      {fulfillmentResponse.config.categories &&
        fulfillmentResponse.config.categories.map((chartConfigCategory, i) => (
          <ChartCategoryContent
            key={i}
            placeDcid={placeDcid}
            chartConfigCategory={chartConfigCategory}
            varToTopic={fulfillmentResponse.relatedThings.varToTopic}
          />
        ))}
    </>
  );
};

// Interfaces to define Target -> Indicator -> Tiles[] mapping
interface Indicators {
  [key: string]: ChartConfigTile[];
}
interface Targets {
  [key: string]: Indicators;
}

const ChartTargetBlock: React.FC<{
  placeDcid: string;
  target: string;
  indicatorData: Indicators;
}> = ({ placeDcid, target, indicatorData }) => {
  console.log("Entered Chart Target Block");
  return (
    <ContentCard>
      <h3>{target}</h3>
      {Object.keys(indicatorData).map((indicator) => {
        console.log(indicator);
        console.log(indicatorData[indicator]);
        <ChartIndicatorBlock 
          indicator={indicator}
          placeDcid={placeDcid}
          tiles={indicatorData[indicator]}
        />
      })}
    </ContentCard>
  );
};

// Displays the tiles associated with a single indicator
const ChartIndicatorBlock: React.FC<{
  indicator: string;
  placeDcid: string;
  tiles: ChartConfigTile[];
}> = ({ indicator, placeDcid, tiles }) => {
  console.log("entered Chart Indicator Block");
  return (
    <ChartContentBody>
      <HeadlineTile indicator={indicator} />
      {tiles.map((tile, i) => (
        <ChartTile
          key={`${indicator}-${i}`}
          placeDcid={placeDcid}
          tile={tile}
        />
      ))}
    </ChartContentBody>
  );
};

const ChartCategoryContent: React.FC<{
  chartConfigCategory: ChartConfigCategory;
  placeDcid: string;
  varToTopic: VarToTopicMapping;
}> = ({ chartConfigCategory, placeDcid, varToTopic }) => {
  const allTargets: Targets = {};
  chartConfigCategory.blocks.forEach((block) => {
    block.columns.forEach((column) => {
      column.tiles.forEach((tile) => {
        // Find matching 
        const topicDcid = !_.isEmpty(tile.statVarKey) ? varToTopic[tile.statVarKey[0]].dcid: "";
        const indicatorMatches = topicDcid.match(
          /dc\/topic\/sdg_(\d\d?\.\w\w?\.\w\w?)/
        );
        const targetMatches = topicDcid.match(/dc\/topic\/sdg_(\d\d?\.\w\w?)/);
        const indicator =
          indicatorMatches && indicatorMatches.length > 1
            ? indicatorMatches[1]
            : "none";
        const target =
          targetMatches && targetMatches.length > 1 ? targetMatches[1] : "none";
        if (target in allTargets) {
          if (indicator in allTargets[target]) {
            allTargets[target][indicator].push(tile);
          } else {
            allTargets[target][indicator] = [tile];
          }
        } else {
          allTargets[target] = {};
          allTargets[target][indicator] = [tile];
        }
      });
    });
  });
  return (
    <>
      {Object.keys(allTargets).map((target) => {
        console.log("called ChartTargetBlock");
        console.log(allTargets[target]);
        <ChartTargetBlock
          placeDcid={placeDcid}
          target={target}
          indicatorData={allTargets[target]}
        ></ChartTargetBlock>
      })}
    </>
  );
};

const ChartTile: React.FC<{ placeDcid: string; tile: ChartConfigTile }> = ({
  placeDcid,
  tile,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [isIntersecting, setIntersecting] = useState(false);

  const observer = useMemo(
    () =>
      new IntersectionObserver(([entry]) =>
        setIntersecting(entry.isIntersecting)
      ),
    [ref]
  );

  useEffect(() => {
    if (isIntersecting && !loaded) {
      setLoaded(true);
    }
  }, [isIntersecting]);

  useEffect(() => {
    // @ts-ignore
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  let component = null;
  const height =
    tile.type === "HIGHLIGHT" ? HIGHLIGHT_CHART_HEIGHT : CHART_HEIGHT;
  if (tile.type === "BAR") {
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-bar
          apiRoot={WEB_API_ENDPOINT}
          header={tile.title}
          variables={tile.statVarKey.join(" ")}
          places={placeDcid}
          sort="descending"
        />
      </>
    );
  } else if (tile.type === "HIGHLIGHT") {
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-highlight
          apiRoot={WEB_API_ENDPOINT}
          header={tile.title}
          variable={tile.statVarKey.join(" ")}
          place={placeDcid}
        />
      </>
    );
  } else if (tile.type === "LINE") {
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-line
          apiRoot={WEB_API_ENDPOINT}
          header={tile.title}
          variables={tile.statVarKey.join(" ")}
          places={placeDcid}
        />
      </>
    );
  } else if (tile.type === "MAP") {
    const channel = `map-${tile.statVarKey.join("__")}`;
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-map
          apiRoot={WEB_API_ENDPOINT}
          subscribe={channel}
          header={tile.title}
          variable={tile.statVarKey.join(" ")}
          parentPlace="Earth"
          childPlaceType="Country"
        />
        {/** @ts-ignore */}
        <datacommons-slider
          apiRoot={WEB_API_ENDPOINT}
          publish={channel}
          variable={tile.statVarKey.join(" ")}
          parentPlace="Earth"
          childPlaceType="Country"
        />
      </>
    );
  } else if (tile.type === "GAUGE") {
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-gauge
          apiRoot={WEB_API_ENDPOINT}
          header={tile.title}
          variable={tile.statVarKey.join(" ")}
          place={placeDcid}
          min="0"
          max="100"
        />
      </>
    );
  } else {
    component = (
      <div>
        Unknown chart type {tile.type} for chart {'"'}
        {tile.title}
        {'"'}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{ minHeight: !loaded ? height : undefined }}
    >
      {loaded && component}
    </div>
  );
};

export default CountriesContent;
