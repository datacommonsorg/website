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
import _ from "lodash";
import React, { useContext } from "react";
import { FormGroup, Input, Label } from "reactstrap";

import { LineTile } from "../../components/tiles/line_tile";
import { MapTile } from "../../components/tiles/map_tile";
import { ScatterTile } from "../../components/tiles/scatter_tile";
import {
  GA_EVENT_TOOL_CHART_OPTION_CLICK,
  GA_PARAM_TOOL_CHART_OPTION,
  GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE,
  GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
  triggerGAEvent,
} from "../../shared/ga_events";
import { StatVarInfo } from "../../shared/stat_var";
import { getStatVarGroups } from "../../utils/app/timeline_utils";
import { isSelectionComplete } from "../../utils/app/visualization_utils";
import { AppContext } from "./app_context";
import { StatVarSelector } from "./stat_var_selector";
import { VisType } from "./vis_type_configs";

const DEFAULT_DENOM = "Count_Person";

export function Chart(): JSX.Element {
  const { visType, places, statVars, enclosedPlaceType, setStatVars } =
    useContext(AppContext);

  function renderCharts(): JSX.Element {
    const chartHeight = window.innerHeight * 0.45;
    const statVarSpecs = statVars.map((sv) => {
      return {
        denom: sv.isPerCapita ? "Count_Person" : "",
        log: visType === VisType.SCATTER && sv.isLog,
        name: sv.info.title || sv.dcid,
        scaling: 1,
        statVar: sv.dcid,
        unit: "",
      };
    });
    const statVarLabels = statVars.map((sv) => sv.info.title || sv.dcid);
    const statVarInfo: Record<string, StatVarInfo> = {};
    let lineChartGrouping: {
      groups: { [groupId: string]: string[] };
      chartOrder: string[];
    };
    let perCapitaInputs = [];
    let logInputs = [];
    switch (visType) {
      case VisType.MAP:
        perCapitaInputs = [
          {
            isChecked: statVars[0].isPerCapita,
            onUpdated: (isChecked: boolean) => {
              const newStatVars = _.cloneDeep(statVars);
              newStatVars[0].isPerCapita = isChecked;
              setStatVars(newStatVars);
            },
            label: "Per Capita",
          },
        ];
        return (
          <div>
            <MapTile
              id="vis-tool-map"
              place={places[0]}
              statVarSpec={statVarSpecs[0]}
              enclosedPlaceType={enclosedPlaceType}
              svgChartHeight={chartHeight}
              title={statVarLabels[0] + " (${date})"}
              showLoadingSpinner={true}
            />
            {renderFooterOptions(perCapitaInputs, logInputs)}
          </div>
        );
      case VisType.SCATTER:
        perCapitaInputs = statVars.slice(0, 2).map((sv, idx) => {
          return {
            isChecked: sv.isPerCapita,
            onUpdated: (isChecked) => {
              const newStatVars = _.cloneDeep(statVars);
              newStatVars[idx].isPerCapita = isChecked;
              setStatVars(newStatVars);
            },
            label: idx === 0 ? "y Per Capita" : "x Per Capita",
          };
        });
        logInputs = statVars.slice(0, 2).map((sv, idx) => {
          return {
            isChecked: sv.isLog,
            onUpdated: (isChecked) => {
              const newStatVars = _.cloneDeep(statVars);
              newStatVars[idx].isLog = isChecked;
              setStatVars(newStatVars);
            },
            label: idx === 0 ? "y Log Scale" : "x Log Scale",
          };
        });
        return (
          <div>
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
            {renderFooterOptions(perCapitaInputs, logInputs)}
          </div>
        );
      case VisType.TIMELINE:
        statVars.forEach((sv) => (statVarInfo[sv.dcid] = sv.info));
        lineChartGrouping = getStatVarGroups(
          statVars.map((sv) => sv.dcid),
          statVarInfo,
          new Set(statVars.filter((sv) => sv.isPerCapita).map((sv) => sv.dcid))
        );
        return (
          <>
            {lineChartGrouping.chartOrder.map((chartId) => {
              const chartSvs = new Set(lineChartGrouping.groups[chartId]);
              const chartSvSpecs = statVarSpecs.filter((sv) =>
                chartSvs.has(sv.statVar)
              );
              const chartSVInfo = statVars.filter((sv) =>
                chartSvs.has(sv.dcid)
              );
              const chartPCInputs = [
                {
                  isChecked: chartSVInfo[0].isPerCapita,
                  onUpdated: (isChecked: boolean) => {
                    const newStatVars = _.cloneDeep(statVars);
                    statVars.forEach((sv, idx) => {
                      if (chartSvs.has(sv.dcid)) {
                        newStatVars[idx].isPerCapita = isChecked;
                      }
                    });
                    setStatVars(newStatVars);
                  },
                  label: "Per Capita",
                },
              ];
              return (
                <div key={chartId}>
                  <LineTile
                    comparisonPlaces={places.map((place) => place.dcid)}
                    id={`vis-tool-timeline-${chartId}`}
                    title=""
                    statVarSpec={chartSvSpecs}
                    svgChartHeight={chartHeight}
                    place={places[0]}
                  />
                  {renderFooterOptions(chartPCInputs, logInputs)}
                </div>
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
      <div className="chart-area">{renderCharts()}</div>
    </div>
  );
}

interface InputInfo {
  isChecked: boolean;
  onUpdated: (isChecked: boolean) => void;
  label: string;
}

function renderFooterOptions(
  perCapitaInputs: InputInfo[],
  logInputs: InputInfo[]
): JSX.Element {
  return (
    <div className="chart-footer-options">
      <div className="option-section">
        {perCapitaInputs.map((pcInput, idx) => {
          return (
            <span className="chart-option" key={`pc-${idx}`}>
              <FormGroup check>
                <Label check>
                  <Input
                    type="checkbox"
                    checked={pcInput.isChecked}
                    onChange={() => {
                      pcInput.onUpdated(!pcInput.isChecked);
                      if (!pcInput.isChecked) {
                        triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
                          [GA_PARAM_TOOL_CHART_OPTION]:
                            GA_VALUE_TOOL_CHART_OPTION_PER_CAPITA,
                        });
                      }
                    }}
                  />
                  {pcInput.label}
                </Label>
              </FormGroup>
            </span>
          );
        })}
      </div>
      <div className="option-section">
        {logInputs.map((logInput, idx) => {
          return (
            <span className="chart-option" key={`log-${idx}`}>
              <FormGroup check>
                <Label check>
                  <Input
                    type="checkbox"
                    checked={logInput.isChecked}
                    onChange={() => {
                      logInput.onUpdated(!logInput.isChecked);
                      if (!logInput.isChecked) {
                        triggerGAEvent(GA_EVENT_TOOL_CHART_OPTION_CLICK, {
                          [GA_PARAM_TOOL_CHART_OPTION]:
                            GA_VALUE_TOOL_CHART_OPTION_LOG_SCALE,
                        });
                      }
                    }}
                  />
                  {logInput.label}
                </Label>
              </FormGroup>
            </span>
          );
        })}
      </div>
    </div>
  );
}
