/**
 * Copyright 2024 Google LLC
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

/**
 * A component that renders the header on all pages via the base template.
 */

import React, { ReactElement } from "react";

import { HeaderMenu, Labels, Routes } from "../../../../shared/types/base";
import HeaderBarSearch from "./header_bar_search";
import HeaderLogo from "./header_logo";
import MenuDesktop from "./menu_desktop";
import MenuMobile from "./menu_mobile";

interface HeaderBarProps {
  //the name of the application (this may not be "Data Commons" in forked versions).
  name: string;
  //a path to the logo to be displayed in the header
  logoPath: string;
  //the data that will populate the header menu.
  menu: HeaderMenu[];
  //if set true, the header menu will show - this value is pulled in from the page template and will default to false.
  showHeaderSearchBar: boolean;
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const HeaderBar = ({
  name,
  logoPath,
  menu,
  showHeaderSearchBar,
  labels,
  routes,
}: HeaderBarProps): ReactElement => {
  return (
    <header id="main-header">
      <nav id="main-nav">
        <div className="navbar-menu-large">
          <HeaderLogo
            name={name}
            logoPath={logoPath}
            labels={labels}
            routes={routes}
          />
          {showHeaderSearchBar && <HeaderBarSearch />}
          <MenuDesktop menu={menu} labels={labels} routes={routes} />
        </div>
        <div className="navbar-menu-mobile">
          <HeaderLogo
            name={name}
            logoPath={logoPath}
            labels={labels}
            routes={routes}
          />
          <HeaderBarSearch />
          <MenuMobile menu={menu} labels={labels} routes={routes} />
        </div>
      </nav>
    </header>
  );
};

export default HeaderBar;
