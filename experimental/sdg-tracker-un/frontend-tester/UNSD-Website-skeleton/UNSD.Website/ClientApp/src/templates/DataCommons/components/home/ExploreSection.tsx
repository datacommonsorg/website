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

import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { QUERY_PARAM_QUERY, SAMPLE_NL_QUERY } from "../../utils/constants";
import { SearchBar } from "../shared/components";
import {
  HomeSearchContainer,
  HomeSection,
  SectionDescription,
  SectionHeader,
} from "./components";

const Container = styled(HomeSection)`
  background-image: url(./images/datacommons/explore-background.png);
  background-color: #005677;
  flex-shrink: 0;
  gap: 36px;

  .description {
    color: #fff;
    text-align: center;
    text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.15);
    font-size: 30px;
    font-weight: 400;
    line-height: 50px;
    max-width: 706px;
  }
`;

const Header = styled(SectionHeader)`
  color: #fff;
`;

const Description = styled(SectionDescription)`
  color: #fff;
`;

const SearchBarContainer = styled(HomeSearchContainer)`
  .info {
    display: none;
  }

  .search {
    height: 100%;

    input {
      height: 100%;
      border-radius: 30px !important;
      font-size: 16px;
      padding-left: 40px;
      padding-right: 70px;
    }
  }

  .anticon.anticon-search {
    background-image: url(./images/datacommons/sdg-goals-icon.svg});
    background-repeat: no-repeat;
    height: 100%;
    width: 45px;
    background-position: center;
    top: 0;

    svg {
      display: none;
    }
  }
`;

export const ExploreSection = () => {
  const history = useHistory();

  return (
    <Container>
      <Header>Explore UN Data Commons for the SDGs</Header>
      <SearchBarContainer>
        <SearchBar
          initialQuery={SAMPLE_NL_QUERY}
          isSearching={false}
          onSearch={(q) => {
            const searchParams = new URLSearchParams();
            searchParams.set(QUERY_PARAM_QUERY, q);
            history.push(`/search?${searchParams.toString()}`);
          }}
        />
      </SearchBarContainer>
      <Description>
        Delve into SDG data and insights with precision - where your questions
        lead the way!
      </Description>
    </Container>
  );
};
