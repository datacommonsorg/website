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

/** A component to render the rich menu drop-down for the desktop menu */

//TODO: Look into folding this into the same component as the mobile version, pending no changes to the structure.

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { HeaderMenu, Labels, Routes } from "../../../../shared/types/base";
import MenuRichLinkGroup from "./menu_rich_link_group";
import MenuRichSectionGroup from "./menu_rich_section_group";

interface MenuDesktopRichMenuProps {
  //the top level header item that will render in the open rich menu container
  menuItem: HeaderMenu;
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
  //a flag to indicate whether the menu is open.
  open: boolean;
}

const MenuDesktopRichMenu = ({
  menuItem,
  labels,
  routes,
  open,
}: MenuDesktopRichMenuProps): ReactElement => {
  const theme = useTheme();
  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: ${menuItem.secondarySectionGroups?.length > 0
          ? "minmax(400px, 1fr) 1fr 1fr 1fr"
          : "minmax(400px, 1fr) 1fr 1fr"};
        @media (min-width: ${theme.breakpoints.xl}px) {
          grid-template-columns: minmax(400px, 1fr) 1fr 1fr 1fr;
        }
        gap: ${theme.spacing.xl}px;
        margin: 0 auto;
        padding: ${theme.spacing.xxl}px 0 ${theme.spacing.md}px 0;
        max-width: ${theme.header.width}px;
        opacity: ${open ? "1" : "0"};
        transform: ${open
          ? "translate3d(0, -16px, 0)"
          : "translate3d(0, 0, 0)"};
        transition: opacity 0.3s ease-out, transform 0.4s ease-out;
        height: 100%;
        max-height: calc(100vh - ${theme.header.lg}px);
        overflow-y: scroll;
        overflow-x: hidden;
        scroll-behavior: smooth;
        -ms-overflow-style: none;
        scrollbar-width: none;
        &::-webkit-scrollbar {
          display: none;
        }
      `}
    >
      <div
        css={css`
          padding: ${theme.spacing.xl}px ${theme.spacing.lg}px;
        `}
      >
        <h3
          css={css`
            ${theme.typography.family.heading};
            ${theme.typography.text.lg};
            font-weight: 100;
          `}
        >
          {labels[menuItem.introduction?.label ?? menuItem.label]}
        </h3>
        {menuItem.introduction?.description && (
          <p
            css={css`
              ${theme.typography.family.text};
              ${theme.typography.text.sm};
            `}
          >
            {menuItem.introduction.description}
          </p>
        )}
        {menuItem.introduction.links?.length > 0 && (
          <MenuRichLinkGroup
            links={menuItem.introduction.links}
            routes={routes}
            open={open}
          />
        )}
      </div>
      {menuItem.primarySectionGroups?.length > 0 && (
        <div
          css={css`
            padding: ${theme.spacing.xl}px ${theme.spacing.lg}px;
            grid-column: 2 / span 2;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${theme.spacing.xl}px;
            border-left: 1px solid #f2f2f2;
          `}
        >
          {menuItem.primarySectionGroups.map((primarySectionGroup, index) => (
            <MenuRichSectionGroup
              key={index}
              menuGroup={primarySectionGroup}
              routes={routes}
              type="desktop"
              open={open}
            />
          ))}
        </div>
      )}
      {menuItem.secondarySectionGroups?.length > 0 && (
        <div
          css={css`
            padding: ${theme.spacing.xl}px ${theme.spacing.lg}px;
            border-left: 1px solid #f2f2f2;
          `}
        >
          {menuItem.secondarySectionGroups.map(
            (secondarySectionGroup, index) => (
              <MenuRichSectionGroup
                key={index}
                menuGroup={secondarySectionGroup}
                routes={routes}
                type="desktop"
                open={open}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default MenuDesktopRichMenu;
