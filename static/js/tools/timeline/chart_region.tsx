/**
 * Copyright 2020 Google LLC
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
import React, { Component } from "react";

import { DEFAULT_POPULATION_DCID } from "../../shared/constants";
import { StatVarInfo } from "../../shared/stat_var";
import { getStatVarGroups } from "../../utils/app/timeline_utils";
import { Chart } from "./chart";
import {
  getChartOption,
  getDenom,
  getMetahash,
  removeToken,
  setMetahash,
  statVarSep,
} from "./util";

interface ChartOptions {
  perCapita: boolean;
  denom: string;
  delta: boolean;
}
export interface ChartGroupInfo {
  chartOrder: string[];
  chartIdToStatVars: { [key: string]: string[] };
  chartIdToOptions: { [key: string]: ChartOptions };
}
interface ChartRegionPropsType {
  // Map from place dcid to place name.
  placeName: Record<string, string>;
  // Map from stat var dcid to info.
  statVarInfo: { [key: string]: StatVarInfo };
  // Order in which stat vars were selected.
  statVarOrder: string[];
}

class ChartRegion extends Component<ChartRegionPropsType> {
  constructor(props: ChartRegionPropsType) {
    super(props);
  }

  render(): React.JSX.Element {
    if (
      Object.keys(this.props.placeName).length === 0 ||
      Object.keys(this.props.statVarInfo).length === 0
    ) {
      return <div></div>;
    }
    // Group stat vars by measured property.
    const chartGroupInfo = this.groupStatVars(
      this.props.statVarOrder,
      this.props.statVarInfo
    );
    return (
      <React.Fragment>
        {chartGroupInfo.chartOrder.map((mprop) => {
          return (
            <Chart
              key={mprop}
              chartId={mprop}
              placeNameMap={this.props.placeName}
              statVarInfos={_.pick(
                this.props.statVarInfo,
                chartGroupInfo.chartIdToStatVars[mprop]
              )}
              pc={chartGroupInfo.chartIdToOptions[mprop].perCapita}
              denom={chartGroupInfo.chartIdToOptions[mprop].denom}
              delta={chartGroupInfo.chartIdToOptions[mprop].delta}
              removeStatVar={(statVar): void => {
                removeToken("statsVar", statVarSep, statVar);
                setMetahash({ [statVar]: "" });
              }}
              svFacetId={_.pick(
                getMetahash(),
                chartGroupInfo.chartIdToStatVars[mprop]
              )}
            />
          );
        })}
      </React.Fragment>
    );
  }

  /**
   * Group stats vars with same measured property together so they can be plot
   * in the same chart and get the order in which the charts should be rendered.
   *
   * TODO(shifucun): extend this to accomodate other stats var properties.
   *
   * @param statVarOrder The input stat vars in the order they were selected.
   * @param statVarInfo
   */
  private groupStatVars(
    statVarOrder: string[],
    statVarInfo: {
      [key: string]: StatVarInfo;
    }
  ): ChartGroupInfo {
    const { groups, chartOrder } = getStatVarGroups(statVarOrder, statVarInfo);
    const options = {};
    for (const chartId of chartOrder) {
      options[chartId] = {
        delta: getChartOption(chartId, "delta"),
        denom: getDenom(chartId) || DEFAULT_POPULATION_DCID,
        perCapita: getChartOption(chartId, "pc"),
      };
    }
    return {
      chartIdToOptions: options,
      chartIdToStatVars: groups,
      chartOrder,
    };
  }
}

export { ChartRegion, ChartRegionPropsType, StatVarInfo };
