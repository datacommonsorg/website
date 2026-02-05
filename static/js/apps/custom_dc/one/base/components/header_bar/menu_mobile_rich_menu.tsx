/**
 * Copyright 2025 Google LLC
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

/** One.org: A component to render the rich menu drop-down for the mobile menu */

import React, { ReactElement } from "react";
import ReactMarkdown from "react-markdown";

import { MenuSource } from "./menu";

interface MenuMobileRichMenuProps {
  //the menu item for which we are rendering the rich menu
  menuItem: MenuSource | null;
}

const MenuMobileRichMenu = ({
  menuItem,
}: MenuMobileRichMenuProps): ReactElement => {
  if (!menuItem) return null;

  return (
    <div className={`menu-container`}>
      <div className="menu-header">
        <h3>{menuItem.title}</h3>
        <ReactMarkdown>{menuItem.description}</ReactMarkdown>
      </div>
      {menuItem.childContent && menuItem.childContent.length > 0 && (
        <ul className={`menu-list`}>
          {menuItem.childContent.map((child, index) => (
            <li key={index}>
              <a href={child.url}>
                {child.title}{" "}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 -960 960 960"
                  width="1em"
                  fill="currentColor"
                  xmp-right-click="true"
                >
                  <path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z"></path>
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MenuMobileRichMenu;
