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
import { Input, Spin } from "antd";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
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
