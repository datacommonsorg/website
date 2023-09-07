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
  VarToTopicMapping,
} from "../../utils/types";

import {
  ContentCard,
  ContentCardBody,
  ContentCardHeader,
  CountrySelect,
  Divider,
  HeadlineTile,
  MainLayoutContent,
  PlaceHeaderCard,
  SearchBar,
  TargetHeader,
} from "../shared/components";
import AllGoalsOverview from "../shared/goals/AllGoalsOverview";
import GoalOverview from "../shared/goals/GoalOverview";

import _ from "lodash";
import { useLocation } from "react-router";
import { theme } from "../../utils/theme";

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
            <MainLayoutContent key={topicIndex}>
              <GoalOverview
                goalNumber={topicIndex + 1}
                showExploreLink={true}
              />
            </MainLayoutContent>
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
            varToTopic={fulfillmentResponse.relatedThings.varToTopic}
          />
        ))}
    </>
  );
};

// Interfaces to define Goal -> Target -> Indicator -> Tiles[] mapping
interface Indicators {
  [key: string]: ChartConfigTile[];
}
interface Targets {
  [key: string]: Indicators;
}

interface Goals {
  [key: string]: Targets;
}

const ChartCategoryContent: React.FC<{
  chartConfigCategory: ChartConfigCategory;
  placeDcid: string;
  varToTopic: VarToTopicMapping;
}> = ({ chartConfigCategory, placeDcid, varToTopic }) => {
  // stores hierarchy of Goals -> Target -> Indicator -> Tiles
  const allGoals: Goals = {};

  // iterate over tiles nested in chartConfigCategory
  chartConfigCategory.blocks.forEach((block) => {
    block.columns.forEach((column) => {
      column.tiles.forEach((tile) => {
        // Find which goal, target, and indicator this tile belongs to
        const topicDcid = !_.isEmpty(tile.statVarKey)
          ? varToTopic[tile.statVarKey[0]].dcid
          : "";
        const indicatorMatches = topicDcid.match(
          /dc\/topic\/sdg_(\d\d?\.\w\w?\.\w\w?)/
        );
        const targetMatches = topicDcid.match(/dc\/topic\/sdg_(\d\d?\.\w\w?)/);
        const goalMatches = topicDcid.match(/dc\/topic\/sdg_(\d\d?)/);
        const indicator =
          indicatorMatches && indicatorMatches.length > 1
            ? indicatorMatches[1]
            : "none";
        const target =
          targetMatches && targetMatches.length > 1 ? targetMatches[1] : "none";
        const goal =
          goalMatches && goalMatches.length > 1 ? goalMatches[1] : "none";

        // put tile in appropriate spot in allGoals
        if (goal in allGoals) {
          if (target in allGoals[goal]) {
            if (indicator in allGoals[goal][target]) {
              allGoals[goal][target][indicator].push(tile);
            } else {
              allGoals[goal][target][indicator] = [tile];
            }
          } else {
            allGoals[goal][target] = {};
            allGoals[goal][target][indicator] = [tile];
          }
        } else {
          allGoals[goal] = {};
          allGoals[goal][target] = {};
          allGoals[goal][target][indicator] = [tile];
        }
      });
    });
  });
  return (
    <>
      {Object.keys(allGoals).map((goal, i) => {
        return (
          <ChartGoalBlock
            key={i}
            placeDcid={placeDcid}
            goal={goal}
            targetData={allGoals[goal]}
          />
        );
      })}
    </>
  );
};

// Displays all cards associated with a goal, along with goal's overview tile
const ChartGoalBlock: React.FC<{
  placeDcid: string;
  goal: string;
  targetData: Targets;
}> = ({ placeDcid, goal, targetData }) => {
  return (
    <>
      <GoalOverview goalNumber={Number(goal)} showExploreLink={false} />
      {Object.keys(targetData).map((target, i) => {
        return (
          <ChartTargetBlock
            key={`${goal}-${i}`}
            placeDcid={placeDcid}
            target={target}
            indicatorData={targetData[target]}
          />
        );
      })}
    </>
  );
};

// Displays the card associated with a target, along with target's header
const ChartTargetBlock: React.FC<{
  placeDcid: string;
  target: string;
  indicatorData: Indicators;
}> = ({ placeDcid, target, indicatorData }) => {
  const goalNumber = Number(target.split(".")[0]) || 1;
  const color = theme.sdgColors[goalNumber - 1];
  return (
    <ContentCard>
      <TargetHeader color={color} target={target} />
      <Divider color={color} />
      {Object.keys(indicatorData).map((indicator, i) => {
        return (
          <ChartIndicatorBlock
            key={`${target}=${i}`}
            indicator={indicator}
            placeDcid={placeDcid}
            tiles={indicatorData[indicator]}
          />
        );
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
  const goalNumber = Number(indicator.split(".")[0]) || 1;
  const color = theme.sdgColors[goalNumber - 1];
  return (
    <ChartContentBody>
      <HeadlineTile backgroundColor={color} indicator={indicator} />
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
