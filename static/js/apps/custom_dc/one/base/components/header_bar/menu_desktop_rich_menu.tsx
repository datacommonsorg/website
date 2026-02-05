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

/** One.org: A component to render the rich menu drop-down for the desktop menu */

//TODO: Look into folding this into the same component as the mobile version, pending no changes to the structure.

import React, { ReactElement } from "react";
import ReactMarkdown from "react-markdown";

import { MenuSource } from "./menu";

interface MenuDesktopRichMenuProps {
  //the top level header item that will render in the open rich menu container
  menuItem: MenuSource;
  //a flag to indicate whether the menu is open.
  open: boolean;
}

const MenuDesktopRichMenu = ({
  menuItem,
  open,
}: MenuDesktopRichMenuProps): ReactElement => {
  // Determine if every child item has an empty description.
  const noChildDescription =
    menuItem.childContent && menuItem.childContent.length > 0
      ? menuItem.childContent.every((child) => !child.description)
      : false;

  return (
    <div className={`rich-menu-content ${open ? "open" : ""}`}>
      <div className="primary-section">
        <h3>{menuItem.title}</h3>
        <ReactMarkdown>{menuItem.description}</ReactMarkdown>
      </div>
      {menuItem.childContent && menuItem.childContent.length > 0 && (
        <ul
          className={`secondary-section ${
            noChildDescription ? "no-description" : ""
          }`}
        >
          {menuItem.childContent.map((child, index) => (
            <li key={index}>
              <a href={child.url}>{child.title}</a>
              {child.description && (
                <ReactMarkdown>{child.description}</ReactMarkdown>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MenuDesktopRichMenu;
