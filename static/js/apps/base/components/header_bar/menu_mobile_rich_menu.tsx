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

/* A component to render the rich menu drop-down for the mobile menu */

import React, { ReactElement } from "react";

import { HeaderMenuV2, Labels, Routes } from "../../../../shared/types/base";
import MenuRichSectionGroup from "./menu_rich_section_group";

interface MenuMobileRichMenuProps {
  //the menu item for which we are rendering the rich menu
  menuItem: HeaderMenuV2 | null;
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
  if (!menuItem) return null;

  return (
    <>
      <div className={"introduction-section"}>
        <h3>{labels[menuItem.label]}</h3>
        {menuItem.introduction && <p>{menuItem.introduction}</p>}
      </div>
      {menuItem.primarySectionGroups?.length > 0 && (
        <div className={"primary-section"}>
          {menuItem.primarySectionGroups.map((primarySectionGroup, index) => (
            <MenuRichSectionGroup
              key={index}
              menuGroup={primarySectionGroup}
              routes={routes}
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
              />
            )
          )}
        </div>
      )}
    </>
  );
};

export default MenuMobileRichMenu;
