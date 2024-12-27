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

/**
 * Configs for visualization app.
 */

import { NamedTypedPlace } from "../../shared/types";
import { AppContextType } from "./app_context";
import { MAP_CONFIG } from "./vis_type_configs/map_config";
import { SCATTER_CONFIG } from "./vis_type_configs/scatter_config";
import { TIMELINE_CONFIG } from "./vis_type_configs/timeline_config";

export enum VisType {
  MAP = "map",
  SCATTER = "scatter",
  TIMELINE = "timeline",
}

export const ORDERED_VIS_TYPE = [
  VisType.MAP,
  VisType.SCATTER,
  VisType.TIMELINE,
];

export interface VisTypeConfig {
  // display name to use for the vis type
  displayName: string;
  // stat var hierarchy type to use for this vis type
  svHierarchyType: string;
  // function to get the component to render in the chart area
  getChartArea: (
    appContext: AppContextType,
    chartHeight: number
  ) => JSX.Element;
  // function to get the component that gives information about the vis type
  getInfoContent: () => JSX.Element;
  // url to the old version of the tool.
  oldToolUrl: string;
  // whether this vis type takes a single place or multiple places
  singlePlace?: boolean;
  // whether or not to skip setting enclosed place type
  skipEnclosedPlaceType?: boolean;
  // custom function for getting child types
  getChildTypesFn?: (
    place: NamedTypedPlace,
    parentPlaces: NamedTypedPlace[]
  ) => string[];
  // number of stat vars this vis type can display
  numSv?: number;
  // the min number of entities that should have data for a stat var to be
  // shown in the hierarchy. Default is 1.
  svHierarchyNumExistence?: number;
  // function to get a footer for the tool.
  getFooter?: () => string;
}

export const VIS_TYPE_CONFIG: Record<string, VisTypeConfig> = {
  [VisType.MAP]: MAP_CONFIG,
  [VisType.SCATTER]: SCATTER_CONFIG,
  [VisType.TIMELINE]: TIMELINE_CONFIG,
};
