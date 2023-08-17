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
import { BrandingLink } from "./components";
import "./AppHeader.css";
import React from "react";

type HeaderOptions = "home" | "countries" | "goals" | "topics" | "search";

interface Props {
  children: React.ReactNode;
  to?: any;
  selected?: boolean;
}

const HeaderNavItem = ({ children }: Props) => {
  return <div className="header-nav-item">{children}</div>
};

const SubNavbarItemLink = ({ children, to, selected }: Props) => {
  return <Link to={to} className={`sub-nav-bar-item-link ${selected ? "selected" : ""}`}>{children}</Link>
};

const AppHeader = (props: { selected: HeaderOptions }) => {
  const { selected } = props;
  return (
    <div className="header-container">
      <div className="top-container">
        <div className="logo-banner">
          <a href="https://unstats.un.org/UNSDWebsite/" target="_blank">
            <img className="left" src="/images/un-logo.svg" />
          </a>
          <div className="text">
            <div className="header">
              Department of Economic and Social Affairs
            </div>
            <div className="subheader">Statistics</div>
          </div>
        </div>
        <div className="logo-secondary">
          <BrandingLink />
        </div>
      </div>
      <div className="header-nav">
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
      </div>
    </div>
  );
};

export default AppHeader;
