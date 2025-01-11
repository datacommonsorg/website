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
 * A hook used to provide routing functionality to tabs that are set to "routed" mode. It takes an
 * enabled flag to turn off the functionality when we are in standard mode.
 */

import { useEffect, useState } from "react";

interface RoutedTabsProps {
  // enabled is true if routing logic is enabled (to prevent routing updates on a standard tab)
  enabled?: boolean;
  // The list of all possible tab values (the routes)
  tabValues: string[];
  // The default tab to use when there's no valid match in the URL
  defaultValue: string;
  // A base path of the page on which the tab component resides
  basePath?: string;
}

interface RoutedTabsInterface {
  //the currently active tab value
  activeTab: string;
  //a function to handle tab changes
  onTabChange: (newValue: string | number) => void;
}

export function useRoutedTabs({
  enabled = true,
  tabValues,
  defaultValue,
  basePath = "",
}: RoutedTabsProps): RoutedTabsInterface {
  const [activeTab, setActiveTab] = useState<string>(defaultValue);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const syncSelectedTabToUrl = (): void => {
      const pathParts = window.location.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1] || "";

      if (
        tabValues.includes(lastPart) &&
        window.location.pathname === `${basePath}/${lastPart}`
      ) {
        setActiveTab(lastPart);
      } else {
        setActiveTab(defaultValue);
        window.history.replaceState({}, "", `${basePath}/${defaultValue}`);
      }
    };

    syncSelectedTabToUrl();

    const handlePopState = (): void => {
      syncSelectedTabToUrl();
    };
    window.addEventListener("popstate", handlePopState);

    return (): void => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled, basePath, defaultValue, tabValues]);

  const onTabChange = (newValue: string | number): void => {
    if (!enabled) {
      return;
    }
    setActiveTab(String(newValue));
    window.history.pushState({}, "", `${basePath}/${newValue}`);
  };

  return {
    activeTab,
    onTabChange,
  };
}
