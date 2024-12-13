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

/**
 * A tab component that represents a single tab button within a tab-set.
 * This must be used within a TabSet component which must in turn
 * be inside a Tabs component
 */

/** @jsxImportSource @emotion/react */
import { css, useTheme } from "@emotion/react";
import React, { ReactElement, useRef } from "react";

import { useTabsContext } from "./TabsContext";

export interface TabProps {
  //the label that displays at the top of the tab component
  label: string;
  //the value of the tab component - used to connect tabs with their tab panels
  value: string | number;
}

const Tab = ({ label, value }: TabProps): ReactElement => {
  const theme = useTheme();

  const { value: selectedValue, onChange } = useTabsContext();
  const tabRef = useRef<HTMLButtonElement>(null);

  const tabValue = value !== undefined ? value : label;

  const isSelected = selectedValue === tabValue;

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      aria-controls={`tabpanel-${tabValue}`}
      id={`tab-${tabValue}`}
      css={css`
        padding: 10px 20px;
        border: none;
        background: transparent;
        color: ${isSelected
          ? theme.colors.tabs.selected
          : theme.colors.tabs.unselected};
        cursor: pointer;
        margin-right: 2px;
        transition: color 0.3s ease;
      `}
      onClick={(): void => onChange(tabValue)}
      tabIndex={isSelected ? 0 : -1}
      ref={tabRef}
    >
      {label}
    </button>
  );
};

export default Tab;
