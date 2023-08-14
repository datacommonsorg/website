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
import { Input } from "antd";
import styled from "styled-components";
import AppFooter from "../layout/AppFooter";
import AppHeader from "../layout/AppHeader";
import AppLayout from "../layout/AppLayout";
import AppLayoutContent from "../layout/AppLayoutContent";

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

const SearchInputContainer = styled.div`
  margin: auto;
  margin-bottom: 2rem;
  text-align: center;
`;

const SearchInput = styled(Input)`
  border-radius: 2rem;
  padding: 0.5rem 1rem;
  max-width: 450px;
`;

/** 
 * TODO: Add these back in once search is working
const SearchLinks = styled.div`
  margin: auto;
  text-align: center;
`;
const LinkItem = styled.div`
  margin-bottom: 1.5rem;
`;
const StyledLink = styled(Link)`
  font-size: 1rem;
  border-radius: 2rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #f1f1f1;
  pointer- &:hover {
    text-decoration: none;
    background: #f1f1f1;
  }
`;
*/
const Search = () => {
  // Placeholder text when enabled: 'For example, "Access to Clean Energy in Afghanistan"'

  return (
    <AppLayout>
      <AppHeader selected="search" />
      <AppLayoutContent>
        <SearchContainer>
          <h3>SDG Data Commons Search</h3>
          <p>Find SDG-related data about a place or region.</p>
          <SearchInputContainer>
            <SearchInput
              placeholder="Coming soon..."
              disabled
              allowClear
              size="large"
            />
          </SearchInputContainer>
          {/** 
           * TODO: Add these back in once search is working
          <SearchLinks>
            <p>Sample queries</p>
            <LinkItem>
              <StyledLink to="/countries?q=Access to clean energy in Afghanistan">
                Access to clean energy in Afghanistan
              </StyledLink>
            </LinkItem>
            <LinkItem>
              <StyledLink to="/countries?q=Poverty in Sub-Saharan Africa">
                Poverty in Sub-Saharan Africa
              </StyledLink>
            </LinkItem>
          </SearchLinks>
          */}
        </SearchContainer>
      </AppLayoutContent>
      <AppFooter />
    </AppLayout>
  );
};
export default Search;
