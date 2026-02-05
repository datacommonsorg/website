/**
 * Copyright 2025 Google LLC
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
 *  One.org: The app that renders the header component on all pages via the base template
 */

import React, { ReactElement } from "react";

import HeaderBar from "./components/header_bar/header_bar";

interface HeaderAppProps {
  //if set true, the search bar will operate in "hash mode", changing the hash rather than redirecting.
  searchBarHashMode: boolean;
  //the root of the primary data.one.org site
  primarySiteWebRoot: string;
}

/**
 * Header application container
 */
export function HeaderApp({
  searchBarHashMode,
  primarySiteWebRoot,
}: HeaderAppProps): ReactElement {
  return (
    <>
      <HeaderBar
        searchBarHashMode={searchBarHashMode}
        primarySiteWebRoot={primarySiteWebRoot}
      />
    </>
  );
}
