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
 * A component that renders the footer on all pages via the base template.
 */

import React, { ReactElement } from "react";

import { Labels, Routes } from "../../../shared/types/base";

interface FooterProps {
  //if true, will display an alternate, lighter version of the logo.
  brandLogoLight: boolean;
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const Footer = ({
  brandLogoLight,
  labels,
  routes,
}: FooterProps): ReactElement => {
  return (
    <div id="main-footer-container">
      <div className="container">
        <div className="brand-byline">
          <span className="brand-text">{labels["An initiative from"]}</span>
          <img
            className="brand-logo"
            width="74"
            height="25"
            src={
              brandLogoLight
                ? "/images/google-logo-reverse.svg"
                : "/images/google-logo.svg"
            }
            alt="Google logo"
          />
        </div>
        <ul className="footer-links">
          <li>
            <a href="https://policies.google.com/terms">
              {labels["Terms and Conditions"]}
            </a>
          </li>
          <li>
            <a href="https://policies.google.com/privacy?hl=en-US">
              {labels["Privacy Policy"]}
            </a>
          </li>
          <li>
            <a href={routes["static.disclaimers"]}>
              {labels["Disclaimers"]}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Footer;
