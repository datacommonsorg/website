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
 * A component to display the "Data Sources" tab section
 */
/** @jsxImportSource @emotion/react */

import React, { ReactElement } from "react";

import { Tabs } from "../../../components/elements/tabs/tabs";
import { DataSourceDetails } from "./data_source_details";

interface DataSource {
  label: string;
  url: string;
  description?: string;
}

export interface DataSourceGroup {
  label: string;
  url: string;
  description?: string;
  dataSources: DataSource[];
}

export interface DataSourceTopic {
  title: string;
  slug: string;
  dataSourceGroups: DataSourceGroup[];
}

interface DataSourcesProps {
  dataSources: DataSourceTopic[];
}

export const DataSources = ({
  dataSources,
}: DataSourcesProps): ReactElement => {
  const dataSourceTabs = dataSources.map((topic) => ({
    value: topic.slug,
    label: topic.title,
    content: <DataSourceDetails dataSourceTopic={topic} />,
  }));
  console.log(dataSources);
  return (
    <Tabs
      mode="routed"
      basePath="/data"
      tabs={dataSourceTabs}
      defaultValue="demographics"
    />
  );
};
