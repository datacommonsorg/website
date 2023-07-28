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
 * Config for the scatter vis type.
 */

import _ from "lodash";
import React from "react";

import { ScatterTile } from "../../../components/tiles/scatter_tile";
import { StatVarHierarchyType } from "../../../shared/types";
import { MemoizedInfoExamples } from "../../../tools/shared/info_examples";
import {
  getFooterOptions,
  getStatVarSpec,
} from "../../../utils/app/visualization_utils";
import { AppContextType } from "../app_context";
import { VisType } from "../vis_type_configs";

function getChartArea(
  appContext: AppContextType,
  chartHeight: number
): JSX.Element {
  // If any svs do not allow per capita, hide the per capita inputs.
  const hidePcInputs =
    appContext.statVars.filter((sv) => !sv.info.pcAllowed).length > 0;
  const perCapitaInputs = hidePcInputs
    ? []
    : appContext.statVars.slice(0, 2).map((sv, idx) => {
        return {
          isChecked: sv.isPerCapita,
          onUpdated: (isChecked: boolean) => {
            const newStatVars = _.cloneDeep(appContext.statVars);
            newStatVars[idx].isPerCapita = isChecked;
            appContext.setStatVars(newStatVars);
          },
          label: idx === 0 ? "y Per Capita" : "x Per Capita",
        };
      });
  const logInputs = appContext.statVars.slice(0, 2).map((sv, idx) => {
    return {
      isChecked: sv.isLog,
      onUpdated: (isChecked: boolean) => {
        const newStatVars = _.cloneDeep(appContext.statVars);
        newStatVars[idx].isLog = isChecked;
        appContext.setStatVars(newStatVars);
      },
      label: idx === 0 ? "y Log Scale" : "x Log Scale",
    };
  });
  const statVarLabels = appContext.statVars.map(
    (sv) => sv.info.title || sv.dcid
  );
  return (
    <div className="chart">
      <ScatterTile
        id="vis-tool-scatter"
        title={
          statVarLabels[0] +
          " (${yDate}) vs " +
          statVarLabels[1] +
          " (${xDate})"
        }
        place={appContext.places[0]}
        enclosedPlaceType={appContext.enclosedPlaceType}
        statVarSpec={appContext.statVars.map((sv) =>
          getStatVarSpec(sv, VisType.SCATTER)
        )}
        svgChartHeight={chartHeight}
        scatterTileSpec={{}}
        showLoadingSpinner={true}
      />
      {getFooterOptions(perCapitaInputs, logInputs)}
    </div>
  );
}

function getInfoContent(): JSX.Element {
  return (
    <div className="info-content">
      <div>
        <h3>Scatter Plot</h3>
        <p>
          The scatter plot tool helps you visualize the correlation between two
          statistical variables.
        </p>
      </div>
      <div>
        <p>
          You can start your exploration from one of these interesting points
          ...
        </p>
        <MemoizedInfoExamples configKey="scatter" />
      </div>
      <p>Or click start to build your own scatter plot.</p>
    </div>
  );
}

export const SCATTER_CONFIG = {
  displayName: "Scatter Plot",
  icon: "scatter_plot",
  svHierarchyType: StatVarHierarchyType.SCATTER,
  singlePlace: true,
  numSv: 2,
  getChartArea,
  getInfoContent,
};
