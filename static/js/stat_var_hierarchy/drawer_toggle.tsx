/**
 * Copyright 2021 Google LLC
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

/* A simple component to toggle the visibility state of the stat var widget */

import React, { useEffect, useState } from "react";

// NOTE: Timing is also used in stat_var_widget.scss
const VISIBLE_DELAY_MS = 225;
const COLLAPSE_CLASS = "collapsed";
const HIDE_CLASS = "hidden";

interface DrawerToggleProps {
  // ID of the DOM Element to toggle by applying the class "collapsed" to.
  collapseElemId: string;
  // ID of the DOM Element to toggle visibility by applying the class "hide" during transitions.
  visibleElemId: string;
}

export function DrawerToggle(props: DrawerToggleProps): JSX.Element {
  const [isCollapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const visibleElem = document.getElementById(props.visibleElemId);
    const collapseElem = document.getElementById(props.collapseElemId);
    if (visibleElem && collapseElem) {
      if (isCollapsed) {
        visibleElem.classList.add(HIDE_CLASS);
        collapseElem.classList.add(COLLAPSE_CLASS);
      } else {
        collapseElem.classList.remove(COLLAPSE_CLASS);
        setTimeout(() => {
          visibleElem.classList.remove(HIDE_CLASS);
        }, VISIBLE_DELAY_MS);
      }
    }
  }, [isCollapsed]);

  return (
    <button
      id="explore-menu-toggle"
      onClick={() => {
        setCollapsed(!isCollapsed);
      }}
    >
      <span className="material-icons">
        {isCollapsed ? "chevron_right" : "chevron_left"}
      </span>
    </button>
  );
}
