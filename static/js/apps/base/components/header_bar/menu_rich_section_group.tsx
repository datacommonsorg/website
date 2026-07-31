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

/** A component to render a section group of the rich menu (both mobile and desktop) */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { ArrowOutward } from "../../../../components/elements/icons/arrow_outward";
import { RssFeed } from "../../../../components/elements/icons/rss_feed";
import {
  GA_EVENT_HEADER_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../../../shared/ga_events";
import { HeaderMenuGroup, Routes } from "../../../../shared/types/base";
import { resolveHref } from "../../utilities/utilities";
import MenuRichLinkGroup from "./menu_rich_link_group";

interface MenuRichSectionGroupProps {
  //the menu group to be rendered inside a particular location in the rich menu
  menuGroup: HeaderMenuGroup;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
  //menu type used for tracking
  type: "desktop" | "mobile";
  //a flag to indicate whether the menu is open.
  open: boolean;
}

const MenuRichSectionGroup = ({
  menuGroup,
  routes,
  type,
  open,
}: MenuRichSectionGroupProps): ReactElement => {
  const theme = useTheme();
  const tabIndex = open ? 0 : -1;

  return (
    <div
      css={css`
        display: block;
        margin: 0;
        padding: 0;
      `}
    >
      {menuGroup.title && (
        <h3
          css={css`
            ${theme.typography.family.heading};
            ${theme.typography.text.sm};
            text-transform: uppercase;
            color: ${theme.colors.text.primary.base};
            font-weight: 300;
            margin-bottom: ${theme.spacing.md}px;
          `}
        >
          {menuGroup.title} - test
        </h3>
      )}
      {menuGroup.items.map((item, index) => (
        <div
          key={index}
          css={css`
            margin-bottom: ${theme.spacing.xl}px;
          `}
        >
          {item.title && item.url ? (
            <h4
              css={css`
                ${theme.typography.family.heading};
                ${theme.typography.text.md};
                display: inline-flex;
                align-items: center;
                font-size: 1rem;
                font-weight: 500;
                margin-bottom: ${theme.spacing.md}px;
              `}
            >
              <a
                href={resolveHref(item.url, routes)}
                css={css`
                  display: flex;
                  gap: ${theme.spacing.sm}px;
                  margin: 0;
                  padding: 0;
                  &:hover {
                    span {
                      text-decoration: underline;
                    }
                  }
                `}
                onClick={(): boolean => {
                  triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                    [GA_PARAM_ID]: `${type} submenu ${menuGroup.id}-${index}`,
                    [GA_PARAM_URL]: item.url,
                  });
                  return true;
                }}
                tabIndex={tabIndex}
              >
                {item.linkType === "external" && (
                  <span
                    css={css`
                      ${theme.typography.family.text};
                      ${theme.typography.text.md};
                      display: flex;
                      align-items: center;
                      text-decoration: none;
                    `}
                  >
                    <ArrowOutward />
                  </span>
                )}
                {item.linkType === "rss" && (
                  <span
                    css={css`
                      ${theme.typography.family.text};
                      ${theme.typography.text.md};
                      display: flex;
                      align-items: center;
                      text-decoration: none;
                    `}
                  >
                    <RssFeed />
                  </span>
                )}
                {item.title}
              </a>
            </h4>
          ) : (
            <h5
              css={css`
                ${theme.typography.family.heading};
                ${theme.typography.text.sm};
                text-transform: uppercase;
                color: ${theme.colors.text.primary.base};
                font-weight: 300;
                margin: 0 0 ${theme.spacing.sm}px 0;
              `}
            >
              {item.title}
            </h5>
          )}

          {item.description && (
            <p
              css={css`
                ${theme.typography.family.text};
                ${theme.typography.text.sm};
                font-weight: 300;
              `}
            >
              {item.description}
            </p>
          )}

          {item.links?.length > 0 && (
            <MenuRichLinkGroup links={item.links} routes={routes} open={open} />
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuRichSectionGroup;
