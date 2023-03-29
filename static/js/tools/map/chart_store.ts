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

import { GeoRaster } from "georaster-layer-for-leaflet";

import { GeoJsonData, MapPoint } from "../../chart/types";
import {
  EntityObservationListWrapper,
  EntityObservationWrapper,
  EntitySeriesWrapper,
  ObservationDatesWrapper,
} from "../../shared/stat_types";
import { StatVarSummary } from "../../shared/types";
import { DataContext } from "./context";

// TOOD: Revist the naming decision here.
// MAP_POINT_VALUES and MAP_VALUES_DATES are not clear on what they really mean.
export enum ChartDataType {
  GEO_JSON = "geoJson",
  DEFAULT_STAT = "defaultStat",
  ALL_STAT = "allStat",
  DENOM_STAT = "denomStat",
  BREADCRUMB_STAT = "breadcrumbStat",
  BREADCRUMB_DENOM_STAT = "breadcrumbDenomStat",
  MAP_POINT_STAT = "mapPointStat",
  MAP_POINT_COORDINATE = "mapPointCoordinate",
  STAT_VAR_SUMMARY = "statVarSummary",
  ALL_DATES = "allDates",
  GEO_RASTER = "geoRaster",
  BREADCRUMB_VALUES = "breadcrumbValues",
  MAP_POINT_VALUES = "mapPointValues",
  MAP_VALUES_DATES = "mapValuesDates",
}

// ChartStore holds the raw data and corresponding context.
// When context changes, the data fetch is async and could take long time. The
// context here is used to check if the data context matches the actual context.
export interface ChartStore {
  geoJson: {
    data: GeoJsonData;
    context?: DataContext;
    error?: string;
  };
  defaultStat: {
    data: EntityObservationWrapper;
    context?: DataContext;
    error?: string;
  };
  allStat: {
    data: EntityObservationListWrapper;
    context?: DataContext;
    error?: string;
  };
  denomStat: {
    data: EntitySeriesWrapper;
    context?: DataContext;
    error?: string;
  };
  breadcrumbStat: {
    data: EntityObservationWrapper;
    context?: DataContext;
    error?: string;
  };
  breadcrumbDenomStat: {
    data: EntitySeriesWrapper;
    context?: DataContext;
    error?: string;
  };
  mapPointStat: {
    data: EntityObservationWrapper;
    context?: DataContext;
    error?: string;
  };
  mapPointCoordinate: {
    data: Array<MapPoint>;
    context?: DataContext;
    error?: string;
  };
  statVarSummary: {
    data: StatVarSummary;
    context?: DataContext;
    error?: string;
  };
  allDates: {
    data: ObservationDatesWrapper;
    context?: DataContext;
    error?: string;
  };
  geoRaster: {
    data: GeoRaster;
    context?: DataContext;
    error?: string;
  };
  mapValuesDates: {
    data: {
      mapValues: { [dcid: string]: number };
      mapDates: Set<string>;
      unit?: string;
    };
    context?: DataContext;
  };
  mapPointValues: {
    data: { [dcid: string]: number };
    context?: DataContext;
  };
  breadcrumbValues: {
    data: { [dcid: string]: number };
    context?: DataContext;
  };
}

export const emptyChartStore = {
  geoJson: {
    data: null,
    error: null,
  },
  defaultStat: {
    data: null,
    error: null,
  },
  allStat: {
    data: null,
    error: null,
  },
  denomStat: {
    data: null,
    error: null,
  },
  breadcrumbStat: {
    data: null,
    error: null,
  },
  breadcrumbDenomStat: {
    data: null,
    error: null,
  },
  mapPointStat: {
    data: null,
    error: null,
  },
  mapPointCoordinate: {
    data: null,
    error: null,
  },
  statVarSummary: {
    data: null,
    error: null,
  },
  allDates: {
    data: null,
    error: null,
  },
  geoRaster: {
    data: null,
    error: null,
  },
  mapValuesDates: {
    data: null,
  },
  mapPointValues: {
    data: null,
  },
  breadcrumbValues: {
    data: null,
  },
};

export interface ChartStoreAction {
  type: ChartDataType;
  payload?: any;
  context?: DataContext;
  error?: string;
}
