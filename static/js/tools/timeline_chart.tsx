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
import { StatsVarInfo } from "./timeline_util";
import { fetchStatsData, StatsData } from "../shared/data_fetcher";
import { drawGroupLineChart } from "../chart/draw";
import { PlotParams, computePlotParams } from "../chart/base";

const CHART_HEIGHT = 300;

interface StatsVarChipPropsType {
  statsVar: string;
  color: string;
  title: string;
  removeStatsVar: (statsVar: string, nodePath?: string[]) => void;
}

class StatsVarChip extends Component<StatsVarChipPropsType, unknown> {
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
            onClick={() => this.props.removeStatsVar(this.props.statsVar)}
          >
            cancel
          </i>
        </button>
      </div>
    );
  }
}

interface ChartPropsType {
  // An array of place dcids.
  mprop: string;
  places: Record<string, string>;
  statsVars: { [key: string]: StatsVarInfo };
  perCapita: boolean;
  onDataUpdate: (mprop: string, data: StatsData) => void;
  statsVarTitle: Record<string, string>;
  removeStatsVar: (statsVar: string, nodePath?: string[]) => void;
}

class Chart extends Component<ChartPropsType, unknown> {
  data: StatsData;
  svgContainer: React.RefObject<HTMLDivElement>;
  plotParams: PlotParams;
  statsData: StatsData;

  constructor(props: ChartPropsType) {
    super(props);
    this.svgContainer = React.createRef();
    this.handleWindowResize = this.handleWindowResize.bind(this);
  }
  render(): JSX.Element {
    const statsVars = Object.keys(this.props.statsVars);
    // TODO(shifucun): investigate on stats var title, now this is updated
    // several times.
    this.plotParams = computePlotParams(
      Object.values(this.props.places),
      Object.values(this.props.statsVarTitle)
    );
    // Stats var chip color is independent of places, so pick one place to
    // provide a key for style look up.
    const placeName = Object.values(this.props.places)[0];
    return (
      <div className="card">
        <div ref={this.svgContainer} className="chart-svg"></div>
        <div>
          {statsVars.map(
            function (statsVar) {
              let color: string;
              const title = this.props.statsVarTitle[statsVar];
              if (statsVars.length > 1) {
                color = this.plotParams.lines[placeName + title].color;
              }
              return (
                <StatsVarChip
                  key={statsVar}
                  statsVar={statsVar}
                  title={title}
                  color={color}
                  removeStatsVar={this.props.removeStatsVar}
                />
              );
            }.bind(this)
          )}
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    this.loadDataAndDrawChart();
    window.addEventListener("resize", this.handleWindowResize);
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleWindowResize);
  }

  componentDidUpdate(): void {
    this.loadDataAndDrawChart();
  }

  private handleWindowResize() {
    if (!this.svgContainer.current) {
      return;
    }
    this.drawChart();
  }

  private loadDataAndDrawChart() {
    fetchStatsData(
      Object.keys(this.props.places),
      Object.keys(this.props.statsVars),
      this.props.perCapita,
      1
    ).then((statsData) => {
      this.statsData = statsData;
      this.props.onDataUpdate(this.props.mprop, statsData);
      this.drawChart();
    });
  }

  /**
   * Draw chart in current svg container based on stats data.
   */
  private drawChart() {
    const dataGroupsDict = {};
    for (const placeDcid of this.statsData.places) {
      dataGroupsDict[
        this.props.places[placeDcid]
      ] = this.statsData.getStatsVarGroupWithTime(placeDcid);
    }
    drawGroupLineChart(
      this.svgContainer.current,
      this.svgContainer.current.offsetWidth,
      CHART_HEIGHT,
      this.props.statsVarTitle,
      dataGroupsDict,
      this.plotParams,
      Array.from(this.statsData.sources)
    );
  }
}

export { Chart };
