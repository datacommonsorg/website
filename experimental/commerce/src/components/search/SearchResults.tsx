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
import { Spin } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";

import styled from "styled-components";

import { useStoreActions, useStoreState } from "../../state";
import {
  COUNTRY_PLACE_TYPE,
  NULL_TOPIC,
  WEB_API_ENDPOINT,
} from "../../utils/constants";

import {
  ChartConfigCategory,
  ChartConfigTile,
  FulfillResponse,
  RelatedTopic,
  StatVarSpec,
} from "../../utils/types";

import {
  ChartFootnote,
  ContentCard,
  Footnotes,
  MainLayoutContent,
  PlaceHeaderCard,
  SearchBar,
} from "../shared/components";

import _ from "lodash";
import { Col, Row } from "reactstrap";

// Approximate chart heights for lazy-loading
const CHART_HEIGHT = 389;
const HIGHLIGHT_CHART_HEIGHT = 155;
//const VARIABLE_NAME_REGEX = "(?<=\\[)(.*?)(?=\\])";
const VARIABLE_NAME_REGEX = undefined;
const DEFAULT_VARIABLE_NAME = "Total";
const NO_MAP_TOOL_PLACE_TYPES = new Set(["UNGeoRegion", "GeoRegion"]);

interface TileWithFootnote {
  tile: ChartConfigTile;
  footnote?: string;
}

const SearchLayout = styled.div`
  height: 100%;
  flex-grow: 1;
`;

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

const ChartContentBody = styled.div`
  h3 {
    font-size: 2.5rem;
    font-weight: 300;
  }
`;

const DatacommonsMapContainer = styled.div`
  datacommons-slider::part(container) {
    margin-bottom: 0;
    border: 0;
    border-top: 1px solid #e3e3e3;
    border-radius: 0;
  }
`;

const ChartBlock = styled.div`
  padding: 2rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
`;

const ChartBlockTitle = styled.div`
  font-size: 1.25rem;
`;

/**
 * Builds topic name(s) to display on search results header
 */
function buildTopicNames(mainTopics?: RelatedTopic[]): string {
  if (!mainTopics || _.isEmpty(mainTopics)) {
    return "";
  }
  // Don't show default topic nome if no topic was found
  if (mainTopics.find((topic) => topic.dcid === NULL_TOPIC)) {
    return "";
  }
  // Two topics denote a correlation/comparison
  if (mainTopics.length === 2) {
    return `${mainTopics[0].name} vs. ${mainTopics[1].name}`;
  }
  return mainTopics[0].name;
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

const SearchResults: React.FC<{
  errorMessage?: string;
  fulfillResponse?: FulfillResponse;
  isFetchingFulfillment?: boolean;
  onSearch?: (query: string) => void;
  placeDcids: string[];
  query?: string;
  showNLSearch?: boolean;
  userMessage?: string;
  variableDcids: string[];
}> = ({
  errorMessage,
  fulfillResponse,
  isFetchingFulfillment,
  onSearch,
  placeDcids,
  query,
  showNLSearch,
  userMessage,
  variableDcids,
}) => {
  const fulfillmentsById = useStoreState((s) => s.fulfillments.byId);
  const fetchTopicFulfillment = useStoreActions((a) => a.fetchTopicFulfillment);
  const [localIsFetchingFulfillment, setLocalIsFetchingFulfillment] =
    useState(false);
  const [localFulfillResponse, setLocalFulfillResponse] =
    useState<FulfillResponse>();

  /**
   * Fetch page content
   */
  useEffect(() => {
    // If a fulfill response was passed in, use that
    if (fulfillResponse || isFetchingFulfillment) {
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
  }, [fulfillResponse, placeDcids, variableDcids]);

  /** Show loading state if we are passing in a fulfillment response from outside this component */
  useEffect(() => {
    if (isFetchingFulfillment === undefined) {
      return;
    }
    if (localIsFetchingFulfillment !== isFetchingFulfillment) {
      setLocalIsFetchingFulfillment(isFetchingFulfillment);
    }
  }, [isFetchingFulfillment]);

  const topicNames = buildTopicNames(
    localFulfillResponse?.relatedThings?.mainTopics
  );

  return (
    <SearchLayout>
      <div>
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

        {errorMessage && <ErorrMessage message={errorMessage} />}

        {(!fulfillResponse?.places ||
          fulfillResponse?.places.length > 0 ||
          userMessage) && (
          <div>
            <PlaceHeaderCard
              places={fulfillResponse?.places || []}
              topicNames={topicNames}
              userMessage={userMessage}
            />
          </div>
        )}

        <MainLayoutContent>
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
      </div>
    </SearchLayout>
  );
};

const ChartContent: React.FC<{
  fulfillResponse?: FulfillResponse;
  placeDcids: string[];
  selectedVariableDcids: string[];
}> = (props) => {
  const { fulfillResponse, placeDcids } = props;
  if (!fulfillResponse || fulfillResponse.failure) {
    return null;
  }
  // Return no data error if there is nothing to show.
  if (Object.keys(fulfillResponse?.config || {}).length === 0) {
    return (
      <ContentCard>
        <ErorrMessageText>No data found.</ErorrMessageText>
      </ContentCard>
    );
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
          />
        ))}
    </>
  );
};

