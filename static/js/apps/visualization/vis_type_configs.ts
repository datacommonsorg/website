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

import { NamedTypedPlace, StatVarHierarchyType } from "../../shared/types";
import { getAllChildPlaceTypes } from "../../tools/map/util";

/**
 * Configs for each visualization type.
 */

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

interface VisTypeConfig {
  // display name to use for the vis type
  displayName: string;
  // icon to use to represent the vis type
  icon: string;
  // stat var hierarchy type to use for this vis type
  svHierarchyType: string;
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
}

export const VIS_TYPE_SELECTOR_CONFIGS: Record<string, VisTypeConfig> = {
  [VisType.MAP]: {
    displayName: "Map Explorer",
    icon: "public",
    svHierarchyType: StatVarHierarchyType.MAP,
    singlePlace: true,
    getChildTypesFn: getAllChildPlaceTypes,
    numSv: 1,
  },
  [VisType.SCATTER]: {
    displayName: "Scatter Plot",
    icon: "scatter_plot",
    svHierarchyType: StatVarHierarchyType.SCATTER,
    singlePlace: true,
    numSv: 2,
  },
  [VisType.TIMELINE]: {
    displayName: "Timeline",
    icon: "timeline",
    svHierarchyType: StatVarHierarchyType.TIMELINE,
    skipEnclosedPlaceType: true,
  },
};
