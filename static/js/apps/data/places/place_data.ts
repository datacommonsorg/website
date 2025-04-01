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
 * Types relating to place data sources
 */

/*
  TODO (Nick): Once the final data is confirmed, consider merging
               these with with the types found in /data
 */

import { Query } from "../../../shared/topic_config";

export interface Place {
  dcid: string;
  name: string;
}

interface Topic {
  title: string;
  examples: {
    statvar: Query[];
  };
}

interface Topics {
  [topicName: string]: Topic;
}

export interface DataSourceGroup {
  label: string;
  url: string;
  description?: string;
  license?: string;
  licenseUrl?: string;
  topics?: string[];
  dataSets?: DataSource[];
}

interface DataSource {
  label: string;
  url: string;
  description?: string;
}

export interface PlaceData {
  place: Place;
  sources: DataSourceGroup[];
  topics: Topics;
}

export interface PlaceDataOverview {
  [key: string]: PlaceData;
}
