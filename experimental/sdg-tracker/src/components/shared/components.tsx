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

import { gray } from "@ant-design/colors";
import { SearchOutlined } from "@ant-design/icons";
import { AutoComplete, Breadcrumb, Input, Layout, Spin } from "antd";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import "./components.css";
import { IndicatorTags, useStoreState } from "../../state";
import { CaretDownOutlined } from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import { QUERY_PARAM_VARIABLE, ROOT_TOPIC } from "../../utils/constants";
import "./components.css";

const SearchInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  .info {
    align-self: flex-end;
    color: ${gray[3]};
    font-size: 11px;
    font-weight: 500;
    margin: 0 1.2rem 0rem;
    text-transform: uppercase;
  }
  .search {
    position: relative;

    input {
      padding-right: 2.25rem;
    }

    .anticon {
      color: ${gray[6]};
      cursor: pointer;
      position: absolute;
      right: 0.85rem;
      top: 0.9rem;
      z-index: 100;
    }

    .ant-spin {
      cursor: not-allowed;
      position: absolute;
      right: 0.85rem;
      top: 0.7rem;
      z-index: 100;

      .ant-spin-dot-item {
        background: ${gray[5]};
      }
    }
  }
`;

const SearchInput = styled(Input)`
  border-radius: 2rem;
  padding: 0.5rem 1rem;
`;

/**
 * Header & Footer branding link
 */
export const BrandingLink: React.FC = () => {
  return (
    <div className="branding-link-container">
      <a
        href="https://datacommons.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        Powered by Google's{" "}
        <img
          className="logo-secondary-image"
          src="/images/datacommons/dc-logo.png"
        />
      </a>
    </div>
  );
};

/**
 * Search bar for the search page and search results page
 */
export const SearchBar: React.FC<{
  initialQuery?: string;
  isSearching?: boolean;
  onSearch: (query: string) => void;
}> = ({ initialQuery, isSearching, onSearch }) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  return (
    <SearchInputContainer>
      <div className="info">Early Preview</div>
      <div className="search">
        <SearchInput
          placeholder='For example, "Access to Clean Energy in Afghanistan"'
          size="large"
          value={query}
          disabled={isSearching}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onPressEnter={() => {
            onSearch(query);
          }}
        />
        {isSearching ? (
          <Spin />
        ) : (
          <SearchOutlined
            onClick={() => {
              onSearch(query);
            }}
          />
        )}
      </div>
    </SearchInputContainer>
  );
};

export const MainLayoutContent = styled(Layout.Content)`
  padding: 0 24px 16px;
`;

/**
 * Content card for Goals / Countries page
 */
export const ContentCard = styled.div`
  margin: 0 0 1rem;
  padding: 24px;
  background: white;
  border-radius: 1rem;
`;

export const ContentCardHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 2rem;
  width: 100%;
  img {
    width: 5rem;
    height: 5rem;
    margin-right: 1.5rem;
    border-radius: 0.5rem;
  }
  h3 {
    font-size: 2rem;
    font-weight: 400;
    margin-bottom: 0.25rem;
  }
`;
export const ContentCardBody = styled.div`
  h3 {
    font-size: 2.5rem;
    font-weight: 300;
  }
`;

// Country selection dropdown
const CountrySelectContainer = styled.div`
  display: flex;
  position: relative;
  width: fit-content;
  .ant-select-selector {
    border-radius: 2rem !important;
  }
  .ant-select-selection-placeholder {
    color: black;
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

export const CountrySelect: React.FC<{
  setSelectedPlaceDcid: (selectedPlaceDcid: string) => void;
  currentPlaceName?: string;
}> = ({ setSelectedPlaceDcid, currentPlaceName }) => {
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
        placeholder={currentPlaceName || "Select a country"}
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

// Header "Place" Card for top of Country/Region Pages
const PlaceCard = styled.div`
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 0rem 0rem 1rem 1rem;
`;

const PlaceCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin: 40px;
`;

const PlaceTitle = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 2rem;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

