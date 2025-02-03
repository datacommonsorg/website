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

/**
 * A tab component that represents a single tab button within a tab-set.
 *
 * This must be used within a TabSet component which must in turn
 * be inside a Tabs component.
 */

/** @jsxImportSource @emotion/react */
import { css, useTheme } from "@emotion/react";
import React, { ReactElement, useRef } from "react";

import { useTabContext } from "./tab_context";

export interface TabProps {
  // the label that displays at the top of the tab component
  label: string;
  // the corresponding route of the tab component:
  // used to connect tabs and routes with their tab panel
  route: string | number;
}

export const Tab = ({ label, route }: TabProps): ReactElement => {
  const theme = useTheme();

  const { route: selectedRoute, onChange } = useTabContext();
  const tabRef = useRef<HTMLButtonElement>(null);

  const tabRoute = route !== undefined ? route : label;

  const isSelected = selectedRoute === tabRoute;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(tabRoute);
    }
  };

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      aria-controls={`tabpanel-${tabRoute}`}
      id={`tab-${tabRoute}`}
      css={css`
        padding: ${theme.spacing.md}px 0;
        margin: 0 ${theme.spacing.lg}px;
        border: none;
        background: transparent;
        color: ${isSelected
          ? theme.colors.tabs.selected
          : theme.colors.tabs.unselected};
        cursor: pointer;
        transition: color 0.3s ease;
      `}
      onClick={(): void => onChange(tabRoute)}
      onKeyDown={handleKeyDown}
      tabIndex={isSelected ? 0 : -1}
      ref={tabRef}
    >
      {label}
    </button>
  );
};
