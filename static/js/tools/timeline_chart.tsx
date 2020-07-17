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
import { randDomId } from "../util";
import { fetchStatsData, StatsData } from "../data_fetcher";
import { drawGroupLineChart, computePlotParams } from "../chart/draw";

const MAX_CHART_WIDTH = 1000;
const MAX_CHART_HEIGHT = 500;

// TODO(shifucun): remove this
const tmpWidth = 500;


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

/**
 * @param chartElem: Element DOM Id
 * @param placeIds: [placeId1, placeId2, ...]
 * @param statVarsAndMeasuredProps: [[statVar1, mprop1], [statVar2, mprop2], ...]
 * @param perCapita: true/false
 */
interface ChartRegionPropsType {
  chartElem: string;
  placeIds: string[];
  statVarsAndMeasuredProps: string[][];
  perCapita: boolean;
}

interface ChartRegionStateType {
  params: object;
  data: object;
}

class ChartRegion extends Component<ChartRegionPropsType, ChartRegionStateType> {
  measuredPropGroup: {
    [mprop: string]: { chartId: string; statVars: string[] };
  };
  width: number;
  height: number;

  constructor(props) {
    super(props);
    this.measuredPropGroup = {};
    for (const statVarAndMeasuredProp of this.props.statVarsAndMeasuredProps) {
      const mprop = statVarAndMeasuredProp[1];
      if (mprop in this.measuredPropGroup) {
        this.measuredPropGroup[mprop].statVars.push(
          statVarAndMeasuredProp[0]
        );
      } else {
        this.measuredPropGroup[mprop] = {
          chartId: "",
          statVars: [],
        };
        this.measuredPropGroup[mprop].chartId = randDomId();
        this.measuredPropGroup[mprop].statVars = [statVarAndMeasuredProp[0]];
      }
    }

    // get width and height for chart
    this.width = Math.min(tmpWidth - 20, MAX_CHART_WIDTH);
    this.height = Math.min(Math.round(this.width * 0.5), MAX_CHART_HEIGHT);

    // Empty state in the beginning, dataGroupDict and PlotParams will be in the state
    this.state = {
      data: {},
      params: {}
    };
  }

  render() {
    if (Object.keys(this.state.data).length === 0) {
      return <div></div>;
    }

    return Object.keys(this.measuredPropGroup).map((mprop, index) => {
      return (
        <div key={mprop}>
          <div
            id={this.measuredPropGroup[mprop].chartId}
            className="card"
          ></div>
          {this.state.params[mprop].colors.map((color, statVarIndex) => {
            return (
              <StatVarChip
                statVar={this.state.params[mprop].statVars[statVarIndex]}
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

  componentDidMount() {
    // Set up states
    const promises: Promise<StatsData>[] = [];
    const mprops = [];
    for (const mprop in this.measuredPropGroup) {
      if (this.measuredPropGroup.hasOwnProperty(mprop)) {
        mprops.push(mprop);
        const statsVarsArray = this.measuredPropGroup[mprop].statVars;
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
    }

    Promise.all(promises).then((statDatas) => {
      const state = {};
      const params = {};
      for (let i = 0; i < statDatas.length; i++) {
        // generate dict {geoId: DataGroup[]}.
        const dataGroupsDict = {};
        for (const geo of statDatas[i].places) {
          dataGroupsDict[geo] = statDatas[i].getStatsVarGroupWithTime(geo);
        }
        state[mprops[i]] = dataGroupsDict;
        params[mprops[i]] = computePlotParams(dataGroupsDict);
      }
      this.setState({ data: state, params });
    });
  }

  componentDidUpdate() {
    this.updateChart();
  }

  updateChart() {
    let index = 0;
    for (const mprop in this.state.data) {
      if (this.state.data.hasOwnProperty(mprop)) {
        const dataGroupsDict = this.state.data[mprop];
        const elemId = this.measuredPropGroup[mprop].chartId;
        drawGroupLineChart(
          elemId,
          this.width,
          this.height,
          dataGroupsDict,
          this.state.params[mprop]
        );
        index++;
      }
    }
  }

  deleteStatVarChip(statVar: string) {
    // TODO: add function to delete statvarchip.
    return;
  }
}

export { ChartRegionPropsType, ChartRegion };
