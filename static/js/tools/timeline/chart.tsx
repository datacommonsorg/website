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

import { PlotParams, computePlotParams } from "../../chart/base";
import React, { Component } from "react";
import {
  StatData,
  fetchStatData,
  getStatVarGroupWithTime,
} from "../../shared/data_fetcher";

import { StatVarInfo } from "../../shared/stat_var";
import { drawGroupLineChart } from "../../chart/draw";
import { setChartOption } from "./util";

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
        <span
          className="mdl-chip__text"
          onClick={() => {
            window.open(`/tools/statvar#${this.props.statVar}`);
          }}
        >
          {this.props.title}
        </span>
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
  mprop: string; // measured property
  placeName: Record<string, string>; // An array of place dcids.
  statVarInfo: Record<string, StatVarInfo>;
  // Whether the chart is for the per capita of the data.
  perCapita: boolean;
  // Whether the chart is on for the delta (increment) of the data.
  delta: boolean;
  denomMap: Record<string, string>;
  removeStatVar: (statVar: string) => void;
  onDataUpdate: (mprop: string, data: StatData) => void;
}

class Chart extends Component<ChartPropsType> {
  data: StatData;
  svgContainer: React.RefObject<HTMLDivElement>;
  plotParams: PlotParams;
  statData: StatData;
  units: string[];

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
      this.props.placeName,
      statVars,
      this.props.statVarInfo
    );
    // Stats var chip color is independent of places, so pick one place to
    // provide a key for style look up.
    const placeName = Object.values(this.props.placeName)[0];
    return (
      <div className="card">
        <span className="chart-option">
          Per capita
          <button
            className={
              this.props.perCapita
                ? "option-checkbox checked"
                : "option-checkbox"
            }
            onClick={() => {
              setChartOption(this.props.mprop, "pc", !this.props.perCapita);
            }}
          ></button>
          <a href="/faq#perCapita">
            <span> *</span>
          </a>
        </span>
        <span className="chart-option">
          Delta
          <button
            className={
              this.props.delta ? "option-checkbox checked" : "option-checkbox"
            }
            onClick={() => {
              setChartOption(this.props.mprop, "delta", !this.props.delta);
            }}
          ></button>
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
    setChartOption(this.props.mprop, "pc", false);
    setChartOption(this.props.mprop, "delta", false);
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
    fetchStatData(
      Object.keys(this.props.placeName),
      Object.keys(this.props.statVarInfo),
      this.props.perCapita,
      this.props.delta,
      1,
      this.props.denomMap
    ).then((statData) => {
      this.statData = statData;
      // Get from all stat vars. In most cases there should be only one
      // unit.
      const placeData = Object.values(this.statData.data)[0];
      this.units = [];
      const units: Set<string> = new Set();
      for (const series of Object.values(placeData.data)) {
        if (series && series["metadata"] && series["metadata"].unit) {
          units.add(series["metadata"].unit);
        }
      }
      this.units = Array.from(units).sort();
      this.props.onDataUpdate(this.props.mprop, statData);
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
    for (const place of this.statData.places) {
      dataGroupsDict[this.props.placeName[place]] = getStatVarGroupWithTime(
        this.statData,
        place
      );
    }
    drawGroupLineChart(
      this.svgContainer.current,
      this.svgContainer.current.offsetWidth,
      CHART_HEIGHT,
      this.props.statVarInfo,
      dataGroupsDict,
      this.plotParams,
      this.ylabel(),
      Array.from(this.statData.sources),
      this.units.join(", ")
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
    let ylabelText = mprop.charAt(0).toUpperCase() + mprop.slice(1);

    if (this.units.length > 0) {
      ylabelText += ` (${this.units.join(", ")})`;
    }
    return ylabelText;
  }
}

export { Chart };
