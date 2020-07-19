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
import { deleteStatsVar } from "./timeline_util.js";
import { fetchStatsData, StatsData } from "../data_fetcher";
import { drawGroupLineChart, computePlotParams } from "../chart/draw";

const MAX_CHART_WIDTH = 1000;
const MAX_CHART_HEIGHT = 500;

interface StatVarInfo {
  md: string;
  mprop: string;
  pt: string;
  pvs: { [key: string]: string };
  title: string;
}

interface StatVarChipPropsType {
  statVar: string;
  color: string;
  deleteStatVarChip: (statVar: string) => void;
  title: string;
}

class StatVarChip extends Component<StatVarChipPropsType, {}> {
  render() {
    return (
      <div
        className="pv-chip mdl-chip--deletable"
        style={{ backgroundColor: this.props.color }}
      >
        <span className="mdl-chip__text">{this.props.title}</span>
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
  // An array of place dcids.
  places: [string, string][];
  statVars: { [key: string]: StatVarInfo };
  perCapita: boolean;
  width: number;
  height: number;
}

interface ChartRegionStateType {
  width: number;
  height: number;
}

class ChartRegion extends Component<
  ChartRegionPropsType,
  ChartRegionStateType
> {
  grouping: { [key: string]: string[] };
  placeName: { [key: string]: string };
  chartContainer: React.RefObject<HTMLDivElement>;

  constructor(props: ChartRegionPropsType) {
    super(props);
    this.state = {
      width: this.props.width,
      height: this.props.height,
    };
    this.grouping = {};
    this.placeName = {};
    this.chartContainer = React.createRef();
  }

  render() {
    if (
      this.props.places.length === 0 ||
      Object.keys(this.props.statVars).length === 0
    ) {
      return <div></div>;
    }
    this.buildGrouping();
    return (
      <div ref={this.chartContainer}>
        {Object.keys(this.grouping).map((domId) => {
          const plotParams = computePlotParams(
            this.props.places.map((x) => x[1]),
            this.grouping[domId]
          );
          return (
            <div key={domId}>
              <div id={domId} className="card"></div>
              {Object.keys(plotParams.colors).map((statVar) => {
                return (
                  <StatVarChip
                    statVar={statVar}
                    title={this.props.statVars[statVar].title}
                    color={plotParams.colors[statVar]}
                    key={randDomId()}
                    deleteStatVarChip={this.deleteStatVarChip}
                  />
                );
              })}
            </div>
          );
        }, this)}
      </div>
    );
  }

  componentDidMount() {
    this.updateChart();
  }

  componentDidUpdate() {
    this.updateChart();
  }

  private buildGrouping() {
    this.grouping = {};
    const temp = {};
    for (const statVarId in this.props.statVars) {
      const mprop = this.props.statVars[statVarId].mprop;
      if (!temp[mprop]) {
        temp[mprop] = [];
      }
      temp[mprop].push(statVarId);
    }
    for (const mprop in temp) {
      const domId = randDomId();
      this.grouping[domId] = temp[mprop];
    }
  }

  private updateChart() {
    const promises: Promise<{ domId: string; data: StatsData }>[] = [];
    for (const domId in this.grouping) {
      promises.push(
        fetchStatsData(
          this.props.places.map((x) => x[0]),
          this.grouping[domId],
          this.props.perCapita,
          1
        ).then((data) => {
          return { domId, data };
        })
      );
    }
    for (const place of this.props.places) {
      this.placeName[place[0]] = place[1];
    }
    Promise.all(promises).then(
      function (allStatsData) {
        for (const statsData of allStatsData) {
          const domId = statsData.domId;
          const dataGroupsDict = {};
          for (const placeDcid of statsData.data.places) {
            dataGroupsDict[
              this.placeName[placeDcid]
            ] = statsData.data.getStatsVarGroupWithTime(placeDcid);
          }
          const plotParams = computePlotParams(
            this.props.places.map((x) => x[1]),
            this.grouping[domId]
          );
          const svTitle = {};
          for (const sv of Object.keys(plotParams.colors)) {
            svTitle[sv] = this.props.statVars[sv].title;
          }
          plotParams.title = svTitle;
          drawGroupLineChart(
            statsData.domId,
            this.state.width,
            this.state.height,
            dataGroupsDict,
            plotParams
          );
        }
      }.bind(this)
    );
  }

  private deleteStatVarChip(statVar: string) {
    deleteStatsVar(statVar);
    return;
  }
}

export { ChartRegionPropsType, ChartRegion, StatVarInfo };
