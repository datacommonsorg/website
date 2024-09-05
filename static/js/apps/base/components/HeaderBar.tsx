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

import React, { ReactElement, useMemo } from "react";

import { HeaderMenu, Labels, Routes } from "../../../shared/types/base";
import { resolveHref, slugify } from "../utilities/utilities";

interface HeaderBarProps {
  name: string;
  logoPath: string;
  menu: HeaderMenu[];
  labels: Labels;
  routes: Routes;
}

const HeaderBar = ({
  name,
  logoPath,
  menu,
  labels,
  routes,
}: HeaderBarProps): ReactElement => {
  const visibleMenu = useMemo(() => {
    return menu.map((menuItem) => ({
      ...menuItem,
      subMenu: menuItem.subMenu.filter((subMenuItem) => !subMenuItem.hide),
    }));
  }, [menu]);

  return (
    <header id="main-header">
      <nav className="navbar navbar-light navbar-expand-lg col" id="main-nav">
        <div className="container-fluid">
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
          <button
            className="navbar-toggler"
            type="button"
            data-toggle="collapse"
            data-target="#dc-main-nav"
            aria-label={labels["Show site navigation"]}
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div
            className="collapse navbar-collapse justify-content-md-end"
            id="dc-main-nav"
          >
            <ul className="navbar-nav float-md-right">
              {visibleMenu.map((menuItem, index) => (
                <li key={menuItem.label} className="nav-item dropdown">
                  <a
                    className="nav-link dropdown-toggle"
                    href="#"
                    id={slugify(`nav-${menuItem.label}-dropdown`)}
                    role="button"
                    data-toggle="dropdown"
                    aria-haspopup="true"
                    aria-expanded="false"
                    aria-label={labels[menuItem.ariaLabel]}
                  >
                    {labels[menuItem.label]}
                  </a>
                  {menuItem.subMenu.length > 0 && (
                    <div
                      className={`dropdown-menu ${
                        index === visibleMenu.length - 1
                          ? "dropdown-menu-right"
                          : ""
                      }`}
                      aria-labelledby={slugify(
                        `nav-${menuItem.label}-dropdown`
                      )}
                    >
                      {menuItem.subMenu.map((subMenuItem) => (
                        <a
                          key={subMenuItem.label}
                          className="dropdown-item"
                          href={resolveHref(subMenuItem.href, routes)}
                        >
                          {labels[subMenuItem.label]}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default HeaderBar;
