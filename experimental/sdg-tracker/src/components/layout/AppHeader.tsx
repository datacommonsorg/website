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
import { Link } from "react-router-dom";
import styled from "styled-components";

type HeaderOptions = "home" | "countries" | "goals" | "topics" | "search";

const HeaderContainer = styled.div`
  width: 100%;
  background: white;
`;

const TopContainer = styled.div`
  align-items: center;
  border-bottom: 1px solid #f1f1f1;
  display: flex;
  flex-direction: row;
  height: 75px;
  justify-content: space-between;
  padding: 0 4rem;
  width: 100%;
`;

const LogoBanner = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  .left {
    height: 35px;
    padding-right: 1.25rem;
  }
  .right {
    border-left: 2px solid grey;
    color: ${gray[7]};
    font-size: 18px;
    font-weight: bold;
    line-height: 1;
    padding-left: 1.25rem;
    text-decoration: none;
  }
`;

const LogoSecondary = styled.div`
  @media (max-width: 576px) {
    display: none;
  }
  img {
    height: 35px;
  }
`;

const HeaderNav = styled.div`
  align-items: center;
  background-color: white !important;
  border-bottom: 1px solid #f1f1f1;
  display: flex;
  flex-direction: row;
  margin: auto;
  overflow: auto;
  /** Safe center prevents the navbar from getting cut off on small screens */
  justify-content: safe center;

  &:hover {
    a {
      text-decoration: none;
    }
  }
`;

const HeaderNavItem = styled.div`
  padding: 0 0.85rem;
  flex-shrink: 0;

  &:hover {
    background-color: #f8f8f8;
  }
  a {
    color: #424242;
    display: flex;
    font-size: 0.9rem;
  }
`;

const SubNavbarItemLink = styled.span<{ selected?: boolean }>`
  padding: 0.8rem 0;
  ${(p) =>
    p.selected
      ? `
      font-weight: 500;
      box-shadow: inset 0 -2px 0 #9a0000;
      color: #9a0000;
      `
      : null}
`;

const AppHeader = (props: { selected: HeaderOptions }) => {
  const { selected } = props;
  return (
    <HeaderContainer>
      <TopContainer>
        <LogoBanner>
          <a href="https://sdgs.un.org/" target="_blank">
            <img className="left" src="/images/un-logo.svg" />
          </a>
          <a className="right" href="https://datacommons.org" target="_blank">
            Data
            <br />
            Commons
          </a>
        </LogoBanner>
        <LogoSecondary>
          <a href="https://sdgs.un.org/goals" target="_blank">
            <img src="/images/sdg-logo.png" />
          </a>
        </LogoSecondary>
      </TopContainer>
      <HeaderNav>
        <HeaderNavItem>
          <Link to="/">
            <SubNavbarItemLink selected={selected === "home"}>
              Home
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
        <HeaderNavItem>
          <Link to="/countries">
            <SubNavbarItemLink selected={selected === "countries"}>
              Countries / Regions
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
        <HeaderNavItem>
          <Link to="/goals">
            <SubNavbarItemLink selected={selected === "goals"}>
              Goals
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
        <HeaderNavItem>
          <Link to="/topics">
            <SubNavbarItemLink selected={selected === "topics"}>
              Topics
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
        <HeaderNavItem>
          <Link to="/search">
            <SubNavbarItemLink selected={selected === "search"}>
              Search
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
        {/* 
        <HeaderNavItem>
          <Link to="/goals-legacy">
            <SubNavbarItemLink selected={selected === "goals-legacy"}>
              [TEST] Goals
            </SubNavbarItemLink>
          </Link>
        </HeaderNavItem>
        */}
      </HeaderNav>
    </HeaderContainer>
  );
};

export default AppHeader;
