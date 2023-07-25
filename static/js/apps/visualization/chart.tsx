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
 * Component that draws a chart based off the state of the visualization tool.
 */

import React, { useContext } from "react";

import { LineTile } from "../../components/tiles/line_tile";
import { MapTile } from "../../components/tiles/map_tile";
import { ScatterTile } from "../../components/tiles/scatter_tile";
import { StatVarInfo } from "../../shared/stat_var";
import { getStatVarGroups } from "../../utils/app/timeline_utils";
import { isSelectionComplete } from "../../utils/app/visualization_utils";
import { AppContext } from "./app_context";
import { StatVarSelector } from "./stat_var_selector";
import { VisType } from "./vis_type_configs";

export function Chart(): JSX.Element {
  const { visType, places, statVars, enclosedPlaceType } =
    useContext(AppContext);

  function renderChart(): JSX.Element {
    const chartHeight = window.innerHeight * 0.45;
    const statVarSpecs = statVars.map((sv) => {
      return {
        denom: "",
        log: false,
        name: sv.info.title || sv.dcid,
        scaling: 1,
        statVar: sv.dcid,
        unit: "",
      };
    });
    const statVarLabels = statVars.map((sv) => sv.info.title || sv.dcid);
    let statVarInfo: Record<string, StatVarInfo> = {}
    let lineChartGrouping: {
      groups: { [groupId: string]: string[] };
      chartOrder: string[];
    };
    switch (visType) {
      case VisType.MAP:
        return (
          <MapTile
            id="vis-tool-map"
            place={places[0]}
            statVarSpec={statVarSpecs[0]}
            enclosedPlaceType={enclosedPlaceType}
            svgChartHeight={chartHeight}
            title={statVarLabels[0] + " (${date})"}
            showLoadingSpinner={true}
          />
        );
      case VisType.SCATTER:
        return (
          <ScatterTile
            id="vis-tool-scatter"
            title={
              statVarLabels[0] +
              " (${yDate}) vs " +
              statVarLabels[1] +
              " (${xDate})"
            }
            place={places[0]}
            enclosedPlaceType={enclosedPlaceType}
            statVarSpec={statVarSpecs}
            svgChartHeight={chartHeight}
            scatterTileSpec={{}}
            showLoadingSpinner={true}
          />
        );
      case VisType.TIMELINE:
        statVars.forEach((sv) => (statVarInfo[sv.dcid] = sv.info));
        lineChartGrouping = getStatVarGroups(
          statVars.map((sv) => sv.dcid),
          statVarInfo
        );
        return (
          <>
            {lineChartGrouping.chartOrder.map((chartId) => {
              const chartSvs = new Set(lineChartGrouping.groups[chartId]);
              const chartSvSpecs = statVarSpecs.filter((sv) =>
                chartSvs.has(sv.statVar)
              );
              return (
                <LineTile
                  key={chartId}
                  comparisonPlaces={places.map((place) => place.dcid)}
                  id={`vis-tool-timeline-${chartId}`}
                  title=""
                  statVarSpec={chartSvSpecs}
                  svgChartHeight={chartHeight}
                  place={places[0]}
                />
              );
            })}
          </>
        );
      default:
        return null;
    }
  }

  if (!isSelectionComplete(visType, places, enclosedPlaceType, statVars)) {
    return null;
  }

  return (
    <div className="chart-section">
      <div className="stat-var-selector-area">
        <div className="title">Variables</div>
        <StatVarSelector />
      </div>
      <div className="chart-area">{renderChart()}</div>
    </div>
  );
}
