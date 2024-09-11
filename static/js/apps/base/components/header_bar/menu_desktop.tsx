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

/** The content of the desktop version of the header */

import React, { ReactElement, useEffect, useRef, useState } from "react";

import {
  GA_EVENT_HEADER_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../../../shared/ga_events";
import useEscapeKeyInputHandler from "../../../../shared/hooks/escape_key_handler";
import { HeaderMenu, Labels, Routes } from "../../../../shared/types/base";
import { resolveHref, slugify } from "../../utilities/utilities";
import MenuDesktopRichMenu from "./menu_desktop_rich_menu";

interface MenuDesktopProps {
  //the data that will populate the header menu.
  menu: HeaderMenu[];
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
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const resetMenu = (): void => {
    setOpenMenu(null);
    setPanelHeight(0);
  };

  const toggleMenu = (index: number): void => {
    openMenu === index ? resetMenu() : setOpenMenu(index);
  };

  useEscapeKeyInputHandler(() => {
    resetMenu();
  });

  const itemMenuTouch = (e: React.TouchEvent, index: number): void => {
    e.preventDefault();
    toggleMenu(index);
  };

  useEffect(() => {
    if (openMenu !== null && submenuRefs.current[openMenu]) {
      setPanelHeight(submenuRefs.current[openMenu]?.scrollHeight || 0);
    }
  }, [openMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node) &&
        !submenuRefs.current.some((ref) => ref?.contains(event.target as Node))
      ) {
        resetMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu]);

  return (
    <div className="header-menu" ref={menuContainerRef}>
      <ul className="header-menu-list">
        {menu.map((menuItem, index) => (
          <li key={menuItem.label}>
            {menuItem.url ? (
              <a
                className="menu-main-link"
                href={resolveHref(menuItem.url, routes)}
                onClick={() => {
                  triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                    [GA_PARAM_ID]: `desktop main ${menuItem.id}`,
                    [GA_PARAM_URL]: menuItem.url,
                  });
                  return true;
                }}
              >
                {labels[menuItem.label]}
              </a>
            ) : (
              <>
                <button
                  className="menu-main-button"
                  onClick={(): void => {
                    triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                      [GA_PARAM_ID]: `desktop ${menuItem.id}`,
                    });
                    return !menuItem.url && toggleMenu(index);
                  }}
                  onTouchEnd={(e): void => {
                    if (!menuItem.url) itemMenuTouch(e, index);
                  }}
                >
                  <span className="menu-main-label">
                    {labels[menuItem.label]}
                  </span>
                  <span
                    className={`material-icons-outlined menu-main-label menu-arrow-icon ${
                      openMenu === index ? "open" : ""
                    }`}
                  >
                    keyboard_arrow_down
                  </span>
                </button>
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
                  <MenuDesktopRichMenu
                    menuItem={menuItem}
                    labels={labels}
                    routes={routes}
                    open={openMenu === index}
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className={"panel"} style={{ height: panelHeight }} />
    </div>
  );
};

export default MenuDesktop;
