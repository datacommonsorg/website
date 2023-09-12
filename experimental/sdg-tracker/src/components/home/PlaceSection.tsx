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
import { CountrySelect } from "../shared/components";
import { HomeSection } from "./components";

const Container = styled(HomeSection)`
  border-top: 0.5px solid #ABABAB;
  border-bottom: 0.5px solid #ABABAB;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 4px 4px 8px 0px rgba(0, 0, 0, 0.15);
`;

const PlaceSearchContainer = styled.div`
  max-width: 775px;
  display: flex;
  flex-direction: column;
  gap: 37px;

  .title {
    color: rgba(0, 0, 0, 0.79);
    font-size: 22px;
    font-weight: 600;
  }

  .footer {
    color: #414042;
    font-size: 22px;
    font-weight: 400;
    line-height: 36px;
    width: 100%;
  }

  .search-bar-container {
    width: 100%;

    svg {
      display: none;
    }

    .ant-select {
      .ant-select-selector {
        height: 100%;
        display: flex;
        align-items: center;
        font-size: 24px;
        border-radius: 30px;
  
        .ant-select-selection-search {
          height: 100%;
          display: flex;
          align-items: center;
  
          input {
            height: fit-content;
            padding-left: 30px;
          }
        }
  
        .ant-select-selection-placeholder {
          height: fit-content;
          font-style: italic;
          padding-left: 30px;
        }
      }
    }
  }
`;

export const PlaceSection = () => {
  const history = useHistory();
  const countrySelectStyle = {
    width: "100%",
    borderRadius: "30px",
    border: "1px solid #449BD5",
    background: "#fff",
    height: "63px",
  }
  return (
    <Container>
        <PlaceSearchContainer>
          <div className="title">Explore Countries and Regions</div>
          <div className="search-bar-container">
            <CountrySelect setSelectedPlaceDcid={(placeDcid) => history.push(`/countries?p=${placeDcid}`)} style={countrySelectStyle}/>
          </div>
          <div className="footer">
            Learn about country and SDG region progress on the UN SDGs through
            the UN Data Commons.
          </div>
        </PlaceSearchContainer>
    </Container>
  );
};
