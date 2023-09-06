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
import { AutoComplete, Breadcrumb, Input, Spin } from "antd";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import "./components.css";
import { useStoreState } from "../../state";
import { CaretDownOutlined } from "@ant-design/icons";
import { FulfillResponse } from "../../utils/types";
import { Link, useLocation } from "react-router-dom";
import { QUERY_PARAM_VARIABLE, ROOT_TOPIC } from "../../utils/constants";

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
