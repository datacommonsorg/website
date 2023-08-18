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

import { Link } from "react-router-dom";
import styled from "styled-components";
import { BrandingLink } from "./components";

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
  overflow: hidden;
  .left {
    height: 45px;
    padding-right: 1.25rem;
  }
  .text {
    border-left: 2px solid grey;
    display: flex;
    flex-direction: column;
    font-family: Roboto Condensed, sans-serif;
    padding-left: 1.25rem;
    flex-shrink: 0;
    .header {
      color: #333;
      font-size: 23px;
      font-weight: 600;
      line-height: normal;
      flex-shrink: 0;
    }
    .subheader {
      color: #333;
      font-size: 23px;
      line-height: 1.5rem;
      flex-shrink: 0;
    }
  }
`;

const LogoSecondary = styled.div`
  @media (max-width: 980px) {
    display: none;
  }
  display: flex;
  align-items: center;
`;

const HeaderNav = styled.div`
  align-items: center;
  background-color: rgb(77, 77, 77) !important;
  border-bottom: 1px solid #f1f1f1;
  display: flex;
  flex-direction: row;
  margin: auto 0;
  padding: 0 4rem;
  overflow: auto;
  /** Safe center prevents the navbar from getting cut off on small screens */
  justify-content: safe flex-start;

  &:hover {
    a {
      text-decoration: none;
    }
  }
`;

const HeaderNavItem = styled.div`
  flex-shrink: 0;
  border-right: 1px solid white;
  &:last-child {
    border-right: 0;
  }

  &:hover {
    background-color: #f8f8f8;
    a {
      color: black;
    }
  }
`;

const SubNavbarItemLink = styled(Link)<{ selected?: boolean }>`
  padding: 0.6rem 1rem;
  color: white;
  display: flex;
  font-size: 0.9rem;
  ${(p) =>
    p.selected
      ? `
      font-weight: 500;
      color: red;
      background-color: #f8f8f8;
        color: black;
      `
      : null}
`;

const AppHeader = (props: { selected: HeaderOptions }) => {
  const { selected } = props;
  return (
    <HeaderContainer>
      <TopContainer>
        <LogoBanner>
          <a href="https://unstats.un.org/UNSDWebsite/" target="_blank">
            <img className="left" src="/images/un-logo.svg" />
          </a>
          <div className="text">
            <div className="header">
              Department of Economic and Social Affairs
            </div>
            <div className="subheader">Statistics</div>
          </div>
        </LogoBanner>
        <LogoSecondary>
          <BrandingLink />
        </LogoSecondary>
      </TopContainer>
      <HeaderNav>
        <HeaderNavItem>
          <SubNavbarItemLink to="/" selected={selected === "home"}>
            Home
          </SubNavbarItemLink>
        </HeaderNavItem>
        <HeaderNavItem>
          <SubNavbarItemLink
            to="/countries"
            selected={selected === "countries"}
          >
            Countries / Regions
          </SubNavbarItemLink>
        </HeaderNavItem>
        <HeaderNavItem>
          <SubNavbarItemLink to="/goals" selected={selected === "goals"}>
            Goals
          </SubNavbarItemLink>
        </HeaderNavItem>
        <HeaderNavItem>
          <SubNavbarItemLink to="/search" selected={selected === "search"}>
            Search
          </SubNavbarItemLink>
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
