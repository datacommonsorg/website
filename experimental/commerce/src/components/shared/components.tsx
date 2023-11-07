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
import { Input, Layout, Spin } from "antd";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FOOTNOTE_CHAR_LIMIT } from "../../utils/constants";
import "./components.css";

import appConfig from "../../config/appConfig.json";
import { Place } from "../../utils/types";

const SearchInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  height: 100%;

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
      border-radius: 2rem !important;
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
          src="./images/datacommons/dc-logo.png"
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
  placeholder?: string;
}> = ({ initialQuery, isSearching, onSearch, placeholder }) => {
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
          className="-dc-search-bar"
          placeholder={
            placeholder
              ? placeholder
              : 'For example, "Access to Clean Energy in Afghanistan"'
          }
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
  margin: 12px 24px;
  overflow: hidden;
`;

const PlaceTitle = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 2rem;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

const UserMessage = styled.div`
  border: 1px solid #e3e3e3;
  border-radius: 0.5rem;
  padding: 16px 24px;
`;

export const PlaceHeaderCard: React.FC<{
  places: Place[];
  userMessage?: string;
  topicNames?: string;
}> = ({ places, userMessage, topicNames }) => {
  const placeNames = places.map((p) => p.name);
  const shouldShowTopicNames = topicNames && !_.isEmpty(places);
  const showNoTopicsFoundMessage = places.length > 0 && !topicNames;
  return (
    <PlaceCard>
      <PlaceCardContent>
        {userMessage && <UserMessage>{userMessage}</UserMessage>}
        {showNoTopicsFoundMessage && (
          <UserMessage>No topics found.</UserMessage>
        )}
        <PlaceTitle>
          {placeNames.join(", ")}
          {shouldShowTopicNames ? ` • ${topicNames}` : ""}
        </PlaceTitle>
      </PlaceCardContent>
    </PlaceCard>
  );
};

// Red Dividing line under target headers
export const Divider = styled.div<{ color: string }>`
  border: 1px solid ${(p) => p.color};
  margin: 40px -24px 40px -24px;
`;

export const FootnotesContainer = styled.div`
  margin: 24px 0px;
`;

export const Footnote = styled.div`
  color: grey;
  display: flex;
  flex-direction: row;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
`;

export const FootnoteDivider = styled.hr`
  color: grey;
  margin-bottom: 24px;
`;

export const Footnotes: React.FC = () => {
  if (appConfig.footnotes.length === 0) {
    return null;
  }
  return (
    <FootnotesContainer>
      <FootnoteDivider></FootnoteDivider>
      {appConfig.footnotes.map((footnote, footnoteIndex) => (
        <Footnote key={footnoteIndex}>
          <div>{footnote}</div>
        </Footnote>
      ))}
    </FootnotesContainer>
  );
};

// Footnotes for the chart tiles
export const ChartFootnoteContainer = styled.div`
  margin: 0 24px 24px 14px;
  font-size: 0.8rem;
`;

export const ShowMoreToggle = styled.span`
  cursor: pointer;
  color: var(--link-color);
`;

export const ChartFootnote: React.FC<{ text: string | undefined }> = ({
  text,
}) => {
  const [showFullText, setShowFullText] = useState(false);
  if (!text) {
    return <></>;
  }
  const hideToggle = text.length < FOOTNOTE_CHAR_LIMIT;
  const shortText = text.slice(0, FOOTNOTE_CHAR_LIMIT);
  return (
    <ChartFootnoteContainer>
      {hideToggle || showFullText ? text : `${shortText}...`}
      <ShowMoreToggle onClick={() => setShowFullText(!showFullText)}>
        {!hideToggle && (showFullText ? " Show less" : "Show more")}
      </ShowMoreToggle>
    </ChartFootnoteContainer>
  );
};
