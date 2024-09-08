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

/* A component to render a section group of the rich menu (both mobile and desktop) */

import React, { ReactElement } from "react";

import { HeaderMenuGroup, Routes } from "../../../../shared/types/base";
import { resolveHref } from "../../utilities/utilities";

interface MenuRichSectionGroupProps {
  //the menu group to be rendered inside a particular location in the rich menu
  menuGroup: HeaderMenuGroup;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const MenuRichSectionGroup = ({
  menuGroup,
  routes,
}: MenuRichSectionGroupProps): ReactElement => {
  return (
    <div className={"group"}>
      {menuGroup.title && <h4>{menuGroup.title}</h4>}
      {menuGroup.items.map((item, index) => (
        <div key={index} className={"item"}>
          {item.title && item.url ? (
            <h5>
              <a href={resolveHref(item.url, routes)} className={"item-link"}>
                {item.linkType === "external" && (
                  <span className="material-icons-outlined">arrow_outward</span>
                )}
                {item.linkType === "rss" && (
                  <span className="material-icons-outlined">rss_feed</span>
                )}
                {item.title}
              </a>
            </h5>
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
                        <span className="material-icons-outlined">
                          rss_feed
                        </span>
                        <span className="link-title">RSS Feed</span>
                      </a>
                      {link.title && <p>• {link.title}</p>}
                    </>
                  ) : (
                    <a href={resolveHref(link.url, routes)} className={"link"}>
                      {link.linkType === "external" && (
                        <span className="material-icons-outlined">
                          arrow_outward
                        </span>
                      )}
                      <span className="link-title">{link.title}</span>
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

export default MenuRichSectionGroup;
