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

import styled from "styled-components";
import backgroundImg from "../../../public/images/datacommons/explore-background.png";
import { SearchBar } from "../layout/components";
import { QUERY_PARAM_QUERY } from "../../utils/constants";
import searchIcon from "../../../public/images/datacommons/sdg-goals-icon.svg";
import { useHistory } from "react-router-dom";

const Container = styled.div`
  font-family: Roboto;
  background-image: url(${backgroundImg});
  background-color: #005677;
  height: 842px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 50px;

  h3 {
    color: #FFF;
    text-align: center;
    text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.15);
    font-size: 64px;
    font-weight: 700;
    line-height: 84px;
    max-width: 776px;
    margin-bottom: 0;
  }

  .description {
    color: #FFF;
    text-align: center;
    text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.15);
    font-size: 30px;
    font-weight: 400;
    line-height: 50px;
    max-width: 706px;
  }
`

const SearchBarContainer = styled.div`
  max-width: 885px;
  width: 90%;

  .info {
    color: #FFF;
  }

  .search {
    height: 83px;

    input {
      height: 100%;
      border-radius: 67.5px;
      font-size: 32px;
      padding-left: 53px;
      padding-right: 70px; 
    }
  }

  .anticon.anticon-search {
    background-image: url(${searchIcon});
    background-repeat: no-repeat;
    height: 100%;
    width: 45px;
    background-position: center;
    top: 0;

    svg {
      display: none;
    }
  }
`

export const ExploreSection = () => {
  const history = useHistory();

  return (
    <Container>
      <h3>Explore UN Data Commons for the SDGs</h3>
      <SearchBarContainer>
      <SearchBar
        initialQuery="What is the global poverty rate?"
        isSearching={false}
        onSearch={(q) => {
          const searchParams = new URLSearchParams();
          searchParams.set(QUERY_PARAM_QUERY, q);
          history.push(`/search?${searchParams.toString()}`);
        }}
      />
      </SearchBarContainer>
      <div className="description">Delve into SDG data and insights with precision - where your questions lead the way!</div>
    </Container>
  )
}