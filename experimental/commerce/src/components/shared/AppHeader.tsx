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
 * WITHOUTrgba(0,0,0,.8) WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import styled from "styled-components";
import appConfig from "../../config/appConfig.json";
import { theme } from "../../utils/theme";
import "./AppHeader.scss";

const AppHeaderContainer = styled.div`
  .header {
    padding: 0 1rem;
    .navbar {
      display: flex;
      height: 110px;
      max-width: 1048px;
      margin-left: auto;
      margin-right: auto;

      .logo {
        display: flex;
        align-items: center;
        .logo-image {
          flex-shrink: 0;
          height: 92px;
          width: 92px;
          margin-right: 1rem;
        }
        .logo-text {
          font-family: "Merriweather", "Georgia", "Cambria", "Times New Roman",
            "Times", serif;
          a {
            color: ${theme.colors.headerLogo};
            font-weight: 700;
            text-decoration: none;
            font-size: 2rem;
            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
  }

  .nav {
    background-color: ${theme.navBackgroundColor};
    display: flex;
    justify-content: center;
    font-family: "Source Sans 3", "Helvetica Neue", Helvetica, Roboto, Arial,
      sans-serif;
    padding: 0 1rem;
    .nav-inner {
      width: 1048px;
      margin: 0 auto;
      display: flex;
      flex-direction: row;
      margin: 0;
      .nav-item {
        list-style-type: none;
        height: 3rem;

        .nav-link {
          align-items: center;
          color: white;
          display: flex;

          height: 100%;
          margin: 0;
          padding: 0 12px;
          text-decoration: none;

          .nav-link-text {
            align-items: center;
            display: flex;
            height: 100%;
            white-space: nowrap;
            font-weight: 700;
            &:hover {
              box-shadow: inset 0 -4px 0 ${theme.colors.linkHover};
            }
          }
        }
      }
    }
  }
`;

const AppHeader = () => {
  return (
    <AppHeaderContainer>
      <header className="header">
        <div className="navbar">
          <div className="logo">
            <div className="logo-image">
              <a href="/" title="Home">
                <img src="/images/doc_logo.png" width="92" height="92" />
              </a>
            </div>
            <div className="logo-text">
              <a href="/" accessKey="1" title="Home">
                {appConfig.homepage.title}
              </a>
            </div>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-item">
            <a
              href="/"
              className="nav-link"
              aria-controls="nav-how-to-use-uswds"
              aria-expanded="true"
            >
              <span className="nav-link-text">Data Commons</span>
            </a>
          </div>
        </div>
      </nav>
    </AppHeaderContainer>
  );
};

export default AppHeader;
