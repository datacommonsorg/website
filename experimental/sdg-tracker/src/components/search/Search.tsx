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

import { gray, red } from "@ant-design/colors";
import { Layout } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { dataCommonsClient } from "../../state";
import { QUERY_PARAM_QUERY } from "../../utils/constants";
import CountriesContent from "../countries/CountriesContent";
import AppFooter from "../shared/AppFooter";
import AppHeader from "../shared/AppHeader";
import AppLayout from "../shared/AppLayout";
import AppLayoutContent from "../shared/AppLayoutContent";
import { SearchBar } from "../shared/components";

const QUERIES = {
  general: [
    "Hunger in Nigeria",
    "Poverty in Mexico",
    "Progress on health related goals in Pakistan",
    "SDG goals on gender equality across the world",
  ],
  specific: [
    "Women in managerial positions in India",
    "Access to clean drinking water in Mexico",
    "Access to primary school education in Afghanistan",
    "How is the world combating unregulated fishing?",
    "How has access to electricity improved in Kenya?",
    "How has informal employment changed over time in Bangladesh?",
    "How much food goes wasted around the world?",
  ],
  comparison: [
    "Compare progress on poverty in Mexico, Nigeria and Pakistan",
    "Compare SDG goals on climate change between Brazil, China and India",
    "Violence vs poverty across the world",
  ],
};

const SearchContainer = styled.div`
  color: #414042;
  margin: 4rem auto;
  padding: 0 2rem;
  h3 {
    font-size: 1.5rem;
    font-weight: 400;
    margin: auto;
    margin-bottom: 2rem;
    text-align: center;
    max-width: 600px;
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
    max-width: 600px;
    text-align: center;
  }
  .subtext {
    margin: auto;
    max-width: 600px;
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600px;
    color: ${gray[4]};
  }
`;

const StyledSubheader = styled.span`
  display: block;
  margin: 0 auto 16px auto;
  max-width: 650px;

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
  margin: auto;
`;
const StyledLink = styled(Link)`
  color: inherit;
  font-size: .95rem;
  line-height: 1.2;
  border-radius: 2rem;
  display: block;
  padding: 0.5rem 0;
  margin-left: 1.5rem;
  break-inside: avoid;

  &::before {
    content: "■";
    margin-left: -1.5rem;
    padding-right: .5rem;
  }

  &:hover {
    color: inherit;
    text-decoration: none;
  }
`;

const LinkGroup = styled.div`
  column-count: 2;
  gap: 2rem;
  margin: 0 auto 2rem auto;
  max-width: 650px;

  @media (max-width: 650px) {
    column-count: 1;
  }
`;

const SearchBarContainer = styled.div`
  margin: auto;
  margin-bottom: 2rem;
  text-align: center;
  max-width: 450px;
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
            <h3>SDG Data Commons Search</h3>
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
              />
            </SearchBarContainer>
            {errorMessage ? <ErrorMessage>{errorMessage}</ErrorMessage> : null}
            <SearchLinks>
              <StyledSubheader>
                <h4><span>Sample queries</span></h4>
              </StyledSubheader>
              <LinkGroup>
                {QUERIES.general.map((q, i) => (
                  <StyledLink key={i} to={`/search?q=${q}`}>
                    {q}
                  </StyledLink>
                ))}
              </LinkGroup>
              <StyledSubheader>
                <h4><span>Try diving deeper</span></h4>
              </StyledSubheader>
              <LinkGroup>
                {QUERIES.specific.map((q, i) => (
                  <StyledLink key={i} to={`/search?q=${q}`}>
                    {q}
                  </StyledLink>
                ))}
              </LinkGroup>
              <StyledSubheader>
                <h4><span>Combine and compare data</span></h4>
              </StyledSubheader>
              <LinkGroup>
                {QUERIES.comparison.map((q, i) => (
                  <StyledLink key={i} to={`/search?q=${q}`}>
                    {q}
                  </StyledLink>
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
