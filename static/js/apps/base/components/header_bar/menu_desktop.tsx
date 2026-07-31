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
/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement, useEffect, useRef, useState } from "react";

import { KeyboardArrowDown } from "../../../../components/elements/icons/keyboard_arrow_down";
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
  const theme = useTheme();
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
    <div
      css={css`
        display: flex;
        align-items: center;
      `}
      ref={menuContainerRef}
    >
      <ul
        css={css`
          display: flex;
          align-items: stretch;
          margin: 0;
          padding: 0;
          @media (min-width: ${theme.breakpoints.xl}px) {
            gap: ${theme.spacing.xl}px;
          }
          @media (max-width: ${theme.breakpoints.xl}px) {
            gap: ${theme.spacing.md}px;
          }
        `}
      >
        {menu.map((menuItem, index) => {
          const buttonId = slugify(`nav-${menuItem.label}-button`);
          const dropdownId = slugify(`nav-${menuItem.label}-dropdown`);

          return (
            <li
              key={menuItem.label}
              css={css`
                display: flex;
                align-items: center;
                margin: 0;
                padding: 0;
              `}
            >
              {menuItem.url ? (
                <a
                  css={css`
                    ${theme.typography.family.text};
                    ${theme.typography.text.sm};
                    display: flex;
                    align-items: center;
                    padding: 8px 0;
                    color: ${theme.colors.text.primary.base};
                    transition: color 0.3s ease-in-out;
                    &:hover {
                      color: ${theme.colors.link.primary.base};
                      text-decoration: none;
                    }
                  `}
                  href={resolveHref(menuItem.url, routes)}
                  onClick={(): boolean => {
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
                    id={buttonId}
                    css={css`
                      display: flex;
                      align-items: center;
                      ${theme.typography.family.text};
                      ${theme.typography.text.sm};
                      border: 0;
                      padding: ${theme.spacing.sm}px 0;
                      margin: 0;
                      background-color: transparent;
                      transition: color 0.3s ease-in-out;
                      &:hover span {
                        color: ${theme.colors.link.primary.base};
                        text-decoration: none;
                      }
                    `}
                    onClick={(): void => {
                      triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                        [GA_PARAM_ID]: `desktop ${menuItem.id}`,
                      });
                      return !menuItem.url && toggleMenu(index);
                    }}
                    onTouchEnd={(e): void => {
                      if (!menuItem.url) itemMenuTouch(e, index);
                    }}
                    aria-expanded={openMenu === index}
                    aria-controls={dropdownId}
                  >
                    <span
                      css={css`
                        display: inline-block;
                        color: ${theme.colors.text.primary.base};
                        transition: color 0.3s ease-in-out;
                        transform: translateY(-1px);
                      `}
                    >
                      {labels[menuItem.label]}
                    </span>
                    <span
                      css={css`
                        display: inline-block;
                        transition: transform 0.3s ease;
                        transform: ${openMenu === index
                          ? "rotate(180deg)"
                          : "rotate(0deg)"};
                      `}
                    >
                      <KeyboardArrowDown
                        height={"24px"}
                        color={theme.colors.text.secondary.base}
                      />
                    </span>
                  </button>
                  <div
                    ref={(el: HTMLDivElement | null): void => {
                      submenuRefs.current[index] = el;
                    }}
                    id={dropdownId}
                    aria-labelledby={buttonId}
                    css={css`
                      position: fixed;
                      z-index: 1000;
                      top: ${theme.header.lg}px;
                      left: 0;
                      right: 0;
                      width: 100vw;
                      overflow: hidden;
                      background: ${theme.colors.background.primary.base};
                      transition: max-height 0.4s ease-in-out;
                      max-height: ${openMenu === index
                        ? `${panelHeight}px`
                        : "0"};
                    `}
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
          );
        })}
      </ul>
      <div
        css={css`
          ${theme.elevation.header.secondary};
          width: 100vw;
          left: 0;
          right: 0;
          position: absolute;
          z-index: 950;
          top: ${theme.header.lg}px;
          background: ${theme.colors.background.primary.base};
          overflow: hidden;
          transition: height 0.4s ease-in-out;
          height: ${panelHeight}px;
        `}
      />
    </div>
  );
};

export default MenuDesktop;
