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
 * Config for the map vis type.
 */

import _ from "lodash";
import React from "react";

import { MapTile } from "../../../components/tiles/map_tile";
import { StatVarHierarchyType } from "../../../shared/types";
import { getAllChildPlaceTypes } from "../../../tools/map/util";
import {
  getFooterOptions,
  getStatVarSpec,
} from "../../../utils/app/visualization_utils";
import { AppContextType } from "../app_context";
import { VisType } from "../vis_type_configs";

export function getChartArea(
  appContext: AppContextType,
  chartHeight: number
): JSX.Element {
  const perCapitaInputs = appContext.statVars[0].info.pcAllowed
    ? [
        {
          isChecked: appContext.statVars[0].isPerCapita,
          onUpdated: (isChecked: boolean) => {
            const newStatVars = _.cloneDeep(appContext.statVars);
            newStatVars[0].isPerCapita = isChecked;
            appContext.setStatVars(newStatVars);
          },
          label: "Per Capita",
        },
      ]
    : [];
  const statVarLabel =
    appContext.statVars[0].info.title || appContext.statVars[0].dcid;
  return (
    <div className="chart">
      <MapTile
        id="vis-tool-map"
        place={appContext.places[0]}
        statVarSpec={getStatVarSpec(appContext.statVars[0], VisType.MAP)}
        enclosedPlaceType={appContext.enclosedPlaceType}
        svgChartHeight={chartHeight}
        title={statVarLabel + " (${date})"}
        showLoadingSpinner={true}
      />
      {getFooterOptions(perCapitaInputs, [])}
    </div>
  );
}

export const MAP_CONFIG = {
  displayName: "Map Explorer",
  icon: "public",
  svHierarchyType: StatVarHierarchyType.MAP,
  singlePlace: true,
  getChildTypesFn: getAllChildPlaceTypes,
  numSv: 1,
  getChartArea,
};
