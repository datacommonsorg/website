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
 *     value: "demographics",
 *     label: "Demographics",
 *     content: <DemographicDataSources />,
 *   },
 *   {
 *     value: "economy",
 *     label: "Economy",
 *     content: <div>Some economy info</div>,
 *   },
 *   {
 *     value: "crime",
 *     label: "Crime",
 *     content: <div>Some crime info</div>,
 *   },
 * ];
 *
 * // display a standard tab component:
 * <Tabs
 *   mode="standard" //this can be omitted
 *   basePath="/path/to/page" //such as "/data"
 *   tabs={demographicTabs}
 *   defaultValue="demographics"
 * />
 *
 * // display a routed tab component:
 * <Tabs
 *   mode="routed"
 *   basePath="/some/base/path"
 *   tabs={demographicTabs}
 *   defaultValue="demographics"
 * />
 */

import React, { ReactElement, ReactNode, useState } from "react";

import { useRoutedTabs } from "./routed_tabs";
import { Tab } from "./tab";
import { TabContext } from "./tab_context";
import { TabPanel } from "./tab_panel";
import { TabSet, TabSetAlignment } from "./tab_set";

// An interface representing the definition of a tab.
// An array of these are sent into the tab component.
export interface TabDefinition {
  //the value of a tab: this is an id or slug.
  value: string;
  //the label that appears in the tab selector
  label: string;
  //the content of the tab that appears when the tab is selected.
  content: ReactNode;
}

// tab props required for both tab modes
interface BaseTabsProps {
  // a list of the tabs that populate this component
  tabs: TabDefinition[];
  // the default tab: if omitted, defaults to the value of the first tab
  defaultValue?: string;
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

export function Tabs({
  tabs,
  defaultValue,
  alignment,
  mode = "standard",
  basePath = "",
}: TabsProps): ReactElement {
  const firstTabValue = tabs[0]?.value ?? "";
  const fallbackDefault = defaultValue || firstTabValue;

  const [localActiveTab, setLocalActiveTab] = useState(fallbackDefault);

  const { activeTab: routedActiveTab, onTabChange: routedOnChange } =
    useRoutedTabs({
      enabled: mode === "routed",
      tabValues: tabs.map((t) => t.value),
      defaultValue: fallbackDefault,
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
        value: activeTab,
        onChange: onTabChange,
      }}
    >
      <TabSet alignment={alignment}>
        {tabs.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </TabSet>

      {tabs.map((t) => (
        <TabPanel key={t.value} value={t.value}>
          {t.content}
        </TabPanel>
      ))}
    </TabContext.Provider>
  );
}
