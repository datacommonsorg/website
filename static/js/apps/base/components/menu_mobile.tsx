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

import { HeaderMenuV2, Labels, Routes } from "../../../shared/types/base";
import { resolveHref } from "../utilities/utilities";
import MenuMobileRichMenu from "./menu_mobile_rich_menu";

interface MenuMobileProps {
  //the name of the application (this may not be "Data Commons" in forked versions).
  name: string;
  //the data that will populate the header menu.
  menu: HeaderMenuV2[];
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

const MenuMobile = ({
  name,
  menu,
  labels,
  routes,
}: MenuMobileProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(0);
  const [selectedPrimaryItemIndex, setSelectedPrimaryItemIndex] = useState<
    number | null
  >(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const toggleDrawer = (): void => {
    setOpen(!open);
    setSelectedPrimaryItemIndex(null);
  };

  const handlePrimaryItemClick = (primaryItemIndex: number): void => {
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
    if (open && drawerRef.current) {
      setDrawerWidth(drawerRef.current.scrollWidth / 2);
    } else {
      setDrawerWidth(0);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const headerLinks = useMemo(
    () => menu.filter((menuItem) => menuItem.exposeInMobileBanner),
    [menu]
  );

  return (
    <div className="menu-mobile">
      <div className="header-links">
        {headerLinks.map((menuItem) => (
          <a
            key={menuItem.label}
            className="menu-main-link"
            href={resolveHref(menuItem.url, routes)}
          >
            {labels[menuItem.label]}
          </a>
        ))}
      </div>
      <button className="menu-toggle" onClick={toggleDrawer}>
        <span className="material-icons-outlined">menu</span>
      </button>

      <div className={`overlay ${open ? "open" : ""}`} onClick={toggleDrawer} />

      <div
        className={`drawer ${open ? "open" : ""}`}
        style={{ width: open ? `${drawerWidth}px` : 0 }}
        ref={drawerRef}
      >
        <div className="paper">
          <div className="header">
            <h3 style={{ textAlign: "center", margin: 0 }}>{name}</h3>
            {selectedPrimaryItemIndex !== null ? (
              <button onClick={handleBackClick} className="menu-toggle">
                <span className="material-icons-outlined">arrow_back</span>
              </button>
            ) : (
              <button onClick={toggleDrawer} className="menu-toggle">
                <span className="material-icons-outlined">close</span>
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
                      >
                        {labels[item.label]}
                      </a>
                    ) : (
                      <>
                        <button
                          onClick={(): void => handlePrimaryItemClick(index)}
                          className="menu-item-button"
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
