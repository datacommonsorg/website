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
  return (
    <div className={`rich-menu-content ${open ? "open" : ""}`}>
      <div className={"introduction-section"}>
        <h3>{labels[menuItem.introduction?.label ?? menuItem.label]}</h3>
        {menuItem.introduction?.description && (
          <p>{menuItem.introduction.description}</p>
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
        <div className={"primary-section"}>
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
        <div className={"secondary-section"}>
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
