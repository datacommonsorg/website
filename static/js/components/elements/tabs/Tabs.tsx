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
 * A tab component.
 *
 * Usage of the component is as follows:
 *
 * // set up the tabs, an array of TabDefinition
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
 * // place the tab component on the page:
 *
 * <Tabs tabs={demographicTabs} defaultValue="demographics" />;
 */

import React, { ReactElement, ReactNode, useState } from "react";

import { Tab } from "./Tab";
import { TabPanel } from "./TabPanel";
import TabsContext from "./TabsContext";
import { TabSet } from "./TabSet";

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

interface TabsProps {
  tabs: TabDefinition[];
  defaultValue?: string;
}

export function Tabs({ tabs, defaultValue }: TabsProps): ReactElement {
  const firstTabValue = tabs?.[0]?.value;
  const [activeTab, setActiveTab] = useState(defaultValue || firstTabValue);

  return (
    <TabsContext.Provider
      value={{
        value: activeTab,
        onChange: (val: string | number): void => setActiveTab(String(val)),
      }}
    >
      <TabSet>
        {tabs.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </TabSet>

      {tabs.map((t) => (
        <TabPanel key={t.value} value={t.value}>
          {t.content}
        </TabPanel>
      ))}
    </TabsContext.Provider>
  );
}
