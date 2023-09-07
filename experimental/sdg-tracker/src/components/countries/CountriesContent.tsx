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
import {
  EARTH_PLACE_DCID,
  ROOT_TOPIC,
  WEB_API_ENDPOINT,
} from "../../utils/constants";

import {
  ChartConfigCategory,
  ChartConfigTile,
  FulfillResponse,
} from "../../utils/types";

import {
  ContentCard,
  ContentCardBody,
  ContentCardHeader,
  CountrySelect,
  MainLayoutContent,
  PlaceHeaderCard,
  SearchBar,
} from "../shared/components";
import AllGoalsOverview from "../shared/goals/AllGoalsOverview";
import GoalOverview from "../shared/goals/GoalOverview";

import { useLocation } from "react-router";

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

const PlaceTitle = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 2rem;
  justify-content: space-between;
  align-items: center;
  padding: 0rem 24px;
  margin: 1rem 0 0;
  flex-wrap: wrap;
`;

const ChartContentBody = styled.div`
  h3 {
    font-size: 2.5rem;
    font-weight: 300;
  }
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
  const rootTopics = useStoreState((s) => s.rootTopics);
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

  if (
    variableDcids.length > 0 &&
    variableDcids[0] === ROOT_TOPIC &&
    placeDcid === EARTH_PLACE_DCID
  ) {
    return (
      <Layout style={{ height: "100%", flexGrow: 1 }}>
        <Layout.Content style={{ padding: "0rem 0" }}>
          <PlaceTitle style={{ marginBottom: "1rem", display: "block" }}>
            <div>
              {placeName ? (
                placeName
              ) : placeDcid ? (
                <Spinner />
              ) : (
                "Select a country"
              )}
            </div>
            {!hidePlaceSearch && (
              <CountrySelect setSelectedPlaceDcid={setPlaceDcid} />
            )}
          </PlaceTitle>
          <AllGoalsOverview />
          {rootTopics.map((_, topicIndex) => (
            <GoalOverview
              key={topicIndex}
              goalNumber={topicIndex + 1}
              showExploreLink={true}
            />
          ))}
        </Layout.Content>
      </Layout>
    );
  }

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

        <PlaceTitle style={{ display: "none" }}>
          <div>
            {placeName ? (
              placeName
            ) : placeDcid ? (
              <Spinner />
            ) : (
              "Select a country"
            )}
          </div>
          {!hidePlaceSearch && (
            <CountrySelect setSelectedPlaceDcid={setPlaceDcid} />
          )}
        </PlaceTitle>

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
        <MainLayoutContent>
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
        </MainLayoutContent>
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
        <ContentCardHeader>
          <div>
            <h3>No information found</h3>
          </div>
        </ContentCardHeader>
        <ContentCardBody>
          {fulfillmentResponse.failure || fulfillmentResponse.userMessage}
        </ContentCardBody>
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
          />
        ))}
    </>
  );
};

const ChartCategoryContent: React.FC<{
  chartConfigCategory: ChartConfigCategory;
  placeDcid: string;
}> = ({ chartConfigCategory, placeDcid }) => {
  const tiles: ChartConfigTile[] = [];
  chartConfigCategory.blocks.forEach((block) => {
    block.columns.forEach((column) => {
      column.tiles.forEach((tile) => {
        tiles.push(tile);
      });
    });
  });
  return (
    <ContentCard>
      <ChartContentBody>
        {tiles.map((tile, i) => (
          <ChartTile key={i} placeDcid={placeDcid} tile={tile} />
        ))}
      </ChartContentBody>
    </ContentCard>
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
    <div ref={ref} style={{ minHeight: !loaded ? height : undefined }}>
      {loaded && component}
    </div>
  );
};

export default CountriesContent;
