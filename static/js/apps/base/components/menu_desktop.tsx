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

/* The content of the desktop version of the header */

import React, { ReactElement, useEffect, useRef, useState } from "react";

import { HeaderMenuV2, Labels, Routes } from "../../../shared/types/base";
import { resolveHref, slugify } from "../utilities/utilities";
import MenuDesktopRichMenu from "./menu_desktop_rich_menu";

interface MenuDesktopProps {
  //the data that will populate the header menu.
  menu: HeaderMenuV2[];
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const MenuDesktop = ({
  menu,
  labels,
  routes,
}: MenuDesktopProps): ReactElement => {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [panelHeight, setPanelHeight] = useState<number>(0);
  const submenuRefs = useRef<Array<HTMLDivElement | null>>([]);

  const resetMenu = (): void => {
    setOpenMenu(null);
    setPanelHeight(0);
  };

  const toggleMenu = (index: number): void => {
    openMenu === index ? resetMenu() : setOpenMenu(index);
  };

  const itemMenuTouch = (e: React.TouchEvent, index: number): void => {
    e.preventDefault();
    toggleMenu(index);
  };

  const handleOpenMenu = (index: number): void => {
    setOpenMenu(index);
  };

  const handleMouseLeave = (): void => {
    resetMenu();
  };

  useEffect(() => {
    if (openMenu !== null && submenuRefs.current[openMenu]) {
      setPanelHeight(submenuRefs.current[openMenu]?.scrollHeight || 0);
    }
  }, [openMenu]);

  return (
    <div className="header-menu" onMouseLeave={handleMouseLeave}>
      <ul>
        {menu.map((menuItem, index) => (
          <li
            key={menuItem.label}
            onFocus={(): void => !menuItem.url && handleOpenMenu(index)}
            onClick={(): void => !menuItem.url && toggleMenu(index)}
            onTouchEnd={(e): void => {
              if (!menuItem.url) itemMenuTouch(e, index);
            }}
          >
            {menuItem.url ? (
              <a href={resolveHref(menuItem.url, routes)}>
                {labels[menuItem.label]}
              </a>
            ) : (
              <>
                {labels[menuItem.label]}
                <div
                  ref={(el: HTMLDivElement | null): void => {
                    submenuRefs.current[index] = el;
                  }}
                  className="rich-menu-container"
                  aria-labelledby={slugify(`nav-${menuItem.label}-dropdown`)}
                  style={{
                    maxHeight: openMenu === index ? `${panelHeight}px` : 0,
                  }}
                >
                  <MenuDesktopRichMenu menuItem={menuItem} routes={routes} />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MenuDesktop;
