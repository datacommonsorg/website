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

import { red } from "@ant-design/colors";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import appConfig from "../../config/appConfig.json";
import { dataCommonsClient } from "../../state";
import { formatUserMessage } from "../../utils";
import { QUERY_PARAM_QUERY } from "../../utils/constants";
import { theme } from "../../utils/theme";
import { FulfillResponse } from "../../utils/types";
import SearchResults from "../search/SearchResults";
import AppHeader from "../shared/AppHeader";
import AppLayoutContent from "../shared/AppLayoutContent";
import { SearchBar } from "../shared/components";

const SearchContainer = styled.div`
  color: #414042;
  margin: 0 auto;
  h3 {
    font-size: 1.5rem;
    font-weight: 400;
    margin: auto;
    margin-bottom: 2rem;
    text-align: center;
  }
  h4 {
    font-size: 16px;
    font-weight: 500;
    line-height: 24px;
    letter-spacing: 0em;
    text-align: center;
    position: relative;
    border-bottom: 1px solid #999;
  }
  p {
    font-size: 1rem;
    font-weight: 500;
    margin: auto;
    margin-bottom: 1.5rem;
    text-align: center;
  }
`;

const SearchTop = styled.div`
  background-image: url("./images/doc_hero.png");
  background-position: center;
  background-size: cover;
  padding: 4rem 2rem 4rem;
  box-shadow: 0px 0px 15px #666666;

  h3 {
    color: inherit;
    font-size: 36px;
    font-weight: 700;
  }
  p {
    color: inherit;
    font-size: 16px;
    font-weight: 400;
  }
`;

const StyledSubheader = styled.span`
  display: block;
  margin: 0 auto 2.5rem auto;
  max-width: 720px;

  h4 span {
    background-color: white;
    color: inherit;
    padding: 0 12px;
    position: relative;
    top: 12px;
  }
`;

const ErrorMessage = styled.div`
  margin: auto;
  margin-bottom: 2rem;
  text-align: center;
  max-width: 450px;
  font-weight: 500;
  font-size: 1rem;
  color: ${red[6]};
`;

const SearchLinks = styled.div`
  margin: 5rem auto;
  padding: 0 2rem;
`;

const StyledLinkContainer = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 18px;
`;

const IconSquare = styled.div<{ color: string }>`
  background: ${(p) => p.color};
  height: 14px;
  flex-shrink: 0;
  margin: 4px 14px 4px 0;
  width: 14px;
`;
const StyledLink = styled(Link)`
  break-inside: avoid;
  color: inherit;
  display: block;
  font-size: 0.95rem;
  line-height: 22px;

  &:hover {
    color: #141414;
    text-decoration: underline;
  }
`;

const LinkGroup = styled.div`
  column-count: 2;
  gap: 2rem;
  margin: 0 auto 2rem auto;
  max-width: 720px;

  @media (max-width: 650px) {
    column-count: 1;
  }
`;

const SearchBarContainer = styled.div`
  margin: auto;
  text-align: center;
  max-width: 525px;
`;

const SearchResultsContainer = styled.div`
  overflow: auto;
