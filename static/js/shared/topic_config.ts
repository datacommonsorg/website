/**
 * Copyright 2023 Google LLC
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

// Types for representing verticals and queries for it.

export interface Query {
  title: string;
  url?: string;
}

export interface Topic {
  name: string;
  title?: string;
}

export interface TopicConfig {
  title: string;
  description: string;
  image: string;
  subTopics: Query[];
  examples: {
    general: Query[];
    comparison: Query[];
  };
  meta: {
    dataPointCount: number;
    variableCount: number;
    sources: string[];
  };
}

export interface TopicData {
  allTopics: string[];
  topics: Record<string, TopicConfig>;
}
