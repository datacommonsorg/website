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

/** A component to render a group of links (both mobile and desktop) */

import React, { ReactElement } from "react";

import { HeaderMenuItemLink, Routes } from "../../../../shared/types/base";
import { resolveHref } from "../../utilities/utilities";

interface MenuRichLinkGroupProps {
  //an array of the links that are to be rendered as a group
  links: HeaderMenuItemLink[];
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
  //a flag to indicate whether the menu is open.
  open: boolean;
}

const MenuRichLinkGroup = ({
  links,
  routes,
  open,
}: MenuRichLinkGroupProps): ReactElement => {
  const tabIndex = open ? 0 : -1;

  return (
    <div className="item-links">
      {links.map((link, index) => (
        <div key={index} className="link-item">
          {link.linkType === "rss" ? (
            <>
              <a
                href={resolveHref(link.url, routes)}
                className={"link"}
                tabIndex={tabIndex}
              >
                <span className="material-icons-outlined">rss_feed</span>
                <span className="link-title">RSS Feed</span>
              </a>
              {link.title && <p>• {link.title}</p>}
            </>
          ) : (
            <a
              href={resolveHref(link.url, routes)}
              className={"link"}
              tabIndex={tabIndex}
            >
              {link.linkType === "external" && (
                <span className="material-icons-outlined">arrow_outward</span>
              )}
              <span className="link-title">{link.title}</span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuRichLinkGroup;
