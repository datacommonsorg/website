/**
 * Copyright 2021 Google LLC
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

// Typing for topic_page.proto

import { StatVarSpec } from "../shared/types";

export interface PageMetadataConfig {
  topicId: string;
  topicName: string;
  // Map of parent type to child place type.
  containedPlaceTypes: Record<string, string>;
}

export interface RankingTileSpec {
  showHighest: boolean;
  showLowest: boolean;
  showIncrease: boolean;
  showDecrease: boolean;

  diffBaseDate: string;

  highestTitle?: string;
  lowestTitle?: string;
  increaseTitle?: string;
  decreaseTitle?: string;
}

export interface TileConfig {
  title?: string;
  description: string;
  type: string;
  statVarKey: string[];
  rankingTileSpec?: RankingTileSpec;
  // Map of parent type to child place type - overrides the page-level setting.
  containedPlaceTypes: Record<string, string>;
}

export interface ColumnConfig {
  tiles: TileConfig[];
}
export interface BlockConfig {
  title?: string;
  description: string;
  columns: ColumnConfig[];
}

export type StatVarSpecMap = Record<string, StatVarSpec>;

export interface CategoryConfig {
  title: string;
  description?: string;
  statVarSpec: StatVarSpecMap;
  blocks: BlockConfig[];
}

export interface TopicPageConfig {
  metadata: PageMetadataConfig;
  categories: CategoryConfig[];
}
