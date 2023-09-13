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
import { HomeSearchContainer, HomeSection, SectionDescription, SectionHeader } from "./components";

const Container = styled(HomeSection)`
  gap: 36px;
`;

const Header = styled(SectionHeader)`
  color: rgba(0, 0, 0, 0.79);
`

const SearchBarContainer = styled(HomeSearchContainer)`
  svg {
    display: none;
  }

  .ant-select.ant-select-auto-complete.-dc-place-search {
    .ant-select-selector {
      height: 100% !important;
      display: flex;
      align-items: center;
      font-size: 16px;
      border: 0;
      border-radius: 30px !important;

      .ant-select-selection-search {
        height: 100% !important;
        display: flex;
        align-items: center;

        input {
          height: 100% !important;
          padding-left: 30px;
        }
      }

      .ant-select-selection-placeholder {
        height: 100% !important;
        font-style: italic;
        padding-left: 30px;
        display: flex;
        align-items: center;
      }
    }
  }
`

const ColorBar = styled.div`
  background-image: url("./images/datacommons/sdg-color-bar.png");
  height: 16px;
`;

export const PlaceSection = () => {
  const history = useHistory();
  const countrySelectStyle = {
    width: "100%",
    borderRadius: "30px",
    border: "1px solid #449BD5",
    background: "#fff",
    height: "100%",
  };
  return (
    <>
    <ColorBar/>
    <Container>
        <Header>Explore Countries and Regions</Header>
        <SearchBarContainer>
          <CountrySelect
            setSelectedPlaceDcid={(placeDcid) =>
              history.push(`/countries?p=${placeDcid}`)
            }
            style={countrySelectStyle}
          />
        </SearchBarContainer>
        <SectionDescription>
          Learn about country and SDG region progress on the UN SDGs through the
          UN Data Commons.
        </SectionDescription>
    </Container>
      <ColorBar/></>
  );
};
