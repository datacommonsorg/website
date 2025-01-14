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
 * A tab-set component that contains tabs and manages layout and keyboard
 * navigation for those tabs. This must be used within a Tabs component
 */

/** @jsxImportSource @emotion/react */
import { css, useTheme } from "@emotion/react";
import React, {
  KeyboardEvent,
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { KeyboardArrowLeft } from "../icons/keyboard_arrow_left";
import { KeyboardArrowRight } from "../icons/keyboard_arrow_right";
import { TabProps } from "./tab";
import { useTabContext } from "./tab_context";

interface TabSetProps {
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
}

export const TabSet = ({ children }: TabSetProps): ReactElement => {
  const theme = useTheme();
  const { value: selectedValue, onChange } = useTabContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabSetRef = useRef<HTMLDivElement>(null);

  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({
    left: 0,
    width: 0,
  });

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const scrollTabIntoView = useCallback(
    (tab: HTMLElement, container: HTMLDivElement): void => {
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();

      if (tabRect.left < containerRect.left) {
        container.scrollLeft -= containerRect.left - tabRect.left;
      }
      if (tabRect.right > containerRect.right) {
        container.scrollLeft += tabRect.right - containerRect.right;
      }
    },
    []
  );

  const calculateSelectedTabIndicator = useCallback((): void => {
    if (!tabSetRef.current || !scrollContainerRef.current) return;
    const activeTab = tabSetRef.current.querySelector(
      '[aria-selected="true"]'
    ) as HTMLElement;
    if (!activeTab) return;

    const left = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;

    setIndicatorStyle({ left, width });
  }, []);

  const scrollActiveTabIntoView = useCallback((): void => {
    if (!tabSetRef.current || !scrollContainerRef.current) return;
    const activeTab = tabSetRef.current.querySelector(
      '[aria-selected="true"]'
    ) as HTMLElement;
    if (activeTab && scrollContainerRef.current) {
      scrollTabIntoView(activeTab, scrollContainerRef.current);
    }
  }, [scrollTabIntoView]);

  useEffect(() => {
    calculateSelectedTabIndicator();
    scrollActiveTabIntoView();
  }, [
    children,
    selectedValue,
    calculateSelectedTabIndicator,
    scrollActiveTabIntoView,
  ]);

  const handleScroll = useCallback((): void => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    handleScroll();
  }, [children, handleScroll]);

  useEffect(() => {
    const handleResize = (): void => {
      handleScroll();
      calculateSelectedTabIndicator();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleScroll, calculateSelectedTabIndicator]);

  const scrollLeft = useCallback((): void => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: -scrollContainerRef.current.clientWidth,
      behavior: "smooth",
    });
  }, []);

  const scrollRight = useCallback((): void => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: scrollContainerRef.current.clientWidth,
      behavior: "smooth",
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>): void => {
      const focusSelectedTab = (): void => {
        const tabs = Array.from(
          tabSetRef.current?.querySelectorAll('[role="tab"]') ?? []
        ) as HTMLElement[];
        if (!tabs.length) return;

        const selectedTabIndex = tabs.findIndex(
          (tab) => tab.getAttribute("aria-selected") === "true"
        );
        if (selectedTabIndex >= 0) {
          tabs[selectedTabIndex].focus();
        } else {
          tabs[0].focus();
        }
      };

      const tabs = Array.from(
        tabSetRef.current?.querySelectorAll('[role="tab"]') ?? []
      ) as HTMLElement[];
      if (!tabs.length) return;

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
          if (scrollContainerRef.current) {
            scrollTabIntoView(tabs[nextIndex], scrollContainerRef.current);
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          tabs[prevIndex].focus();
          if (scrollContainerRef.current) {
            scrollTabIntoView(tabs[prevIndex], scrollContainerRef.current);
          }
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
              if (scrollContainerRef.current) {
                scrollTabIntoView(focusedTab, scrollContainerRef.current);
              }
            }
          }
          break;
        }
        default:
          break;
      }
    },
    [onChange, scrollTabIntoView]
  );

  return (
    <div
      css={css`
        position: relative;
        border-bottom: 1px solid ${theme.colors.tabs.lining};
      `}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={scrollLeft}
        disabled={!showLeftArrow}
        css={css`
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          top: 0;
          bottom: 0;
          left: 0;
          background: white;
          border: none;
          cursor: pointer;
          opacity: ${showLeftArrow ? 1 : 0};
          pointer-events: ${showLeftArrow ? "auto" : "none"};
          z-index: 2;
          transition: opacity 0.2s;
        `}
        aria-label="Scroll tabs left"
      >
        <KeyboardArrowLeft />
      </button>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        css={css`
          position: relative;
          height: 100%;
          margin: 0;
          overflow-x: auto;
          white-space: nowrap;
          scroll-behavior: smooth;

          display: flex;
          align-items: flex-end;
          gap: 0;

          -ms-overflow-style: none;
          scrollbar-width: none;
          &::-webkit-scrollbar {
            display: none;
          }
        `}
      >
        <div
          ref={tabSetRef}
          css={css`
            display: flex;
            align-items: flex-end;
            height: 100%;
            gap: 0;
          `}
          role="tablist"
          aria-label="tabs"
        >
          {children}
        </div>

        <span
          css={css`
            position: absolute;
            bottom: 0;
            height: 3px;
            background-color: ${theme.colors.tabs.selected};
            transition: left 0.2s ease, width 0.2s ease;
            pointer-events: none;
          `}
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>

      <button
        type="button"
        onClick={scrollRight}
        disabled={!showRightArrow}
        css={css`
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background: white;
          border: none;
          cursor: pointer;
          opacity: ${showRightArrow ? 1 : 0};
          pointer-events: ${showRightArrow ? "auto" : "none"};
          z-index: 2;
          transition: opacity 0.2s;
        `}
        aria-label="Scroll tabs right"
      >
        <KeyboardArrowRight />
      </button>
    </div>
  );
};
