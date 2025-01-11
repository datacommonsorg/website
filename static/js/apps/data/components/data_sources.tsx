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
/** @jsxImportSource @emotion/react */

import React, { ReactElement } from "react";

import { Tabs } from "../../../components/elements/tabs/Tabs";
import { DemographicDataSources } from "./demographic_data_sources";

const demographicTabs = [
  {
    value: "demographics",
    label: "Demographics",
    content: <DemographicDataSources />,
  },
  {
    value: "economy",
    label: "Economy",
    content: <div>Some economy info</div>,
  },
  {
    value: "crime",
    label: "Crime",
    content: <div>Some crime info</div>,
  },
];

export const DataSources = (): ReactElement => {
  return <Tabs tabs={demographicTabs} defaultValue="demographics" />;
};
