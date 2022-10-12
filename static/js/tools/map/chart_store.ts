/**
 * Copyright 2022 Google LLC
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

import _ from "lodash";

import { GeoJsonData, MapPoint } from "../../chart/types";
import {
  EntityObservationListWrapper,
  EntityObservationWrapper,
  EntitySeriesWrapper,
} from "../../shared/stat_types";
import { DataContext } from "./context";

export enum ChartDataType {
  geoJson,
  defaultStat,
  allStat,
  denomStat,
  breadcrumbStat,
  breadcrumbDenomStat,
  mapPointStat,
  mapPointCoordinate,
}

// ChartStore holds the raw data and corresponding context.
// When context changes, the data fetch is async and could take long time. The
// context here is used to check if the data context matches the actual context.
export interface ChartStore {
  geoJson: {
    data: GeoJsonData;
    context?: DataContext;
  };
  defaultStat: {
    data: EntityObservationWrapper;
    context?: DataContext;
  };
  allStat: {
    data: EntityObservationListWrapper;
    context?: DataContext;
  };
  denomStat: {
    data: EntitySeriesWrapper;
    context?: DataContext;
  };
  breadcrumbStat: {
    data: EntityObservationWrapper;
    context?: DataContext;
  };
  breadcrumbDenomStat: {
    data: EntitySeriesWrapper;
    context?: DataContext;
  };
  mapPointStat: {
    data: EntityObservationWrapper;
    context?: DataContext;
  };
  mapPointCoordinate: {
    data: Array<MapPoint>;
    context?: DataContext;
  };
}

export const emptyChartStore = {
  geoJson: {
    data: null,
  },
  defaultStat: {
    data: null,
  },
  allStat: {
    data: null,
  },
  denomStat: {
    data: null,
  },
  breadcrumbStat: {
    data: null,
  },
  breadcrumbDenomStat: {
    data: null,
  },
  mapPointStat: {
    data: null,
  },
  mapPointCoordinate: {
    data: null,
  },
};

export interface ChartStoreAction {
  type: ChartDataType;
  payload?: any;
  context?: DataContext;
  error?: string;
}

// A reducer used by a useReducer() hook. It adds a type of data to the
// ChartStore.
export function chartStoreReducer(
  chartStore: ChartStore,
  action: ChartStoreAction
): ChartStore {
  const field = ChartDataType[action.type];
  const newStore = _.cloneDeep(chartStore);
  newStore[field] = { data: action.payload };
  if (action.context) {
    newStore[field].context = action.context;
  }
  return newStore;
}
