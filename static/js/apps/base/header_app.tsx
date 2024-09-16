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
 * The app that renders the header component on all pages via the base template
 */

import React, { ReactElement } from "react";

import { HeaderMenu, Labels, Routes } from "../../shared/types/base";
import HeaderBar from "./components/header_bar/header_bar";

interface HeaderAppProps {
  //the name of the application (this may not be "Data Commons" in forked versions).
  name: string;
  //a path to the logo to be displayed in the header
  logoPath: string;
  //the width of the logo - if provided, this will be used to prevent content bouncing as the logo loads in after the rest of the content.
  logoWidth: string;
  //the data that will populate the header menu.
  headerMenu: HeaderMenu[];
  //if set true, the header menu will show. It will default to false on all pages unless the {% set is_show_header_search_bar = true %} is set.
  showHeaderSearchBar: boolean;
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

/**
 * Header application container
 */
export function HeaderApp({
  name,
  logoPath,
  logoWidth,
  headerMenu,
  showHeaderSearchBar,
  labels,
  routes,
}: HeaderAppProps): ReactElement {
  return (
    <>
      <HeaderBar
        name={name}
        logoPath={logoPath}
        logoWidth={logoWidth}
        menu={headerMenu}
        showHeaderSearchBar={showHeaderSearchBar}
        labels={labels}
        routes={routes}
      />
    </>
  );
}
