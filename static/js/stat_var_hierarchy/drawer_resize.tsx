/**
 * Copyright 2023 Google LLC
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

import React, { useState } from "react";

/**
 * Resizes and toggles visibility of sidebar (stat var selector) component
 */
export function DrawerResize(props: {
  collapsible: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  setWidth: (width: number) => void;
  sidebarRef: React.MutableRefObject<HTMLDivElement>;
}): JSX.Element {
  const { collapsible, isCollapsed, setIsCollapsed, setWidth, sidebarRef } =
    props;
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent) => {
      if (isResizing) {
        setWidth(
          mouseMoveEvent.clientX -
            sidebarRef.current.getBoundingClientRect().left
        );
      }
    },
    [isResizing]
  );

  React.useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <>
      {!isCollapsed && (
        <div
          className="stat-var-resize-handle"
          onMouseDown={(e): void => {
            e.preventDefault();
            startResizing();
          }}
        ></div>
      )}

      {collapsible && (
        <button
          id="explore-menu-toggle"
          onClick={(): void => {
            setIsCollapsed(!isCollapsed);
          }}
        >
          <span className="material-icons">
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      )}
    </>
  );
}
