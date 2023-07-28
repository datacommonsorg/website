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
 * Config for the timeline vis type.
 */

import _ from "lodash";
import React from "react";

import { LineTile } from "../../../components/tiles/line_tile";
import { Chip } from "../../../shared/chip";
import { StatVarHierarchyType } from "../../../shared/types";
import { getStatVarGroups } from "../../../utils/app/timeline_utils";
import {
  getFooterOptions,
  getStatVarSpec,
} from "../../../utils/app/visualization_utils";
import { AppContextType, ContextStatVar } from "../app_context";
import { VisType } from "../vis_type_configs";

const COLORS = [
  "#930000",
  "#5e4fa2",
  "#fee08b",
  "#66c2a5",
  "#3288bd",
  "#d30000",
  "#f46d43",
  "#fdae61",
];

function getSvChips(
  statVars: ContextStatVar[],
  appContext: AppContextType
): JSX.Element {
  return (
    <div className="timeline-chip-section">
      {statVars.map((sv, idx) => {
        return (
          <Chip
            key={sv.dcid}
            id={sv.dcid}
            title={sv.info.title || sv.dcid}
            color={
              appContext.places.length == 1 ? COLORS[idx % COLORS.length] : ""
            }
            removeChip={() => {
              appContext.setStatVars(
                appContext.statVars.filter(
                  (statVar) => statVar.dcid !== sv.dcid
                )
              );
            }}
            onTextClick={null}
          />
        );
      })}
    </div>
  );
}

function getChartArea(
  appContext: AppContextType,
  chartHeight: number
): JSX.Element {
  const statVarInfo = {};
  appContext.statVars.forEach((sv) => (statVarInfo[sv.dcid] = sv.info));
  const lineChartGrouping = getStatVarGroups(
    appContext.statVars.map((sv) => sv.dcid),
    statVarInfo,
    new Set(
      appContext.statVars.filter((sv) => sv.isPerCapita).map((sv) => sv.dcid)
    )
  );
  return (
    <>
      {lineChartGrouping.chartOrder.map((chartId) => {
        const chartSvs = new Set(lineChartGrouping.groups[chartId]);
        const chartSvInfo = appContext.statVars.filter((sv) =>
          chartSvs.has(sv.dcid)
        );
        const chartSvSpecs = chartSvInfo.map((sv) =>
          getStatVarSpec(sv, VisType.TIMELINE)
        );
        // If any svs in the chart do not allow per capita, hide the per capita
        // input.
        const hidePcInputs =
          chartSvInfo.filter((sv) => !sv.info.pcAllowed).length > 0;
        const chartPCInputs = hidePcInputs
          ? []
          : [
              {
                isChecked: chartSvInfo[0].isPerCapita,
                onUpdated: (isChecked: boolean) => {
                  const newStatVars = _.cloneDeep(appContext.statVars);
                  appContext.statVars.forEach((sv, idx) => {
                    if (chartSvs.has(sv.dcid)) {
                      newStatVars[idx].isPerCapita = isChecked;
                    }
                  });
                  appContext.setStatVars(newStatVars);
                },
                label: "Per Capita",
              },
            ];
        return (
          <div className="chart" key={chartId}>
            {getSvChips(chartSvInfo, appContext)}
            <LineTile
              comparisonPlaces={appContext.places.map((place) => place.dcid)}
              id={`vis-tool-timeline-${chartId}`}
              title=""
              statVarSpec={chartSvSpecs}
              svgChartHeight={chartHeight}
              place={appContext.places[0]}
              colors={COLORS}
              showLoadingSpinner={true}
            />
            {getFooterOptions(chartPCInputs, [])}
          </div>
        );
      })}
    </>
  );
}

export const TIMELINE_CONFIG = {
  displayName: "Timeline",
  icon: "timeline",
  svHierarchyType: StatVarHierarchyType.TIMELINE,
  skipEnclosedPlaceType: true,
  getChartArea,
};
