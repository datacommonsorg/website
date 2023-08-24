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

import { CaretDownOutlined, LoadingOutlined } from "@ant-design/icons";
import { AutoComplete, Breadcrumb, Layout, Spin } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import styled from "styled-components";
import { useStoreActions, useStoreState } from "../../state";
import {
  QUERY_PARAM_VARIABLE,
  ROOT_VARIABLE_GROUP,
  WEB_API_ENDPOINT,
} from "../../utils/constants";
import {
  ChartConfigCategory,
  ChartConfigTile,
  FulfillResponse,
} from "../../utils/types";
import { SearchBar } from "../layout/components";

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
const PlaceChipsContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0 24px;
  margin: 0 0 1rem;
`;
const PlaceChip = styled.div<{ selected?: boolean }>`
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  background: white;
  border: 1px solid #e9e9e9;
  cursor: pointer;
  display: flex;
  align-items: center;
  svg {
    margin-left: 0.25rem;
  }
  ${(p) =>
    p.selected
      ? `background: #e1e1e1;
    border: 1px solid #dcdcdc;`
      : null}

  &:hover {
    background: #e1e1e1;
    border: 1px solid #dcdcdc;
  }
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
const StyledBreadcrumb = styled(Breadcrumb)`
  margin: 16px 0;
  padding: 0 24px;
  .ant-breadcrumb-link {
    max-width: 300px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

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
  const variables = useStoreState((s) =>
    variableDcids
      .filter((dcid) => dcid in s.variableGroups.byDcid)
      .map((dcid) => s.variableGroups.byDcid[dcid])
  );
  const parentVariables = useStoreState((s) => {
    const parentDcids: string[] = [];
    if (variables.length !== 1) {
      return [];
    }
    const variableDcid = variableDcids[0];
    let currentVariableDcid = variableDcids[0];
    while (currentVariableDcid !== ROOT_VARIABLE_GROUP) {
      if (!(currentVariableDcid in s.variableGroups.byDcid)) {
        break;
      }
      currentVariableDcid =
        s.variableGroups.byDcid[currentVariableDcid].parentGroupDcids[0];
      parentDcids.unshift(currentVariableDcid);
    }
    // Remove root group
    parentDcids.shift();
    s.variableGroups.byDcid[variableDcid];
    return parentDcids.map((parentDcid) => s.variableGroups.byDcid[parentDcid]);
  });
  const location = useLocation();
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

        <PlaceTitle>
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
        <StyledBreadcrumb>
          {[...parentVariables, ...(variables.length === 1 ? variables : [])]
            .filter((v) => v)
            .map((v, i) => {
              const searchParams = new URLSearchParams(location.search);
              searchParams.set(QUERY_PARAM_VARIABLE, v.dcid);
              return (
                <Breadcrumb.Item key={i}>
                  <Link to={"#/countries?" + searchParams.toString()}>
                    {v.name}
                  </Link>
                </Breadcrumb.Item>
              );
            })}
        </StyledBreadcrumb>
        <div style={{ display: "none" }}>
          <PlaceChips
            includeWorld={false}
            includeRegions={false}
            selectedPlaceDcid={placeDcid}
            setSelectedPlaceDcid={setPlaceDcid}
          />
        </div>
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

const PlaceChips: React.FC<{
  includeWorld: boolean;
  includeRegions: boolean;
  selectedPlaceDcid?: string;
  setSelectedPlaceDcid: (placeDcid: string) => void;
}> = ({
  includeWorld,
  includeRegions,
  selectedPlaceDcid,
  setSelectedPlaceDcid,
}) => {
  const regions = useStoreState((s) =>
    s.regions.dcids.map((dcid) => s.regions.byDcid[dcid])
  );
  return (
    <PlaceChipsContainer>
      <CountrySelect setSelectedPlaceDcid={setSelectedPlaceDcid} />
      {includeRegions &&
        regions
          .filter((region) => (!includeWorld ? region.dcid !== "Earth" : true))
          .map((region) => (
            <PlaceChip
              key={region.dcid}
              selected={region.dcid === selectedPlaceDcid}
              onClick={() => {
                setSelectedPlaceDcid(region.dcid);
              }}
            >
              {region.name}
            </PlaceChip>
          ))}
    </PlaceChipsContainer>
  );
};

const CountrySelectContainer = styled.div`
  display: flex;
  position: relative;
  .ant-select-selector {
    border-radius: 2rem !important;
  }
  svg {
    position: absolute;
    right: 0.8rem;
    top: 0.8rem;
    font-size: 1rem;
  }
`;
const CountrySelectNoResults = styled.div`
  padding: 5px 12px;
`;
const CountrySelect: React.FC<{
  setSelectedPlaceDcid: (selectedPlaceDcid: string) => void;
}> = ({ setSelectedPlaceDcid }) => {
  const [isFocused, setIsFocused] = useState(false);
  const countries = useStoreState((s) =>
    s.countries.dcids.map((dcid) => s.countries.byDcid[dcid])
  );

  const [value, setValue] = useState("");

  useEffect(() => {});

  return (
    <CountrySelectContainer>
      <AutoComplete
        size="large"
        value={isFocused ? value : ""}
        style={{ width: 225 }}
        options={countries.map((c) => ({ value: c.name, dcid: c.dcid }))}
        placeholder="Select country"
        defaultActiveFirstOption={true}
        notFoundContent={
          <CountrySelectNoResults>No results found</CountrySelectNoResults>
        }
        filterOption={(inputValue, option) =>
          option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !==
            -1 ||
          option!.dcid.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
        }
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        onChange={(value, option) => {
          setValue(value);
          if ("dcid" in option) {
            setSelectedPlaceDcid(option.dcid);
            setValue("");
          }
        }}
      />
      <CaretDownOutlined />
    </CountrySelectContainer>
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
          />
        ))}
    </>
  );
};

const ChartCategoryContent: React.FC<{
  chartConfigCategory: ChartConfigCategory;
  placeDcid: string;
}> = ({ chartConfigCategory, placeDcid }) => {
  const rootTopics = useStoreState((s) => s.rootTopics);

  const matches = chartConfigCategory.dcid?.match(/dc\/topic\/sdg_(\d\d?)/);

  const rootTopicIndex =
    matches && matches.length > 1 ? Number(matches[1]) - 1 : -1;

  const sdgTopic = rootTopicIndex !== -1 ? rootTopics[rootTopicIndex] : null;

  chartConfigCategory.dcid;
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
      {sdgTopic ? (
        <ChartContentHeader>
          <img src={sdgTopic.iconUrl} />
          <div>
            <h3>{sdgTopic.name}</h3>
            <div>{sdgTopic.description}</div>
          </div>
        </ChartContentHeader>
      ) : null}

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
    component = (
      <>
        {/** @ts-ignore */}
        <datacommons-map
          apiRoot={WEB_API_ENDPOINT}
          header={tile.title}
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