const StyledBreadcrumb = styled(Breadcrumb)`
  li {
    display: flex;
  }
  .ant-breadcrumb-link a {
    display: block;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const PlaceHeaderCard: React.FC<{
  currentPlaceName: string | undefined;
  hidePlaceSearch: boolean | undefined;
  setSelectedPlaceDcid: (selectedPlaceDcid: string) => void;
  variableDcids: string[];
}> = ({
  currentPlaceName,
  hidePlaceSearch,
  setSelectedPlaceDcid,
  variableDcids,
}) => {
  useEffect(() => {});

  // get breadcrumbs from current location
  const location = useLocation();
  const topics = useStoreState((s) =>
    variableDcids
      .filter((dcid) => dcid in s.topics.byDcid)
      .map((dcid) => s.topics.byDcid[dcid])
  );
  const parentVariables = useStoreState((s) => {
    const parentDcids: string[] = [];
    if (topics.length !== 1) {
      return [];
    }
    let currentVariableDcid = variableDcids[0];
    const BREADCRUMB_LIMIT = 10;
    let breadcrumbIndex = 0;
    while (currentVariableDcid !== ROOT_TOPIC) {
      // This avoids the possibility of an infinite loop
      breadcrumbIndex++;
      if (breadcrumbIndex > BREADCRUMB_LIMIT) {
        break;
      }
      if (!(currentVariableDcid in s.topics.byDcid)) {
        break;
      }
      currentVariableDcid = s.topics.byDcid[currentVariableDcid].parentDcids[0];
      parentDcids.unshift(currentVariableDcid);
    }
    return parentDcids.map((parentDcid) => s.topics.byDcid[parentDcid]);
  });
  const shouldHideBreadcrumbs =
    topics.length == 1 && topics[0].dcid === ROOT_TOPIC;
  return (
    <PlaceCard>
      <PlaceCardContent>
        {currentPlaceName === "World" ? (
          <PlaceTitle>World</PlaceTitle>
        ) : (
          !hidePlaceSearch && (
            <CountrySelect
              setSelectedPlaceDcid={setSelectedPlaceDcid}
              currentPlaceName={currentPlaceName}
            />
          )
        )}
        {!shouldHideBreadcrumbs && (
          <StyledBreadcrumb>
            {[...parentVariables, ...(topics.length === 1 ? topics : [])]
              .filter((v) => v)
              .map((v, i) => {
                const searchParams = new URLSearchParams(location.search);
                searchParams.set(QUERY_PARAM_VARIABLE, v.dcid);
                return (
                  <Breadcrumb.Item key={i}>
                    <Link
                      to={"/countries?" + searchParams.toString()}
                      title={v.name}
                    >
                      {v.name}
                    </Link>
                  </Breadcrumb.Item>
                );
              })}
          </StyledBreadcrumb>
        )}
      </PlaceCardContent>
    </PlaceCard>
  );
};

// Headline callouts for each of the indicators
const HeadlineContainer = styled.div`
  background-color: rgba(250, 0, 49, 0.05);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  padding: 16px;
`;

const HeadlineText = styled.div`
  font-size: 22px;
  font-weight: 400;
  line-height: 28px;
  color: #444746;
`;

const HeadlineLink = styled.div`
  margin-left: auto;
  width: fit-content;
`;

export const HeadlineTile: React.FC<{ indicator: string }> = ({
  indicator,
}) => {

  const indicatorHeadlines = useStoreState((s) => s.indicatorHeadlines);
  const headlineData = indicatorHeadlines.byIndicator[indicator];

  if (!headlineData) {
    return <></>;
  }
  return (
    <HeadlineContainer>
      <HeadlineText>{headlineData.headline}</HeadlineText>
      <HeadlineLink>
        <a href={headlineData.link}>Read more</a>
      </HeadlineLink>
    </HeadlineContainer>
  );
};

// Header for a target
const TargetIdBox = styled.div`
  border-radius: 16px;
  border: 2px solid #FA0031;
  color: #FA0031;
  padding: 2px;
  width: 72px;
  height: 72px;
  justify-content: center;
  align-items: center;
  display: flex;
  font-size: 24px;
  font-weight: 400;
  line-height: 40px;

`;

const TargetText = styled.div`
  color: #444746;
  font-size: 22px;
  font-style: normal;
  font-weight: 400;
  line-height: 28px;
  margin-top: 24px;
`;

export const TargetHeader: React.FC<{ target: string}> = ({
  target,
}) => {
  
  const targetDescriptions = useStoreState((s) => s.targetText);
  const targetText = targetDescriptions.byTarget[target];

  return (
    <>
      <TargetIdBox>{target}</TargetIdBox>
      <TargetText>{targetText}</TargetText>
    </>
  );
};

// Red Dividing line under target headers
export const RedDivider = styled.div`
  border: 1px solid #FA0031;
  margin: 40px -24px 40px -24px;
`;
