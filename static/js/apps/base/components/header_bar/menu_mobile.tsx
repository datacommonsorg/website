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

/* The content of the mobile version of the header */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, {
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ArrowBack } from "../../../../components/elements/icons/arrow_back";
import { ArrowForward } from "../../../../components/elements/icons/arrow_forward";
import { Close } from "../../../../components/elements/icons/close";
import { Menu } from "../../../../components/elements/icons/menu";
import {
  GA_EVENT_HEADER_CLICK,
  GA_PARAM_ID,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../../../../shared/ga_events";
import { HeaderMenu, Labels, Routes } from "../../../../shared/types/base";
import { resolveHref } from "../../utilities/utilities";
import MenuMobileRichMenu from "./menu_mobile_rich_menu";

interface MenuMobileProps {
  //the data that will populate the header menu.
  menu: HeaderMenu[];
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const MenuMobile = ({
  menu,
  labels,
  routes,
}: MenuMobileProps): ReactElement => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [selectedPrimaryItemIndex, setSelectedPrimaryItemIndex] = useState<
    number | null
  >(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const toggleDrawer = (): void => {
    setOpen(!open);
    setSelectedPrimaryItemIndex(null);
  };

  const handlePrimaryItemClick = (
    primaryItemIndex: number,
    id: string
  ): void => {
    triggerGAEvent(GA_EVENT_HEADER_CLICK, {
      [GA_PARAM_ID]: `mobile ${id}`,
    });
    setSelectedPrimaryItemIndex(primaryItemIndex);
  };

  const handleBackClick = (): void => {
    setSelectedPrimaryItemIndex(null);
  };

  const selectedPrimaryItem = useMemo(
    () =>
      selectedPrimaryItemIndex !== null ? menu[selectedPrimaryItemIndex] : null,
    [selectedPrimaryItemIndex, menu]
  );

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

  const headerLinks = useMemo(
    () => menu.filter((menuItem) => menuItem.exposeInMobileBanner),
    [menu]
  );

  const tabIndex = open ? 0 : -1;
  const slideLeft = selectedPrimaryItemIndex !== null;

  return (
    <div
      css={css`
        position: relative;
        display: flex;
        align-items: center;
        gap: ${theme.spacing.md}px;
        @media (max-width: 340px) {
          gap: ${theme.spacing.sm}px;
        }
      `}
    >
      <div>
        {headerLinks.map((menuItem) => (
          <a
            key={menuItem.label}
            href={resolveHref(menuItem.url, routes)}
            css={css`
              ${theme.typography.family.text};
              ${theme.typography.menu.xs};
              color: ${theme.colors.text.secondary.base};
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            `}
            onClick={(): boolean => {
              triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                [GA_PARAM_ID]: `mobile main ${menuItem.id}`,
                [GA_PARAM_URL]: menuItem.url,
              });
              return true;
            }}
          >
            {labels[menuItem.label]}
          </a>
        ))}
      </div>
      <button
        onClick={toggleDrawer}
        css={css`
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 0;
          margin: 0;
          padding: 0;
          background-color: transparent;
          cursor: pointer;
          color: ${theme.colors.text.secondary.base};
          font-size: 32px;
          transform: translateY(1px);
          @media (max-width: 340px) {
            font-size: 24px;
          }
        `}
      >
        <Menu />
      </button>

      <div
        onClick={toggleDrawer}
        css={css`
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 999;
          opacity: ${open ? "1" : "0"};
          pointer-events: ${open ? "auto" : "none"};
          transition: opacity 0.3s ease;
        `}
      />

      <div
        ref={drawerRef}
        css={css`
          position: fixed;
          top: 0;
          right: 0;
          height: 100%;
          background-color: ${theme.colors.background.primary.base};
          overflow: hidden;
          white-space: nowrap;
          transition: width 0.3s ease;
          ${theme.elevation.header.secondary};
          z-index: 1000;
          width: ${open ? "480px" : "0"};
          @media (max-width: 580px) {
            width: ${open ? "320px" : "0"};
          }
          @media (max-width: 400px) {
            width: ${open ? "280px" : "0"};
          }
        `}
      >
        <div
          css={css`
            display: block;
            width: 480px;
            @media (max-width: 580px) {
              width: 320px;
            }
            @media (max-width: 400px) {
              width: 280px;
            }
          `}
        >
          <div
            css={css`
              position: relative;
              display: flex;
              justify-content: space-between;
              flex-direction: row-reverse;
              align-items: center;
              padding: ${theme.spacing.sm}px ${theme.spacing.md}px;
              height: 50px;
              border-bottom: 1px solid #cccccc;
            `}
          >
            <button
              onClick={toggleDrawer}
              tabIndex={tabIndex}
              css={css`
                display: flex;
                justify-content: space-between;
                align-items: center;
                border: 0;
                margin: 0;
                padding: 0;
                background-color: transparent;
                cursor: pointer;
                color: ${theme.colors.text.secondary.base};
                font-size: 24px;
              `}
            >
              <Close />
            </button>
            {selectedPrimaryItemIndex !== null && (
              <button
                onClick={handleBackClick}
                tabIndex={tabIndex}
                css={css`
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border: 0;
                  margin: 0;
                  padding: 0;
                  background-color: transparent;
                  cursor: pointer;
                  color: ${theme.colors.text.secondary.base};
                  font-size: 24px;
                `}
              >
                <ArrowBack />
              </button>
            )}
          </div>

          <div
            css={css`
              display: grid;
              grid-template-columns: 1fr 1fr;
              width: 200%;
              min-height: calc(100vh - 50px);
              transition: transform 0.3s ease;
              transform: translateX(${slideLeft ? "-50%" : "0"});
            `}
          >
            <div
              css={css`
                box-sizing: border-box;
                width: 100%;
                max-height: calc(100vh - 50px);
                overflow-y: auto;
                white-space: normal;
                padding: ${theme.spacing.md}px;
                padding-bottom: 100px;
              `}
            >
              <ul
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: ${theme.spacing.md}px;
                  padding: 0;
                  margin: 0;
                  list-style: none;
                `}
              >
                {menu.map((item, index) => (
                  <li
                    key={index}
                    css={css`
                      display: flex;
                      justify-content: space-between;
                    `}
                  >
                    {item.url ? (
                      <a
                        href={resolveHref(item.url, routes)}
                        tabIndex={tabIndex}
                        css={css`
                          ${theme.typography.family.text};
                          ${theme.typography.menu.lg};
                          background-color: transparent;
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          padding: ${theme.spacing.sm}px 0;
                          width: 100%;
                          border: 0;
                          margin: 0;
                          color: ${theme.colors.text.primary.base};
                        `}
                        onClick={(): boolean => {
                          triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                            [GA_PARAM_ID]: `mobile submenu ${item.id}`,
                          });
                          return true;
                        }}
                      >
                        {labels[item.label]}
                      </a>
                    ) : (
                      <button
                        onClick={(): void =>
                          handlePrimaryItemClick(index, item.id)
                        }
                        tabIndex={tabIndex}
                        css={css`
                          ${theme.typography.family.text};
                          ${theme.typography.menu.lg};
                          background-color: transparent;
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          padding: ${theme.spacing.sm}px 0;
                          width: 100%;
                          border: 0;
                          margin: 0;
                          color: ${theme.colors.text.primary.base};
                        `}
                      >
                        <span>{labels[item.label]}</span>
                        <span
                          css={css`
                            display: flex;
                            align-items: center;
                            font-size: 24px;
                          `}
                        >
                          <ArrowForward />
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div
              css={css`
                box-sizing: border-box;
                width: 100%;
                max-height: calc(100vh - 50px);
                overflow-y: auto;
                white-space: normal;
                display: flex;
                flex-direction: column;
                gap: ${theme.spacing.xl}px;
                padding: ${theme.spacing.md}px;
                padding-bottom: 100px;
              `}
            >
              <MenuMobileRichMenu
                menuItem={selectedPrimaryItem}
                routes={routes}
                labels={labels}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuMobile;
