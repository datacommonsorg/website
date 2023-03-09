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

import { createContext } from "react";

import { GeoJsonData } from "../../chart/types";
import { NamedPlace } from "../../shared/types";

/**
 * Data context to hold data that is used across multiple components for the
 * whole page.
 */

export interface DataContextType {
  // TODO (chejennifer): use this in map tile
  geoJsonData: {
    // geojson data for children places
    childrenGeoJson: GeoJsonData;
    // geojson data for the selected place
    placeGeoJson: GeoJsonData;
  };
  // Parent places for the selected place
  parentPlaces: NamedPlace[];
}

export const DataContext = createContext({} as DataContextType);
