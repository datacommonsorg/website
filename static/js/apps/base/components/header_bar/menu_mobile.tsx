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

import React, {
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

  return (
    <div className="menu-mobile">
      <div className="header-links">
        {headerLinks.map((menuItem) => (
          <a
            key={menuItem.label}
            className="menu-main-link"
            href={resolveHref(menuItem.url, routes)}
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
      <button className="menu-toggle" onClick={toggleDrawer}>
        <span className="material-icons-outlined big">menu</span>
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
              onClick={toggleDrawer}
              className="menu-toggle"
              tabIndex={tabIndex}
            >
              <span className="material-icons-outlined">close</span>
            </button>
            {selectedPrimaryItemIndex !== null && (
              <button
                onClick={handleBackClick}
                className="menu-toggle"
                tabIndex={tabIndex}
              >
                <span className="material-icons-outlined">arrow_back</span>
              </button>
            )}
          </div>

          <div
            className={`slide-wrapper ${
              selectedPrimaryItemIndex !== null ? "slide-left" : ""
            }`}
          >
            <div className="panel left-panel">
              <ul className="menu-items">
                {menu.map((item, index) => (
                  <li key={index}>
                    {item.url ? (
                      <a
                        href={resolveHref(item.url, routes)}
                        className="menu-item-link"
                        onClick={(): boolean => {
                          triggerGAEvent(GA_EVENT_HEADER_CLICK, {
                            [GA_PARAM_ID]: `mobile submenu ${item.id}`,
                          });
                          return true;
                        }}
                        tabIndex={tabIndex}
                      >
                        {labels[item.label]}
                      </a>
                    ) : (
                      <>
                        <button
                          onClick={(): void =>
                            handlePrimaryItemClick(index, item.id)
                          }
                          className="menu-item-button"
                          tabIndex={tabIndex}
                        >
                          <span>{labels[item.label]}</span>
                          <span className="material-icons-outlined">
                            arrow_forward
                          </span>
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel right-panel">
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
