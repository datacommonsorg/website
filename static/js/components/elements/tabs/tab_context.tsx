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
 * A context use within the tab component to facilitate communication between the various sub-components
 * that make up a set of tabs.
 *
 */

import { createContext, useContext } from "react";

type TabValue = string | number;

interface TabContextProps {
  //the currently selected tab index
  value: TabValue;
  //the function used to handle changing of the tab value
  onChange: (value: TabValue) => void;
}

export const TabContext = createContext<TabContextProps | undefined>(undefined);

export const useTabContext = (): TabContextProps => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("A Tab component must be used within a Tabs component");
  }
  return context;
};
