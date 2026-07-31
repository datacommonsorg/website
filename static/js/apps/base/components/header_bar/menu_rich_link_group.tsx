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

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { ArrowOutward } from "../../../../components/elements/icons/arrow_outward";
import { RssFeed } from "../../../../components/elements/icons/rss_feed";
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
  const theme = useTheme();
  const tabIndex = open ? 0 : -1;

  return (
    <>
      {links.map((link, index) => (
        <div
          key={index}
          css={css`
            display: flex;
            gap: ${theme.spacing.sm}px;
            ${theme.typography.family.text};
            ${theme.typography.text.sm};
          `}
        >
          {link.linkType === "rss" ? (
            <>
              <a
                href={resolveHref(link.url, routes)}
                tabIndex={tabIndex}
                css={css`
                  display: flex;
                  gap: ${theme.spacing.sm}px
                  margin: 0;
                  padding: 0;
                  &:hover {
                    span:nth-of-type(1) {
                      text-decoration: underline;
                    }
                  }
                `}
              >
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
                <span
                  css={css`
                    text-decoration: none;
                  `}
                >
                  RSS Feed
                </span>
              </a>
              {link.title && <span>• {link.title}</span>}
            </>
          ) : (
            <a
              href={resolveHref(link.url, routes)}
              tabIndex={tabIndex}
              css={css`
                display: flex;
                gap: ${theme.spacing.sm}px
                margin: 0;
                padding: 0;
                &:hover {
                  span:nth-of-type(1) {
                    text-decoration: underline;
                  }
                }
              `}
            >
              {link.linkType === "external" && (
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
              <span
                css={css`
                  text-decoration: none;
                `}
              >
                {link.title}
              </span>
            </a>
          )}
        </div>
      ))}
    </>
  );
};

export default MenuRichLinkGroup;
