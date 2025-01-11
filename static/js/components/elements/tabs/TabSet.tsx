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
 * A tab-set component that contains tabs and manages layout and keyboard
 * navigation for those tabs. This must be used within a Tabs component
 */

/** @jsxImportSource @emotion/react */
import { css, useTheme } from "@emotion/react";
import React, {
  FocusEvent,
  KeyboardEvent,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";

import { TabProps } from "./Tab";
import { useTabsContext } from "./TabsContext";

interface TabSetProps {
  //The children, which are <Tab> components, the tab buttons that switch the panels
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
}

export const TabSet = ({ children }: TabSetProps): ReactElement => {
  const theme = useTheme();
  const { value: selectedValue, onChange } = useTabsContext();
  const tabSetRef = useRef<HTMLDivElement>(null);

  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const activeTab = tabSetRef.current?.querySelector(
      '[aria-selected="true"]'
    ) as HTMLElement;
    if (activeTab) {
      const { offsetLeft, clientWidth } = activeTab;
      setIndicatorStyle({ left: offsetLeft, width: clientWidth });
    }
  }, [children, selectedValue]);

  const focusSelectedTab = (): void => {
    const tabs = Array.from(
      tabSetRef.current?.querySelectorAll('[role="tab"]') ?? []
    ) as HTMLElement[];
    if (tabs.length === 0) return;

    const selectedTabIndex = tabs.findIndex(
      (tab) => tab.getAttribute("aria-selected") === "true"
    );
    if (selectedTabIndex >= 0) {
      tabs[selectedTabIndex].focus();
    } else {
      tabs[0].focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const tabs = Array.from(
      tabSetRef.current?.querySelectorAll('[role="tab"]') ?? []
    ) as HTMLElement[];
    if (tabs.length === 0) return;

    const focusedElement = document.activeElement as HTMLElement;
    const currentIndex = tabs.indexOf(focusedElement);

    if (
      currentIndex === -1 &&
      (e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        e.key === "Enter" ||
        e.key === " ")
    ) {
      e.preventDefault();
      focusSelectedTab();
      return;
    }

    switch (e.key) {
      case "ArrowRight": {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabs[nextIndex].focus();
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        tabs[prevIndex].focus();
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        const focusedTab = tabs[currentIndex];
        if (focusedTab) {
          const tabValue = focusedTab.getAttribute("data-tab-value");
          if (tabValue) {
            onChange(tabValue);
          }
        }
        break;
      }
      default:
        break;
    }
  };

  const handleFocus = (e: FocusEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      focusSelectedTab();
    }
  };

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <div
        css={css`
          display: flex;
          margin-bottom: ${theme.spacing.md}px;
          border-bottom: 1px solid ${theme.colors.tabs.lining};
        `}
        role="tablist"
        aria-label="tabs"
        ref={tabSetRef}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        tabIndex={0}
      >
        {children}
      </div>
      <span
        css={css`
          position: absolute;
          bottom: 0;
          left: ${indicatorStyle.left}px;
          width: ${indicatorStyle.width}px;
          height: 3px;
          background-color: ${theme.colors.tabs.selected};
          transition: left 0.2s ease, width 0.2s ease;
        `}
      />
    </div>
  );
};