const ChartCategoryContent: React.FC<{
  chartConfigCategory: ChartConfigCategory;
  fulfillResponse: FulfillResponse;
  placeDcids: string[];
}> = ({ chartConfigCategory, fulfillResponse, placeDcids }) => {
  const tiles: ChartConfigTile[] = [];
  fulfillResponse.config.categories?.forEach((category) => {
    category.blocks.forEach((block) => {
      block.columns.forEach((block) => {
        block.tiles.forEach((tile) => {
          tiles.push(tile);
        });
      });
    });
  });
  // Show all tiles in one card without headers
  return (
    <ContentCard className="-dc-goal-overview">
      <ChartContentBody>
        {fulfillResponse.config.categories?.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            {category.blocks.map((block, blockIndex) => (
              <ChartBlock key={blockIndex}>
                <ChartBlockTitle>{block.title}</ChartBlockTitle>
                <Row>
                  {block.columns.map((column, columnIndex) => (
                    <Col key={columnIndex}>
                      {column.tiles.map((tile, tileIndex) => (
                        <ChartTile
                          fulfillResponse={fulfillResponse}
                          key={`search-result-tile-${tileIndex}`}
                          placeDcids={
                            tile.comparisonPlaces
                              ? tile.comparisonPlaces
                              : placeDcids
                          }
                          tileWithFootnote={{
                            tile,
                          }}
                          statVarSpec={chartConfigCategory.statVarSpec}
                        />
                      ))}
                    </Col>
                  ))}
                </Row>
              </ChartBlock>
            ))}
          </div>
        ))}
        {tiles.map((tile, i) => (
          <ChartTile
            fulfillResponse={fulfillResponse}
            key={`search-result-tile-${i}`}
            placeDcids={
              tile.comparisonPlaces ? tile.comparisonPlaces : placeDcids
            }
            tileWithFootnote={{
              tile,
            }}
            statVarSpec={chartConfigCategory.statVarSpec}
          />
        ))}
      </ChartContentBody>
    </ContentCard>
  );
};

const ChartTile: React.FC<{
  fulfillResponse: FulfillResponse;
  statVarSpec: StatVarSpec;
  placeDcids: string[];
  tileWithFootnote: TileWithFootnote;
}> = ({ fulfillResponse, placeDcids, tileWithFootnote, statVarSpec }) => {
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

  const tile = tileWithFootnote.tile;
  const footnote = tileWithFootnote.footnote;
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
          defaultVariableName={DEFAULT_VARIABLE_NAME}
        >
          <div slot="footer">
            <ChartFootnote text={footnote} />
          </div>
          {/** @ts-ignore */}
        </datacommons-bar>
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
          defaultVariableName={DEFAULT_VARIABLE_NAME}
          timeScale="year"
        >
          <div slot="footer">
            <ChartFootnote text={footnote} />
          </div>
          {/** @ts-ignore */}
        </datacommons-line>
      </>
    );
  } else if (tile.type === "MAP") {
    const channel = `map-${tileStatVars.join("__")}`;
    component = (
      <DatacommonsMapContainer>
        {/** @ts-ignore */}
        <datacommons-map
          apiRoot={WEB_API_ENDPOINT}
          subscribe={channel}
          header={`${tile.title}*`}
          variable={tileStatVars.join(" ")}
          parentPlace={placeDcid}
          childPlaceType={childPlaceType}
          showExploreMore={placeType && !NO_MAP_TOOL_PLACE_TYPES.has(placeType)}
        >
          <div slot="footer">
            {/** @ts-ignore */}
            <datacommons-slider
              apiRoot={WEB_API_ENDPOINT}
              publish={channel}
              variable={tileStatVars.join(" ")}
              parentPlace={placeDcid}
              childPlaceType={childPlaceType}
            />
            <ChartFootnote text={footnote} />
          </div>
          {/** @ts-ignore */}
        </datacommons-map>
      </DatacommonsMapContainer>
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
        >
          <div slot="footer">
            <ChartFootnote text={footnote} />
          </div>
          {/** @ts-ignore */}
        </datacommons-gauge>
      </>
    );
  } else if (tile.type === "SCATTER") {
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-scatter
          apiRoot={WEB_API_ENDPOINT}
          header={tile.title}
          variables={tileStatVars.join(" ")}
          parentPlace={placeDcid}
          childPlaceType={childPlaceType}
          showExploreMore={true}
        >
          <div slot="footer">
            <ChartFootnote text={footnote} />
          </div>
          {/** @ts-ignore */}
        </datacommons-scatter>
      </>
    );
  } else if (tile.type === "RANKING") {
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-ranking
          header={tile.title}
          parentPlace={placeDcid}
          childPlaceType={childPlaceType}
          variable={tileStatVars.join(" ")}
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
export default SearchResults;