`;

const Search = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [variableDcids, setVariableDcids] = useState<string[]>([]);
  const [placeDcids, setPlaceDcids] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [fulfillResponse, setFulfillResponse] = useState<FulfillResponse>();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const searchParamQuery = searchParams.get(QUERY_PARAM_QUERY);

  useEffect(() => {
    setQuery(searchParamQuery || "");
    if (searchParamQuery) {
      search(searchParamQuery);
    } else {
      setVariableDcids([]);
      setPlaceDcids([]);
    }
  }, [searchParamQuery]);

  const search = useCallback(
    async (searchQuery?: string) => {
      setIsSearching(true);
      setErrorMessage("");
      setUserMessage("");
      setVariableDcids([]);
      setPlaceDcids([]);
      setFulfillResponse(undefined);
      const context = fulfillResponse ? fulfillResponse.context : undefined;

      try {
        const fulfillResponse = await dataCommonsClient.detectAndFulfill(
          searchQuery || query,
          context
        );

        setFulfillResponse(fulfillResponse);
        setIsSearching(false);

        if (fulfillResponse.failure) {
          setErrorMessage(
            fulfillResponse.failure || fulfillResponse.userMessage
          );
          return;
        }
        if (fulfillResponse.place.dcid === "") {
          setErrorMessage(
            `Your search for "${
              searchQuery || query
            }" did not match any documents.`
          );
          return;
        }
        const formattedUserMessage = formatUserMessage(
          fulfillResponse.userMessage
        );
        setUserMessage(formattedUserMessage);

        const variableDcids =
          fulfillResponse?.relatedThings?.mainTopics?.map((e) => e.dcid) || [];
        const placesDcids = fulfillResponse?.places?.map((e) => e.dcid) || [];
        setVariableDcids(variableDcids);
        setPlaceDcids(placesDcids);
        if (variableDcids.length === 0 || placesDcids.length === 0) {
          setErrorMessage(
            "Sorry, we couldn't find any data related to the place or topic you searched for. Please try another query."
          );
        }
      } catch (e) {
        setIsSearching(false);
        setErrorMessage(
          `Your search for "${searchQuery || query}" returned an error.`
        );
      }
    },
    [fulfillResponse, query, searchParamQuery]
  );

  if (!searchParamQuery) {
    return (
      <>
        <AppLayoutContent style={{ overflow: "auto" }}>
          <AppHeader />
          <SearchContainer>
            <SearchTop>
              <SearchBarContainer>
                <SearchBar
                  initialQuery={query}
                  isSearching={isSearching}
                  onSearch={(q) => {
                    const searchParams = new URLSearchParams();
                    searchParams.set(QUERY_PARAM_QUERY, q);
                    navigate(`search?${searchParams.toString()}`);
                  }}
                  placeholder={appConfig.placeholderQuery}
                />
              </SearchBarContainer>
              {errorMessage ? (
                <ErrorMessage>{errorMessage}</ErrorMessage>
              ) : null}
            </SearchTop>
            <SearchLinks>
              <StyledSubheader>
                <h3>{appConfig.homepage.pageHeader}</h3>
                <h4>
                  <span>Sample queries</span>
                </h4>
              </StyledSubheader>
              <LinkGroup>
                {appConfig.sampleQueries.general.map((query, i) => (
                  <StyledLinkContainer key={i}>
                    <IconSquare color={theme.colors.primary} />
                    <StyledLink
                      className={`-dc-search-example`}
                      to={`${location.pathname}?q=${query}`}
                    >
                      {query}
                    </StyledLink>
                  </StyledLinkContainer>
                ))}
              </LinkGroup>
              <StyledSubheader>
                <h4>
                  <span>Try diving deeper</span>
                </h4>
              </StyledSubheader>
              <LinkGroup>
                {appConfig.sampleQueries.specific.map((query, i) => (
                  <StyledLinkContainer key={i}>
                    <IconSquare color={theme.colors.primary} />
                    <StyledLink
                      className={`-dc-search-example`}
                      to={`${location.pathname}?q=${query}`}
                    >
                      {query}
                    </StyledLink>
                  </StyledLinkContainer>
                ))}
              </LinkGroup>
              <StyledSubheader>
                <h4>
                  <span>Combine and compare data</span>
                </h4>
              </StyledSubheader>
              <LinkGroup>
                {appConfig.sampleQueries.comparison.map((query, i) => (
                  <StyledLinkContainer key={i}>
                    <IconSquare color={theme.colors.primary} />
                    <StyledLink
                      className={`-dc-search-example`}
                      to={`${location.pathname}?q=${query}`}
                    >
                      {query}
                    </StyledLink>
                  </StyledLinkContainer>
                ))}
              </LinkGroup>
            </SearchLinks>
          </SearchContainer>
        </AppLayoutContent>
      </>
    );
  }

  return (
    <>
      <AppLayoutContent style={{ display: "flex", flexDirection: "column" }}>
        <AppHeader />
        <SearchResultsContainer>
          <SearchResults
            errorMessage={errorMessage}
            showNLSearch={true}
            query={query}
            fulfillResponse={fulfillResponse}
            isFetchingFulfillment={isSearching}
            onSearch={(q) => {
              const searchParams = new URLSearchParams();
              searchParams.set(QUERY_PARAM_QUERY, q);
              navigate(`search?${searchParams.toString()}`);
            }}
            userMessage={userMessage}
            variableDcids={variableDcids}
            placeDcids={placeDcids}
          />
        </SearchResultsContainer>
      </AppLayoutContent>
    </>
  );
};
export default Search;
