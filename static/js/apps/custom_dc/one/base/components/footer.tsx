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
 * One.org: A component to display the footer
 */

import React, { ReactElement } from "react";

import { ArrowOutward } from "../../../../../components/elements/icons/arrow_outward";
import { One } from "../../components/elements/icons/one";
import { SocialFacebook } from "../../components/elements/icons/social_facebook";
import { SocialInstagram } from "../../components/elements/icons/social_instagram";
import { SocialX } from "../../components/elements/icons/social_x";
import { SocialYouTube } from "../../components/elements/icons/social_youtube";

declare global {
  interface Window {
    UC_UI?: {
      showSecondLayer?: () => void;
    };
  }
}

interface FooterProps {
  //the root of the primary data.one.org site
  primarySiteWebRoot: string;
}

export const Footer = ({ primarySiteWebRoot }: FooterProps): ReactElement => {
  const handleCookieSettings = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (
      typeof window !== "undefined" &&
      window.UC_UI &&
      typeof window.UC_UI.showSecondLayer === "function"
    ) {
      window.UC_UI.showSecondLayer();
    } else {
      console.warn("UC_UI.showSecondLayer is not available.");
    }
  };

  return (
    <section id="footer">
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <One width={80} />
                <span>Data</span>
              </div>
              <p className="footer-description">
                ONE Data provides insights on global challenges through data,
                analysis, and tools to drive action toward a more just world.
              </p>
              <p className="footer-description">
                Powered by{" "}
                <a
                  className="inline-flex items-center type-reg-sm font-medium text-white hover:underline"
                  target="_blank"
                  href="https://datacommons.org"
                  rel="noopener noreferrer"
                >
                  Google&#39;s Data Commons
                  <ArrowOutward />
                </a>
                .
              </p>
            </div>

            <div className="footer-links">
              <div>
                <h2>Our Work</h2>
                <ul>
                  <li>
                    <a href={`${primarySiteWebRoot}/analysis`}>Analysis</a>
                  </li>
                  <li>
                    <a href="/">Data</a>
                  </li>
                  <li>
                    <a
                      href="https://datacommons.one.org"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ONE Data Commons
                    </a>
                  </li>
                  <li>
                    <a href={`${primarySiteWebRoot}/newsletter`}>Newsletter</a>
                  </li>
                </ul>
              </div>
              <div>
                <h2>About Us</h2>
                <ul>
                  <li>
                    <a href={`${primarySiteWebRoot}/about`}>About Us</a>
                  </li>
                  <li>
                    <a href={`${primarySiteWebRoot}/about/team`}>Our Team</a>
                  </li>
                  <li>
                    <a href={`${primarySiteWebRoot}/about/faq`}>FAQ</a>
                  </li>
                </ul>
              </div>
              <div>
                <h2>Connect with Us</h2>
                <ul className="social-links">
                  <li>
                    <a
                      href="https://www.facebook.com/ONE"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SocialFacebook />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://instagram.com/one"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SocialInstagram />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://x.com/ONEAftershocks"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SocialX />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.youtube.com/TheONECampaign"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SocialYouTube />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>
              <strong>© 2025 ONE Campaign.</strong> All rights reserved.
            </p>
            <ul className="footer-bottom-links">
              <li className="footer-bottom-link footer-bottom-link-separator">
                <a
                  href="https://www.one.org/info/privacy-policy/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Privacy Policy
                  <ArrowOutward />
                </a>
              </li>
              <li>
                <a href={`${primarySiteWebRoot}/sitemap`}>Sitemap</a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => handleCookieSettings(e)}
                  className="footer__cookie-consent"
                >
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </section>
  );
};
