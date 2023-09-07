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
import { Layout } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { dataCommonsClient } from "../../state";
import { QUERY_PARAM_QUERY } from "../../utils/constants";
import { theme } from "../../utils/theme";
import CountriesContent from "../countries/CountriesContent";
import AppFooter from "../shared/AppFooter";
import AppHeader from "../shared/AppHeader";
import AppLayout from "../shared/AppLayout";
import AppLayoutContent from "../shared/AppLayoutContent";
import { SearchBar } from "../shared/components";

const QUERIES = {
  general: [
    {
      goal: 2,
      query: "Hunger in Nigeria",
    },
    {
      goal: 5,
      query: "Gender equality across the world",
    },
    {
      goal: 1,
      query: "Poverty in Mexico",
    },
    {
      goal: 3,
      query: "Progress on health related goals in Pakistan",
    },
  ],
  specific: [
    {
      goal: 5,
      query: "Women in managerial positions in India",
    },
    {
      goal: 4,
      query: "Access to primary school education in Afghanistan",
    },
    {
      goal: 7,
      query: "How has access to electricity improved in Kenya?",
    },
    {
      goal: 2,
      query: "How much food goes wasted around the world?",
    },
    {
      goal: 6,
      query: "Access to clean drinking water in Mexico",
    },
    {
      goal: 14,
      query: "How is the world combating unregulated fishing?",
    },
    {
      goal: 8,
      query: "How has informal employment changed over time in Bangladesh?",
    },
  ],
  comparison: [
    {
      goal: 1,
      query: "Compare progress on poverty in Mexico, Nigeria and Pakistan",
    },
    {
      goal: 16,
      query: "Violence vs poverty across the world",
    },
    {
      goal: 13,
      query:
        "Compare SDG goals on climate change between Brazil, China and India",
    },
  ],
};

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
  background-image: url("./images/datacommons/search-background.png");
  background-size: 100% auto;
  padding: 8rem 2rem 8rem;

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

const ColorBar = styled.div`
  background-image: url("./images/datacommons/sdg-color-bar.png");
  background-size: 100% auto;
  height: 10px;
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
const Search = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [variableDcids, setVariableDcids] = useState<string[]>([]);
  const [placeDcids, setPlaceDcids] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const location = useLocation();
  const history = useHistory();
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
      const responseObj = await dataCommonsClient.detect(searchQuery || query);
      setIsSearching(false);

      if (responseObj.failure) {
        setErrorMessage(responseObj.failure);
        setVariableDcids([]);
        setPlaceDcids([]);
      }
      setVariableDcids(responseObj.variables || []);
      setPlaceDcids(responseObj.entities || []);
      if (
        !responseObj.variables ||
        responseObj.variables.length === 0 ||
        !responseObj.entities ||
        responseObj.entities.length === 0
      ) {
        setErrorMessage(
          "Sorry, we couldn't find any data related to the place or topic you searched for. Please try another query."
        );
      }
    },
    [query]
  );

  if (variableDcids.length === 0 || placeDcids.length === 0) {
    return (
      <AppLayout>
        <AppHeader selected="search" />
        <AppLayoutContent style={{ overflow: "auto" }}>
          <SearchContainer>
            <SearchTop>
              <h3>Explore UN Data Commons for the SDGs</h3>
              <p>Find SDG-related data about a place or region.</p>

              <SearchBarContainer>
                <SearchBar
                  initialQuery={query}
                  isSearching={isSearching}
                  onSearch={(q) => {
                    const searchParams = new URLSearchParams();
                    searchParams.set(QUERY_PARAM_QUERY, q);
                    history.push("/search?" + searchParams.toString());
                  }}
                  placeholder={"What is the global poverty rate?"}
                />
              </SearchBarContainer>
              {errorMessage ? (
                <ErrorMessage>{errorMessage}</ErrorMessage>
              ) : null}
            </SearchTop>
            <ColorBar />
            <SearchLinks>
              <StyledSubheader>
                <h4>
                  <span>Sample queries</span>
                </h4>
              </StyledSubheader>
              <LinkGroup>
                {QUERIES.general.map((q, i) => (
                  <StyledLinkContainer>
                    <IconSquare color={theme.sdgColors[q.goal - 1]} />
                    <StyledLink key={i} to={`/search?q=${q.query}`}>
                      {q.query}
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
                {QUERIES.specific.map((q, i) => (
                  <StyledLinkContainer>
                    <IconSquare color={theme.sdgColors[q.goal - 1]} />
                    <StyledLink key={i} to={`/search?q=${q.query}`}>
                      {q.query}
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
                {QUERIES.comparison.map((q, i) => (
                  <StyledLinkContainer>
                    <IconSquare color={theme.sdgColors[q.goal - 1]} />
                    <StyledLink key={i} to={`/search?q=${q.query}`}>
                      {q.query}
                    </StyledLink>
                  </StyledLinkContainer>
                ))}
              </LinkGroup>
            </SearchLinks>
          </SearchContainer>
        </AppLayoutContent>
        <AppFooter />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AppHeader selected="search" />
      <AppLayoutContent style={{ display: "flex", flexDirection: "column" }}>
        <Layout style={{ height: "100%", flexGrow: 1, flexDirection: "row" }}>
          <Layout style={{ overflow: "auto" }}>
            <CountriesContent
              showNLSearch={true}
              hidePlaceSearch={true}
              query={query}
              onSearch={(q) => {
                const searchParams = new URLSearchParams();
                searchParams.set(QUERY_PARAM_QUERY, q);
                history.push("/search?" + searchParams.toString());
              }}
              variableDcids={variableDcids}
              placeDcid={placeDcids[0]}
              setPlaceDcid={(placeDcid: string) => {
                setPlaceDcids([placeDcid]);
              }}
            />
          </Layout>
        </Layout>
      </AppLayoutContent>
      <AppFooter />
    </AppLayout>
  );
};
export default Search;
