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

/** One.org: The content of the desktop version of the header */

import React, { ReactElement, useEffect, useRef, useState } from "react";

import { KeyboardArrowDown } from "../../../../../../components/elements/icons/keyboard_arrow_down";
import useEscapeKeyInputHandler from "../../../../../../shared/hooks/escape_key_handler";
import { slugify } from "../../../../../base/utilities/utilities";
import { MenuItems, prepareMenu } from "./menu";
import MenuDesktopRichMenu from "./menu_desktop_rich_menu";

interface MenuDesktopProps {
  //the root of the primary data.one.org site
  primarySiteWebRoot: string;
}

const MenuDesktop = ({
  primarySiteWebRoot,
}: MenuDesktopProps): ReactElement => {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [panelHeight, setPanelHeight] = useState<number>(0);
  const submenuRefs = useRef<Array<HTMLDivElement | null>>([]);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const menuItems = prepareMenu(MenuItems, primarySiteWebRoot);

  const resetMenu = (): void => {
    setOpenMenu(null);
    setPanelHeight(0);
  };

  const cancelScheduledClose = (): void => {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = (): void => {
    cancelScheduledClose();
    closeTimeoutRef.current = window.setTimeout(() => {
      resetMenu();
    }, 300);
  };

  const toggleMenu = (index: number): void => {
    openMenu === index ? resetMenu() : setOpenMenu(index);
  };

  useEffect(() => {
    return () => cancelScheduledClose();
  }, []);

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
    <div
      className="header-menu"
      ref={menuContainerRef}
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelScheduledClose}
    >
      <ul className="header-menu-list">
        {menuItems.map((menuItem, index) => {
          const buttonId = slugify(`nav-${menuItem.title}-button`);
          const dropdownId = slugify(`nav-${menuItem.title}-dropdown`);

          return (
            <li key={menuItem.title}>
              <button
                id={buttonId}
                className="menu-main-button"
                onClick={(): void => {
                  return toggleMenu(index);
                }}
                onTouchEnd={(e): void => {
                  if (!menuItem.url) itemMenuTouch(e, index);
                }}
                aria-expanded={openMenu === index}
                aria-controls={dropdownId}
              >
                <span className="menu-main-label">{menuItem.title}</span>
                <span
                  className={`menu-arrow-icon ${
                    openMenu === index ? "open" : ""
                  }`}
                >
                  <KeyboardArrowDown height={"24px"} color={"white"} />
                </span>
              </button>
              <div
                ref={(el: HTMLDivElement | null): void => {
                  submenuRefs.current[index] = el;
                }}
                id={dropdownId}
                className="rich-menu-container"
                aria-labelledby={buttonId}
                onMouseEnter={cancelScheduledClose}
                onMouseLeave={scheduleClose}
                style={{
                  maxHeight: openMenu === index ? `${panelHeight}px` : 0,
                }}
              >
                <MenuDesktopRichMenu
                  menuItem={menuItem}
                  open={openMenu === index}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div id="external">
        <a
          href="https://www.one.org"
          target="_blank"
          rel="noopener noreferrer"
          title="Go to: ONE.org (opens in a new tab)"
        >
          ONE.org
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            viewBox="0 -960 960 960"
            fill="currentColor"
          >
            <path d="m256-240-56-56 384-384H240v-80h480v480h-80v-344L256-240Z"></path>
          </svg>
        </a>
      </div>
      <div className={"panel"} style={{ height: panelHeight }} />
    </div>
  );
};

export default MenuDesktop;
