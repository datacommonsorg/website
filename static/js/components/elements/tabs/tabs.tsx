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
 * A tab component.
 *
 * Usage of the component is as follows:
 *
 * // set up the tabs, an array of TabDefinition:
 *
 * const demographicTabs = [
 *   {
 *     label: "Demographics",
 *     content: <DemographicDataSources />,
 *   },
 *   {
 *     label: "Economy",
 *     content: <div>Some economy info</div>,
 *   },
 *   {
 *     label: "Crime",
 *     content: <div>Some crime info</div>,
 *   },
 * ];
 *
 * // if you wish to give routes that are different from
 * // auto-slugified labels, you can provide them explicitly:
 *
 * // set up the tabs, an array of TabDefinition:
 *
 * const demographicTabs = [
 *   {
 *     route: "demographics",
 *     label: "Demographics Statics",
 *     content: <DemographicDataSources />,
 *   },
 *   {
 *     route: "economy",
 *     label: "Economic Statistics",
 *     content: <div>Some economy info</div>,
 *   },
 *   {
 *     route: "crime",
 *     label: "Crime Statistics",
 *     content: <div>Some crime info</div>,
 *   },
 * ];
 *
 * // display a standard tab component:
 * <Tabs
 *   mode="standard" //this can be omitted
 *   basePath="/path/to/page" //such as "/data"
 *   tabs={demographicTabs}
 *   defaultRoute="demographics"
 * />
 *
 * // display a routed tab component:
 * <Tabs
 *   mode="routed"
 *   basePath="/some/base/path"
 *   tabs={demographicTabs}
 *   defaultRoute="demographics"
 * />
 */

import React, { ReactElement, ReactNode, useMemo, useState } from "react";

import { slugify } from "../../../apps/base/utilities/utilities";
import { useRoutedTabs } from "./routed_tabs";
import { Tab } from "./tab";
import { TabContext } from "./tab_context";
import { TabPanel } from "./tab_panel";
import { TabSet, TabSetAlignment } from "./tab_set";

// An interface representing the definition of a tab.
// An array of these are sent into the tab component.
export interface TabDefinition {
  //the route of a tab: this is an id or slug. for routed tabs, will
  // appear in the url.
  route?: string;
  //the label that appears in the tab selector
  label: string;
  //the content of the tab that appears when the tab is selected.
  content: ReactNode;
}

// tab props required for both tab modes
interface BaseTabsProps {
  // a list of the tabs that populate this component
  tabs: TabDefinition[];
  // the default tab: if omitted, defaults to the route of the first tab
  defaultRoute?: string;
  // the alignment of the tabs within the tab-set.
  alignment?: TabSetAlignment;
}

// tab props required for the standard tab mode
interface StandardTabsProps extends BaseTabsProps {
  // in standard mode, the tab set will operate purely on state
  mode?: "standard";
  // the base path: not allowed in standard tab mode.
  basePath?: never;
}

// tab props required for the routed tab mode
interface RoutedTabsProps extends BaseTabsProps {
  // a routed tab will operate based on the url.
  mode: "routed";
  // the base path: the base path of the page the tabs reside in (i.e., "/data")
  basePath: string;
}

export type TabsProps = StandardTabsProps | RoutedTabsProps;

const isValidRoute = (route: string): boolean => {
  const validRoutePattern = /^[a-zA-Z0-9-_]+$/;
  return validRoutePattern.test(route);
};

export function Tabs({
  tabs,
  defaultRoute,
  alignment,
  mode = "standard",
  basePath = "",
}: TabsProps): ReactElement {
  const processedTabs: TabDefinition[] = useMemo(() => {
    const processed = tabs.map((tab) => ({
      ...tab,
      route: tab.route ?? slugify(tab.label),
    }));

    processed.forEach((tab) => {
      if (!isValidRoute(tab.route)) {
        throw new Error(
          `Invalid route "${tab.route}" for tab "${tab.label}". Routes cannot contain "/", spaces, or special characters.`
        );
      }
    });

    const routes = processed.map((t) => t.route);
    const routeSet = new Set(routes);
    // if the number of unique routes is less than the total, we have duplicates.
    if (routeSet.size !== routes.length) {
      const duplicates = routes.filter(
        (route, index) => routes.indexOf(route) !== index
      );
      const uniqueDuplicates = Array.from(new Set(duplicates));

      throw new Error(
        `Tabs component has duplicate routes: ${uniqueDuplicates.join(", ")}.`
      );
    }

    return processed;
  }, [tabs]);

  const firstTabRoute = processedTabs[0]?.route ?? "";
  const fallbackDefault = defaultRoute || firstTabRoute;

  const [localActiveTab, setLocalActiveTab] = useState(fallbackDefault);

  const { activeTab: routedActiveTab, onTabChange: routedOnChange } =
    useRoutedTabs({
      enabled: mode === "routed",
      tabRoutes: processedTabs.map((t) => t.route),
      defaultRoute: fallbackDefault,
      basePath,
    });

  const activeTab = mode === "routed" ? routedActiveTab : localActiveTab;
  const onTabChange =
    mode === "routed"
      ? (val: string | number): void => routedOnChange(val)
      : (val: string | number): void => setLocalActiveTab(String(val));

  return (
    <TabContext.Provider
      value={{
        route: activeTab,
        onChange: onTabChange,
      }}
    >
      <TabSet alignment={alignment}>
        {processedTabs.map((t) => (
          <Tab key={t.route} route={t.route} label={t.label} />
        ))}
      </TabSet>

      {processedTabs.map((t) => (
        <TabPanel key={t.route} route={t.route}>
          {t.content}
        </TabPanel>
      ))}
    </TabContext.Provider>
  );
}
