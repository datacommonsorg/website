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

import React, { Component } from "react";
import { randDomId } from "./util";
import { fetchStatsData, StatsData } from "./data_fetcher";
import { drawGroupLineChart, computePlotParams } from "./chart/draw";

const MAX_CHART_WIDTH = 1000;
const MAX_CHART_HEIGHT = 500;

interface StatVarChipPropsType {
  statVar: string;
  color: string;
  deleteStatVarChip: (statVar: string) => void;
}

class StatVarChip extends Component<StatVarChipPropsType, {}> {
  render() {
    return (
      <div
        className="pv-chip mdl-chip--deletable"
        style={{ backgroundColor: this.props.color }}
      >
        <span className="mdl-chip__text">{this.props.statVar}</span>
        <button className="mdl-chip__action">
          <i
            className="material-icons"
            onClick={() => this.props.deleteStatVarChip(this.props.statVar)}
          >
            cancel
          </i>
        </button>
      </div>
    );
  }
}

interface ChartRegionPropsType {
  chartElem: string;
  placeIds: string[];
  statVarsAndMeasuredProps: any[];
  perCapita: boolean;
}

class ChartRegion extends Component<ChartRegionPropsType, {}> {
  measuredPropGroup: { string?: string[] };
  measuredProps: string[];
  chartIds: string[];
  width: number;
  height: number;

  constructor(props) {
    super(props);

    // get mprop-statVar dict: { mprop: [statVar1, statVar2, ...]}
    this.measuredPropGroup = {};
    this.measuredProps = [];
    for (let statVarAndMeasuredProp of this.props.statVarsAndMeasuredProps) {
      let mprop = statVarAndMeasuredProp[1];
      if (mprop in this.measuredPropGroup) {
        this.measuredPropGroup[mprop].push(statVarAndMeasuredProp[0]);
      } else {
        this.measuredProps.push(mprop);
        this.measuredPropGroup[mprop] = [statVarAndMeasuredProp[0]];
      }
    }

    // get width and height for chart
    const obsElem = document.getElementById(this.props.chartElem);
    this.width = Math.min(obsElem.offsetWidth - 20, MAX_CHART_WIDTH);
    this.height = Math.min(Math.round(this.width * 0.5), MAX_CHART_HEIGHT);

    let length = Object.keys(this.measuredPropGroup).length;
    this.chartIds = [];
    for (let i = 0; i < length; i++) {
      this.chartIds.push(randDomId());
    }

    // Empty state in the beginning, only dataGroupDict will be in the state
    this.state = {};
  }

  componentDidMount() {
    // Set up states
    let promises: Promise<StatsData>[] = [];
    let mprops = [];
    for (let mprop in this.measuredPropGroup) {
      mprops.push(mprop);
      let statsVarsArray = this.measuredPropGroup[mprop];
      // Make an array of Promises
      promises.push(
        fetchStatsData(
          this.props.placeIds,
          statsVarsArray,
          this.props.perCapita,
          1
        )
      );
    }

    Promise.all(promises).then((statDatas) => {
      let state = {};
      let params = {};
      for (let i = 0; i < statDatas.length; i++) {
        // generate dict {geoId: DataGroup}.
        let dataGroupsDict = {};
        for (let geo of statDatas[i].places) {
          dataGroupsDict[geo] = statDatas[i].getStatsVarGroupWithTime(geo);
        }
        state[mprops[i]] = dataGroupsDict;
        params[mprops[i]] = computePlotParams(dataGroupsDict);
      }
      this.setState({ data: state, params: params });
    });
  }

  componentDidUpdate() {
    this.updateChart();
  }

  updateChart() {
    let index = 0;
    for (let mprop in this.state["data"]) {
      let dataGroupsDict = this.state["data"][mprop];
      let elemId = this.chartIds[index];
      drawGroupLineChart(
        elemId,
        this.width,
        this.height,
        dataGroupsDict,
        this.state["params"][mprop]
      );
      index++;
    }
  }

  deleteStatVarChip(statVar: string) {
    // TODO: add function to delete statvarchip.
    return;
  }

  render() {
    if (JSON.stringify(this.state) === "{}") {
      return <div></div>;
    }

    return this.measuredProps.map((mprop, index) => {
      return (
        <div key={mprop}>
          <div id={this.chartIds[index]} className="card"></div>
          {this.state["params"][mprop]["colors"].map((color, statVarIndex) => {
            return (
              <StatVarChip
                statVar={this.state["params"][mprop]["statVars"][statVarIndex]}
                color={color}
                key={randDomId()}
                deleteStatVarChip={this.deleteStatVarChip}
              />
            );
          })}
        </div>
      );
    });
  }
}

export { ChartRegionPropsType, ChartRegion };
