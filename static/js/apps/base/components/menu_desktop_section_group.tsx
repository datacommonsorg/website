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

/* A component to render a section group of the rich menu */

import React, { ReactElement } from "react";

import { HeaderMenuGroup, Routes } from "../../../shared/types/base";
import { resolveHref } from "../utilities/utilities";

interface MenuDesktopSectionGroupProps {
  //the menu group to be rendered inside a particular location in the rich menu
  menuGroup: HeaderMenuGroup;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const MenuDesktopSectionGroup = ({
  menuGroup,
  routes,
}: MenuDesktopSectionGroupProps): ReactElement => {
  return (
    <div className={"group"}>
      {menuGroup.title && <h4>{menuGroup.title}</h4>}
      {menuGroup.items.map((item, index) => (
        <div key={index} className={"item"}>
          {item.title && item.url ? (
            <a href={item.url} className={"item-link"}>
              {item.linkType === "external" && (
                <i className="bi bi-box-arrow-up-right me-1"></i>
              )}
              {item.linkType === "rss" && <i className="bi bi-rss me-1"></i>}
              {item.title}
            </a>
          ) : (
            <h5>{item.title}</h5>
          )}

          {item.description && <p>{item.description}</p>}

          {item.links?.length > 0 && (
            <div className="item-links">
              {item.links.map((link, index) => (
                <div key={index} className="link-item">
                  {link.linkType === "rss" ? (
                    <>
                      <a
                        href={resolveHref(link.url, routes)}
                        className={"link"}
                      >
                        <i className="bi bi-rss me-1"></i>
                        RSS Feed
                      </a>{" "}
                      •{" "}
                      {link.title && <span className="ms-1">{link.title}</span>}
                    </>
                  ) : (
                    <a href={resolveHref(link.url, routes)} className={"link"}>
                      {link.linkType === "external" && (
                        <i className="bi bi-box-arrow-up-right me-1"></i>
                      )}
                      {link.title}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuDesktopSectionGroup;
