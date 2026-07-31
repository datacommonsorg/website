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

/** A component to render the rich menu drop-down for the mobile menu */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { HeaderMenu, Labels, Routes } from "../../../../shared/types/base";
import MenuRichLinkGroup from "./menu_rich_link_group";
import MenuRichSectionGroup from "./menu_rich_section_group";

interface MenuMobileRichMenuProps {
  //the menu item for which we are rendering the rich menu
  menuItem: HeaderMenu | null;
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const MenuMobileRichMenu = ({
  menuItem,
  labels,
  routes,
}: MenuMobileRichMenuProps): ReactElement => {
  const theme = useTheme();
  if (!menuItem) return null;

  const sectionCss = css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.sm}px;
    border-bottom: 1px solid #cccccc;
    padding: 0 0 ${theme.spacing.md}px 0;
    &:last-of-type {
      border-bottom: none;
    }
  `;

  return (
    <>
      <div css={sectionCss}>
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
            open={true}
          />
        )}
      </div>
      {menuItem.primarySectionGroups?.length > 0 && (
        <div css={sectionCss}>
          {menuItem.primarySectionGroups.map((primarySectionGroup, index) => (
            <MenuRichSectionGroup
              key={index}
              menuGroup={primarySectionGroup}
              routes={routes}
              type="mobile"
              open={true}
            />
          ))}
        </div>
      )}
      {menuItem.secondarySectionGroups?.length > 0 && (
        <div css={sectionCss}>
          {menuItem.secondarySectionGroups.map(
            (secondarySectionGroup, index) => (
              <MenuRichSectionGroup
                key={index}
                menuGroup={secondarySectionGroup}
                routes={routes}
                type="mobile"
                open={true}
              />
            )
          )}
        </div>
      )}
    </>
  );
};

export default MenuMobileRichMenu;
