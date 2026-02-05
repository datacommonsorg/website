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

/** One.org: The content of the mobile version of the header */

import React, { ReactElement, useEffect, useRef, useState } from "react";

import { Menu } from "../../../../../../components/elements/icons/menu";
import { MenuItems, prepareMenu } from "./menu";
import MenuMobileRichMenu from "./menu_mobile_rich_menu";

interface MenuMobileProps {
  //the root of the primary data.one.org site
  primarySiteWebRoot: string;
}

const MenuMobile = ({ primarySiteWebRoot }: MenuMobileProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [selectedPrimaryItemIndex, setSelectedPrimaryItemIndex] = useState<
    number | null
  >(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const menuItems = prepareMenu(MenuItems, primarySiteWebRoot);

  const toggleDrawer = (): void => {
    setOpen(!open);
    setSelectedPrimaryItemIndex(null);
  };

  useEffect(() => {
    if (open) {
      document.body.classList.add("drawer-open");
    } else {
      document.body.classList.remove("drawer-open");
    }

    return () => {
      document.body.classList.remove("drawer-open");
    };
  }, [open]);

  const tabIndex = open ? 0 : -1;

  return (
    <div className="menu-mobile">
      <button className="menu-toggle" onClick={toggleDrawer}>
        <Menu color={"white"} />
      </button>

      <div className={`overlay ${open ? "open" : ""}`} onClick={toggleDrawer} />

      <div
        className={`drawer ${open ? "open" : ""}`}
        style={{ width: open ? "" : 0 }}
        ref={drawerRef}
      >
        <div className="paper">
          <div className="header">
            <button
              type="button"
              className="menu-toggle menu-toggle-close"
              onClick={toggleDrawer}
              tabIndex={tabIndex}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                width="24"
                fill="currentColor"
              >
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"></path>
              </svg>
            </button>
          </div>

          <div
            className={`slide-wrapper ${
              selectedPrimaryItemIndex !== null ? "slide-left" : ""
            }`}
          >
            <div className="panel">
              {menuItems.map((menuItem) => (
                <MenuMobileRichMenu key={menuItem.id} menuItem={menuItem} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuMobile;
