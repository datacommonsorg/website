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
  COUNTRY_PLACE_TYPE,
  EARTH_PLACE_DCID,
  EARTH_PLACE_NAME,
  ROOT_TOPIC,
  WEB_API_ENDPOINT,
} from "../../utils/constants";

import {
  ChartConfigCategory,
  ChartConfigMetadata,
  ChartConfigTile,
  FulfillResponse,
  StatVarSpec,
} from "../../utils/types";

import {
  ContentCard,
  CountrySelect,
  Divider,
  Footnotes,
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
const VARIABLE_NAME_REGEX = "(?<=\\[)(.*?)(?=\\])";

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

/**
 * Given a sdg topic DCID, determine the goal, target, and indicator via regex.
 * If a level of granularity is missing, the string "none" is used in its place.
 * For example:
 *   dc/topic/sdg/2.1.3 would return ["2", "1", "3"]
 *   dc/topic/sdg/4 would return ["4", "none", "none"]
 * @param topicDcid sdg topic's DCID
 * @returns the id of the topic's goal, target, and indicator, in that order
 */
function getGoalTargetIndicator(topicDcid: string): [string, string, string] {
  // Find which goal, target, and indicator a topic belongs to
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
  const goal = goalMatches && goalMatches.length > 1 ? goalMatches[1] : "none";
  return [goal, target, indicator];
}

/**
 * Given an sdg topic, determine if it falls under a list of topics.
 * If an sdg topic is a subset of any member of the list, returns true.
 * For example,
 *   if topicDcid = dc/topic/sdg_1.1.1
 *   and selectedTopics = [dc/topic/sdg_1.1, dc/topic/sdg_2],
 *   then the function returns true, because 1.1.1 is a subset of 1.1
 * Used to determine if a given sdg topic matches the topic(s) selected by
 * the user or passed into search.
 * @param topicDcid sdg topic to test membership for
 * @param selectedTopics list of topics to match
 * @returns true if given topic is a subset of any member of the list,
 *          false otherwise.
 */
function isInSelectedTopics(
  topicDcid: string,
  selectedTopics: string[]
): boolean {
  const [goal, target, indicator] = getGoalTargetIndicator(topicDcid);
  for (const selectedTopic of selectedTopics) {
    if (selectedTopic === ROOT_TOPIC) {
      return true;
    }
    const [selectedGoal, selectedTarget, selectedIndicator] =
      getGoalTargetIndicator(selectedTopic);
    if (
      indicator === selectedIndicator ||
      (selectedIndicator === "none" && target === selectedTarget) ||
      (selectedTarget === "none" && goal === selectedGoal)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Adds tile to a given goal->target->indicator->tiles mapping
 * @param tile tile to add
 * @param hierarchy tree of goal->target->indicator->tiles to add to
 * @param topicDcid topic associated with the tile being added
 * @param selectedTopics list of topics the current page is about
 */
function addTileToHierarchy(
  tile: ChartConfigTile,
  hierarchy: Goals,
  topicDcid: string,
  selectedTopics: string[]
): void {
  if (isInSelectedTopics(topicDcid, selectedTopics)) {
    // put tile in appropriate spot in hierarchy
    const [goal, target, indicator] = getGoalTargetIndicator(topicDcid);
    if (goal in hierarchy) {
      if (target in hierarchy[goal]) {
        if (indicator in hierarchy[goal][target]) {
          hierarchy[goal][target][indicator].push(tile);
        } else {
          hierarchy[goal][target][indicator] = [tile];
        }
      } else {
        hierarchy[goal][target] = {};
        hierarchy[goal][target][indicator] = [tile];
      }
    } else {
      hierarchy[goal] = {};
      hierarchy[goal][target] = {};
      hierarchy[goal][target][indicator] = [tile];
    }
  }
}

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
  errorMessage?: string;
  fulfillResponse?: FulfillResponse;
  hidePlaceSearch?: boolean;
  isFetchingFulfillment?: boolean;
  onSearch?: (query: string) => void;
  placeDcids: string[];
  query?: string;
  setPlaceDcid: (placeDcid: string) => void;
  showNLSearch?: boolean;
  userMessage?: string;
  variableDcids: string[];
}> = ({
  errorMessage,
  fulfillResponse,
  hidePlaceSearch,
  isFetchingFulfillment,
  onSearch,
  placeDcids,
  query,
  setPlaceDcid,
  showNLSearch,
  userMessage,
  variableDcids,
}) => {
  const rootTopics = useStoreState((s) => s.rootTopics);
  const fulfillmentsById = useStoreState((s) => s.fulfillments.byId);
  const fetchTopicFulfillment = useStoreActions((a) => a.fetchTopicFulfillment);
  const [localIsFetchingFulfillment, setLocalIsFetchingFulfillment] =
    useState(false);
  const [localFulfillResponse, setLocalFulfillResponse] =
    useState<FulfillResponse>();
  const placeNames = useStoreState((s) => {
    const names: string[] = [];
    placeDcids.forEach((placeDcid) => {
      if (placeDcids && placeDcid in s.countries.byDcid) {
        names.push(s.countries.byDcid[placeDcid].name);
      }
      if (placeDcid && placeDcid in s.regions.byDcid) {
        names.push(s.regions.byDcid[placeDcid].name);
      }
      if (placeDcid === EARTH_PLACE_DCID) {
        names.push(EARTH_PLACE_NAME);
      }
    });

    return names;
  });

  // Determine if we're in the search pages.
  // Used to hide PageHeaderCard if we're showing search results
  const location = useLocation();
  const isSearch = location.pathname.includes("/search");

  /**
   * Fetch page content
   */
  useEffect(() => {
    // If a fulfill response was passed in, use that
    if (isSearch) {
      setLocalFulfillResponse(fulfillResponse);
      return;
    }
    // Otherwise fetch a fulfill response based on the specified variables & place
    if (
      !variableDcids ||
      variableDcids.length === 0 ||
      placeDcids.length === 0
    ) {
      return;
    }
    (async () => {
      setLocalIsFetchingFulfillment(true);
      const topicDcids = variableDcids.map((dcid) => {
        if (dcid.indexOf("/g/") !== -1) {
          return dcid.replace("/g/", "/topic/").toLocaleLowerCase();
        }
        return dcid;
      });

      const fulfillment = await fetchTopicFulfillment({
        entityDcids: placeDcids,
        variableDcids: topicDcids,
        fulfillmentsById,
      });
      setLocalIsFetchingFulfillment(false);
      setLocalFulfillResponse(fulfillment);
    })();
  }, [fulfillResponse, isSearch, placeDcids, variableDcids]);

  /** Show loading state if we are passing in a fulfillment response from outside this component */
  useEffect(() => {
    if (isFetchingFulfillment === undefined) {
      return;
    }
    if (localIsFetchingFulfillment !== isFetchingFulfillment) {
      setLocalIsFetchingFulfillment(isFetchingFulfillment);
    }
  }, [isFetchingFulfillment]);

  if (
    variableDcids.length > 0 &&
    variableDcids[0] === ROOT_TOPIC &&
    placeDcids.length > 0 &&
    placeDcids[0] === EARTH_PLACE_DCID
  ) {
    return (
      <Layout style={{ height: "100%", flexGrow: 1 }}>
        <Layout.Content style={{ padding: "0rem 0" }}>
          <PlaceTitle style={{ marginBottom: "1rem", display: "block" }}>
            <div>
              {placeNames.length > 0 ? (
                placeNames.join(", ")
              ) : placeDcids.length > 0 ? (
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
              isSearching={localIsFetchingFulfillment}
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
            {placeNames.length > 0 ? (
              placeNames.join(", ")
            ) : placeDcids.length > 0 ? (
              <Spinner />
            ) : (
              "Select a country"
            )}
          </div>
          {!hidePlaceSearch && (
            <CountrySelect setSelectedPlaceDcid={setPlaceDcid} />
          )}
        </PlaceTitle>
        {errorMessage && <ErorrMessage message={errorMessage} />}

        {(placeNames.length > 0 || userMessage) && (
          <Layout.Content style={{ padding: "0 24px 24px" }}>
            <PlaceHeaderCard
              placeNames={placeNames}
              hideBreadcrumbs={isSearch}
              hidePlaceSearch={hidePlaceSearch}
              setSelectedPlaceDcid={setPlaceDcid}
              userMessage={userMessage}
              variableDcids={variableDcids}
            />
          </Layout.Content>
        )}

        <MainLayoutContent>
          {!isSearch &&
            variableDcids.length === 0 &&
            !fulfillResponse &&
            placeDcids.length === 0 && (
              <ContentCard>
                <h5>Explore SDG progress</h5>
                <p>Select a country to get started.</p>
              </ContentCard>
            )}
          {localIsFetchingFulfillment ? (
            <ContentCard>
              <Spinner />
            </ContentCard>
          ) : (
            <ChartContent
              fulfillResponse={localFulfillResponse}
              placeDcids={placeDcids}
              selectedVariableDcids={variableDcids}
            />
          )}
          <Footnotes />
        </MainLayoutContent>
      </Layout.Content>
    </Layout>
  );
};

const ChartContent: React.FC<{
  fulfillResponse?: FulfillResponse;
  placeDcids: string[];
  selectedVariableDcids: string[];
}> = (props) => {
  const { fulfillResponse, placeDcids, selectedVariableDcids } = props;
  if (!fulfillResponse || fulfillResponse.failure) {
    return null;
  }
  return (
    <>
      {fulfillResponse.config.categories &&
        fulfillResponse.config.categories.map((chartConfigCategory, i) => (
          <ChartCategoryContent
            key={i}
            placeDcids={placeDcids}
            chartConfigCategory={chartConfigCategory}
            fulfillResponse={fulfillResponse}
            selectedTopics={selectedVariableDcids}
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
  fulfillResponse: FulfillResponse;
  placeDcids: string[];
  selectedTopics: string[];
}> = ({ chartConfigCategory, fulfillResponse, placeDcids, selectedTopics }) => {
  const varToTopics = fulfillResponse.relatedThings.varToTopics;
  // stores hierarchy of Goals -> Target -> Indicator -> Tiles
  const allGoals: Goals = {};

  // iterate over tiles nested in chartConfigCategory
  chartConfigCategory.blocks.forEach((block) => {
    block.columns.forEach((column) => {
      column.tiles.forEach((tile) => {
        if (tile.type === "PLACE_OVERVIEW") {
          return;
        }
        if (_.isEmpty(tile.statVarKey)) {
          return;
        }
        const statVarKey = tile.statVarKey[0];
        if (_.isEmpty(chartConfigCategory.statVarSpec[statVarKey])) {
          return;
        }
        const statVar = chartConfigCategory.statVarSpec[statVarKey].statVar;
        if (_.isEmpty(varToTopics[statVar])) {
          return;
        }
        for (const topic of varToTopics[statVar]) {
          addTileToHierarchy(tile, allGoals, topic.dcid, selectedTopics);
        }
      });
    });
  });
  return (
    <>
      {Object.keys(allGoals).sort().map((goal, i) => {
        return (
          <ChartGoalBlock
            fulfillResponse={fulfillResponse}
            goal={goal}
            key={i}
            placeDcids={placeDcids}
            statVarSpec={chartConfigCategory.statVarSpec}
            targetData={allGoals[goal]}
          />
        );
      })}
    </>
  );
};

// Displays all cards associated with a goal, along with goal's overview tile
const ChartGoalBlock: React.FC<{
  fulfillResponse: FulfillResponse;
  chartConfigMetadata?: ChartConfigMetadata;
  placeDcids: string[];
  goal: string;
  targetData: Targets;
  statVarSpec: StatVarSpec;
}> = ({ fulfillResponse, placeDcids, goal, targetData, statVarSpec }) => {
  return (
    <>
      {placeDcids[0] === EARTH_PLACE_DCID && (
        <GoalOverview goalNumber={Number(goal)} showExploreLink={false} />
      )}
      {Object.keys(targetData).sort().map((target, i) => {
        return (
          <ChartTargetBlock
            key={`${goal}-${i}`}
            fulfillResponse={fulfillResponse}
            placeDcids={placeDcids}
            target={target}
            indicatorData={targetData[target]}
            statVarSpec={statVarSpec}
          />
        );
      })}
    </>
  );
};

// Displays the card associated with a target, along with target's header
const ChartTargetBlock: React.FC<{
  fulfillResponse: FulfillResponse;
  indicatorData: Indicators;
  placeDcids: string[];
  statVarSpec: StatVarSpec;
  target: string;
}> = ({ fulfillResponse, indicatorData, placeDcids, statVarSpec, target }) => {
  const goalNumber = Number(target.split(".")[0]) || 1;
  const color = theme.sdgColors[goalNumber - 1];
  return (
    <ContentCard>
      <TargetHeader color={color} target={target} />
      <Divider color={color} />
      {Object.keys(indicatorData).sort().map((indicator, i) => {
        return (
          <ChartIndicatorBlock
            fulfillResponse={fulfillResponse}
            indicator={indicator}
            key={`${target}=${i}`}
            placeDcids={placeDcids}
            statVarSpec={statVarSpec}
            tiles={indicatorData[indicator]}
          />
        );
      })}
    </ContentCard>
  );
};

// Displays the tiles associated with a single indicator
const ChartIndicatorBlock: React.FC<{
  fulfillResponse: FulfillResponse;
  indicator: string;
  placeDcids: string[];
  statVarSpec: StatVarSpec;
  tiles: ChartConfigTile[];
}> = ({ fulfillResponse, indicator, placeDcids, statVarSpec, tiles }) => {
  const goalNumber = Number(indicator.split(".")[0]) || 1;
  const color = theme.sdgColors[goalNumber - 1];
  return (
    <ChartContentBody>
      {placeDcids[0] === EARTH_PLACE_DCID && (
        <HeadlineTile backgroundColor={color} indicator={indicator} />
      )}
      {tiles.map((tile, i) => (
        <ChartTile
          fulfillResponse={fulfillResponse}
          key={`${indicator}-${i}`}
          placeDcids={placeDcids}
          tile={tile}
          statVarSpec={statVarSpec}
        />
      ))}
    </ChartContentBody>
  );
};

const ChartTile: React.FC<{
  fulfillResponse: FulfillResponse;
  statVarSpec: StatVarSpec;
  placeDcids: string[];
  tile: ChartConfigTile;
}> = ({ fulfillResponse, placeDcids, tile, statVarSpec }) => {
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

  if (placeDcids.length === 0) {
    return <div ref={ref} />;
  }

  const placeDcid = placeDcids[0];
  const placeType = fulfillResponse.place.place_type;
  const containedPlaceTypes =
    fulfillResponse.config.metadata?.containedPlaceTypes || {};
  const childPlaceType =
    placeType in containedPlaceTypes
      ? containedPlaceTypes[placeType]
      : COUNTRY_PLACE_TYPE;

  const tileStatVars = tile.statVarKey.map(
    (statVarKey) => statVarSpec[statVarKey].statVar
  );

  let component = null;
  const height =
    tile.type === "HIGHLIGHT" ? HIGHLIGHT_CHART_HEIGHT : CHART_HEIGHT;
  if (tile.type === "PLACE_OVERVIEW") {
    component = <></>;
  } else if (tile.type === "BAR") {
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-bar
          apiRoot={WEB_API_ENDPOINT}
          header={tile.title}
          variables={tileStatVars.join(" ")}
          places={placeDcids.join(" ")}
          sort="descending"
          showExploreMore={true}
          variableNameRegex={VARIABLE_NAME_REGEX}
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
          variable={tileStatVars.join(" ")}
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
          variables={tileStatVars.join(" ")}
          places={tile.placeDcidOverride || placeDcids.join(" ")}
          variableNameRegex={VARIABLE_NAME_REGEX}
          showExploreMore={true}
        />
      </>
    );
  } else if (tile.type === "MAP") {
    const channel = `map-${tileStatVars.join("__")}`;
    // To prevent showing sub-national map data, only show maps if
    // the child place is Country (for World or regional views)
    const showMap = childPlaceType === COUNTRY_PLACE_TYPE;
    component = showMap ? (
      <>
        {/** @ts-ignore */}
        <datacommons-map
          apiRoot={WEB_API_ENDPOINT}
          subscribe={channel}
          header={`${tile.title}*`}
          variable={tileStatVars.join(" ")}
          parentPlace={placeDcid}
          childPlaceType={childPlaceType}
          showExploreMore={true}
        />
        {/** @ts-ignore */}
        <datacommons-slider
          apiRoot={WEB_API_ENDPOINT}
          publish={channel}
          variable={tileStatVars.join(" ")}
          parentPlace={placeDcid}
          childPlaceType={childPlaceType}
        />
      </>
    ) : (
      <></>
    );
  } else if (tile.type === "GAUGE") {
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-gauge
          apiRoot={WEB_API_ENDPOINT}
          header={tile.title}
          variable={tileStatVars.join(" ")}
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
      className={`-dc-chart-tile -dc-chart-tile-${tile.type}`}
      ref={ref}
      style={{ minHeight: !loaded ? height : undefined }}
    >
      {loaded && component}
    </div>
  );
};

const ErorrMessageText = styled.div<{ error?: boolean }>`
  font-size: 18px;
`;
const ErorrMessage: React.FC<{ message: string }> = ({ message }) => {
  return (
    <MainLayoutContent>
      <ContentCard>
        <ErorrMessageText>{message}</ErorrMessageText>
      </ContentCard>
    </MainLayoutContent>
  );
};
export default CountriesContent;
