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

import {
  GA_EVENT_HEADER_CLICK,
  triggerGAEvent,
} from "../../../../shared/ga_events";
import { HeaderMenuGroup, Routes } from "../../../../shared/types/base";
import { resolveHref } from "../../utilities/utilities";

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
            <h5>
              <a
                href={item.url}
                className={"item-link"}
                onClick={() => {
                  triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                    GA_PARAM_ID: `desktop ${menuGroup.id} ${index}`,
                    GA_PARAM_URL: item.url,
                  });
                  return true;
                }}
              >
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
              {item.links.map((link, linksIndex) => {
                const url = resolveHref(link.url, routes);
                return (
                  <div key={linksIndex} className="link-item">
                    {link.linkType === "rss" ? (
                      <>
                        <a
                          href={url}
                          className={"link"}
                          onClick={() => {
                            triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                              GA_PARAM_ID: `desktop ${menuGroup.id} ${index}-${linksIndex}`,
                              GA_PARAM_URL: url,
                            });
                            return true;
                          }}
                        >
                          <span className="material-icons-outlined">
                            rss_feed
                          </span>
                          <span className="link-title">RSS Feed</span>
                        </a>
                        {link.title && <p>• {link.title}</p>}
                      </>
                    ) : (
                      <a
                        href={url}
                        className={"link"}
                        onClick={() => {
                          triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                            GA_PARAM_ID: `desktop ${menuGroup.id} ${index}-${linksIndex}`,
                            GA_PARAM_URL: url,
                          });
                          return true;
                        }}
                      >
                        {link.linkType === "external" && (
                          <span className="material-icons-outlined">
                            arrow_outward
                          </span>
                        )}
                        <span className="link-title">{link.title}</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuDesktopSectionGroup;
