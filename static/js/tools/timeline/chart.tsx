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
import { StatVarInfo } from "../statvar_menu/util";
import { fetchStatsData, StatsData } from "../../shared/data_fetcher";
import { drawGroupLineChart } from "../../chart/draw";
import { PlotParams, computePlotParams } from "../../chart/base";
import { setChartPerCapita } from "./util";

const CHART_HEIGHT = 300;

interface StatVarChipPropsType {
  statVar: string;
  color: string;
  title: string;
  removeStatVar: (statVar: string) => void;
}

class StatVarChip extends Component<StatVarChipPropsType> {
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
            onClick={() => this.props.removeStatVar(this.props.statVar)}
          >
            cancel
          </i>
        </button>
      </div>
    );
  }
}

interface ChartPropsType {
  groupId: string; // unique identifier of the chart
  placeName: Record<string, string>; // An array of place dcids.
  statVarInfo: Record<string, StatVarInfo>;
  perCapita: boolean;
  removeStatVar: (statVar: string) => void;
  onDataUpdate: (groupId: string, data: StatsData) => void;
}

class Chart extends Component<ChartPropsType> {
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
    const statVars = Object.keys(this.props.statVarInfo);
    // TODO(shifucun): investigate on stats var title, now this is updated
    // several times.
    this.plotParams = computePlotParams(
      Object.values(this.props.placeName),
      statVars
    );
    // Stats var chip color is independent of places, so pick one place to
    // provide a key for style look up.
    const placeName = Object.values(this.props.placeName)[0];
    return (
      <div className="card">
        <span className="chartPerCapita">
          Per capita
          <button
            className={
              this.props.perCapita
                ? "perCapitaCheckbox checked"
                : "perCapitaCheckbox"
            }
            onClick={() => {
              setChartPerCapita(this.props.groupId, !this.props.perCapita);
            }}
          ></button>
          <a href="/faq#perCapita">
            <span> *</span>
          </a>
        </span>
        <div ref={this.svgContainer} className="chart-svg"></div>
        <div className="statVarChipRegion">
          {statVars.map((statVar) => {
            let color: string;
            if (statVars.length > 1) {
              color = this.plotParams.lines[placeName + statVar].color;
            }
            return (
              <StatVarChip
                key={statVar}
                statVar={statVar}
                title={this.props.statVarInfo[statVar].title}
                color={color}
                removeStatVar={this.props.removeStatVar}
              />
            );
          })}
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
    // reset the options to default value if the chart is removed
    setChartPerCapita(this.props.groupId, false);
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
      Object.keys(this.props.placeName),
      Object.keys(this.props.statVarInfo),
      this.props.perCapita,
      1,
      this.props.perCapita ? ["Count_Person"] : [],
      {}
    ).then((statsData) => {
      this.statsData = statsData;
      this.props.onDataUpdate(this.props.groupId, statsData);
      if (this.svgContainer.current) {
        this.drawChart();
      }
    });
  }

  /**
   * Draw chart in current svg container based on stats data.
   */
  private drawChart() {
    const dataGroupsDict = {};
    for (const placeDcid of this.statsData.places) {
      dataGroupsDict[
        this.props.placeName[placeDcid]
      ] = this.statsData.getStatsVarGroupWithTime(placeDcid);
    }
    drawGroupLineChart(
      this.svgContainer.current,
      this.svgContainer.current.offsetWidth,
      CHART_HEIGHT,
      this.props.statVarInfo,
      dataGroupsDict,
      this.plotParams,
      this.ylabel(),
      Array.from(this.statsData.sources)
    );
  }

  private ylabel(): string {
    // get mprop from one statVar
    const statVarSample = Object.keys(this.props.statVarInfo)[0];
    let mprop = this.props.statVarInfo[statVarSample].mprop;
    // ensure the mprop is the same for all the statVars
    for (const statVar in this.props.statVarInfo) {
      if (this.props.statVarInfo[statVar].mprop !== mprop) {
        mprop = "";
      }
    }
    // use mprop as the ylabel
    const ylabelText = mprop.charAt(0).toUpperCase() + mprop.slice(1);
    return ylabelText;
  }
}

export { Chart };
