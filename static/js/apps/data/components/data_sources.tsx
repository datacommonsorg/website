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
 * A component to display the "Data Sources" tab section
 */

import React, { ReactElement, useState } from "react";

import Tab from "../../../components/elements/tabs/Tab";
import TabPanel from "../../../components/elements/tabs/TabPanel";
import Tabs from "../../../components/elements/tabs/Tabs";
import TabSet from "../../../components/elements/tabs/TabSet";

export const DataSources = (): ReactElement => {
  const [value, setValue] = useState<string | number>("one");

  const handleChange = (newValue: string | number): void => {
    setValue(newValue);
  };

  return (
    <Tabs value={value} onChange={handleChange}>
      <TabSet>
        <Tab value="one" label="Item One" />
        <Tab value="two" label="Item Two" />
        <Tab value="three" label="Item Three" />
      </TabSet>

      <TabPanel value="one">
        <h2>Content for Item One</h2>
        <p>This is the content for the first tab.</p>
      </TabPanel>
      <TabPanel value="two">
        <h2>Content for Item Two</h2>
        <p>This is the content for the second tab.</p>
      </TabPanel>
      <TabPanel value="three">
        <h2>Content for Item Three</h2>
        <p>This is the content for the third tab.</p>
      </TabPanel>
    </Tabs>
  );
};
