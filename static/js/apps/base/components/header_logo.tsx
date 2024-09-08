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
 * The branding logo that appears in the header.
 */

import React, { ReactElement } from "react";

import { Labels, Routes } from "../../../shared/types/base";

interface HeaderLogoProps {
  //the name of the application (this may not be "Data Commons" in forked versions).
  name: string;
  //a path to the logo to be displayed in the header
  logoPath: string;
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const HeaderLogo = ({
  name,
  logoPath,
  labels,
  routes,
}: HeaderLogoProps): ReactElement => {
  return (
    <div className="navbar-brand">
      {logoPath && (
        <div id="main-header-logo">
          <a
            href={routes["static.homepage"]}
            aria-label={labels["Back to homepage"]}
          >
            <img src={logoPath} alt={`${name} logo`} />
          </a>
        </div>
      )}
      <a href={routes["static.homepage"]}>{name}</a>
    </div>
  );
};

export default HeaderLogo;