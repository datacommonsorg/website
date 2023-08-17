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
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { dataCommonsClient } from "../../state";
import { QUERY_PARAM_QUERY } from "../../utils/constants";
import CountriesContent from "../countries/CountriesContent";
import AppFooter from "../layout/AppFooter";
import AppHeader from "../layout/AppHeader";
import AppLayout from "../layout/AppLayout";
import AppLayoutContent from "../layout/AppLayoutContent";
import { SearchBar } from "../layout/components";

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
  text-align: center;
`;
const StyledLink = styled(Link)`
  font-size: 1rem;
  border-radius: 2rem;
  display: block;
  padding: 0.5rem 0.75rem;
  border: 1px solid #f1f1f1;
  &:hover {
    text-decoration: none;
    background: #f1f1f1;
  }
`;

const LinkGroup = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin: auto;
  margin-bottom: 2rem;
  max-width: 650px;
  text-align: center;
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
  const [searchParams] = useSearchParams();
  const searchParamQuery = searchParams.get(QUERY_PARAM_QUERY);
  const navigate = useNavigate();

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
                  navigate("/search?" + searchParams.toString());
                }}
              />
            </SearchBarContainer>
            {errorMessage ? <ErrorMessage>{errorMessage}</ErrorMessage> : null}
            <SearchLinks>
              <p>Sample queries:</p>
              <LinkGroup>
                {QUERIES.general.map((q, i) => (
                  <StyledLink key={i} to={`/search?q=${q}`}>
                    {q}
                  </StyledLink>
                ))}
              </LinkGroup>
              <p>Try diving deeper:</p>
              <LinkGroup>
                {QUERIES.specific.map((q, i) => (
                  <StyledLink key={i} to={`/search?q=${q}`}>
                    {q}
                  </StyledLink>
                ))}
              </LinkGroup>
              <p>Combine and compare data:</p>
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
                navigate("/search?" + searchParams.toString());
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
