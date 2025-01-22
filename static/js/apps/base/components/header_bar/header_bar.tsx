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

import { useBreakpoints } from "../../../../shared/hooks/breakpoints";
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
  //the width of the logo - if provided, this will be used to prevent content bouncing.
  logoWidth: string;
  //the data that will populate the header menu.
  menu: HeaderMenu[];
  //if set true, the header menu will be hidden - value is taken from the template and will default to false.
  hideHeaderSearchBar: boolean;
  //if set true, the search bar will operate in "hash mode", changing the hash rather than redirecting.
  searchBarHashMode: boolean;
  //the Google Analytics tag associated with a search action
  gaValueSearchSource: string | null;
  // the labels dictionary - all labels will be passed through this before being rendered.
  // If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const HeaderBar = ({
  name,
  logoPath,
  logoWidth,
  menu,
  hideHeaderSearchBar,
  searchBarHashMode,
  gaValueSearchSource,
  labels,
  routes,
}: HeaderBarProps): ReactElement => {
  const { up, down } = useBreakpoints();

  return (
    <div id="main-header-container">
      <nav id="main-navbar-container">
        <div className="navbar-menu-large">
          <HeaderLogo
            name={name}
            logoPath={logoPath}
            logoWidth={logoWidth}
            labels={labels}
            routes={routes}
          />
          {!hideHeaderSearchBar && up("lg") && (
            <HeaderBarSearch
              searchBarHashMode={searchBarHashMode}
              gaValueSearchSource={gaValueSearchSource}
            />
          )}
          <MenuDesktop menu={menu} labels={labels} routes={routes} />
        </div>
        <div className="navbar-menu-mobile">
          <HeaderLogo
            name={name}
            logoPath={logoPath}
            logoWidth={logoWidth}
            labels={labels}
            routes={routes}
          />
          {!hideHeaderSearchBar && down("md") && (
            <HeaderBarSearch
              searchBarHashMode={searchBarHashMode}
              gaValueSearchSource={gaValueSearchSource}
            />
          )}
          <MenuMobile menu={menu} labels={labels} routes={routes} />
        </div>
      </nav>
    </div>
  );
};

export default HeaderBar;
