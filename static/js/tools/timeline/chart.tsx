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

import { computePlotParams, PlotParams } from "../../chart/base";
import { drawGroupLineChart } from "../../chart/draw";
import {
  SourceSelector,
  SourceSelectorSvInfo,
} from "../../shared/source_selector";
import { StatVarInfo } from "../../shared/stat_var";
import { isIpccStatVarWithMultipleModels } from "../shared_util";
import {
  convertToDelta,
  fetchRawData,
  getStatData,
  getStatVarGroupWithTime,
  shortenStatData,
  StatData,
  statDataFromModels,
  TimelineRawData,
} from "./data_fetcher";
import { setChartOption, setDenom, setMetahash } from "./util";

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
  placeNames: Record<string, string>; // An array of place dcids.
  statVarInfos: Record<string, StatVarInfo>;
  pc: boolean;
  denom: string;
  // Whether the chart is on for the delta (increment) of the data.
  delta: boolean;
  removeStatVar: (statVar: string) => void;
  onDataUpdate: (mprop: string, data: StatData) => void;
  // Map of stat var dcid to a hash representing a source series
  metahashMap: Record<string, string>;
}

interface ChartStateType {
  rawData: TimelineRawData;
  denomInput: string;
}

class Chart extends Component<ChartPropsType, ChartStateType> {
  svgContainer: React.RefObject<HTMLDivElement>;
  denomInput: React.RefObject<HTMLInputElement>;
  plotParams: PlotParams;
  statData: StatData;
  units: string[];
  ipccModels: StatData;
  minYear: string; // In the format of YYYY
  maxYear: string; // In the format of YYYY
  resizeObserver: ResizeObserver;

  constructor(props: ChartPropsType) {
    super(props);
    this.svgContainer = React.createRef();
    this.denomInput = React.createRef();
    this.drawChart = this.drawChart.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.loadRawData = this.loadRawData.bind(this);
    this.processDataAndDrawChart = this.processDataAndDrawChart.bind(this);
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    this.minYear = urlParams.get("minYear");
    this.maxYear = urlParams.get("maxYear");
    this.state = { rawData: null, denomInput: this.props.denom };
  }

  render(): JSX.Element {
    const statVars = Object.keys(this.props.statVarInfos);
    // TODO(shifucun): investigate on stats var title, now this is updated
    // several times.
    this.plotParams = computePlotParams(
      this.props.placeNames,
      statVars,
      this.props.statVarInfos
    );
    // Stats var chip color is independent of places, so pick one place to
    // provide a key for style look up.
    const placeName = Object.values(this.props.placeNames)[0];
    const deltaCheckboxId = `delta-cb-${this.props.mprop}`;
    const ratioCheckboxId = `pc-cb-${this.props.mprop}`;
    const sourceSelectorSvInfoList = this.getSourceSelectorSvInfo(statVars);
    return (
      <div className="card">
        <div ref={this.svgContainer} className="chart-svg"></div>
        <div className="chart-options">
          <SourceSelector
            svInfoList={sourceSelectorSvInfoList}
            onSvMetahashUpdated={(svMetahashMap) => setMetahash(svMetahashMap)}
          />
          <div>
            <span className="chart-option">
              <button
                id={ratioCheckboxId}
                className={
                  this.props.pc ? "option-checkbox checked" : "option-checkbox"
                }
                onClick={() => {
                  setChartOption(this.props.mprop, "pc", !this.props.pc);
                }}
              ></button>
              <label htmlFor={ratioCheckboxId}>Ratio of </label>
              <input
                ref={this.denomInput}
                disabled={!this.props.pc}
                placeholder={"Enter a stat var dcid eg. Count_Person"}
                onBlur={(e) => this.handleDenomInput(e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    this.handleDenomInput(e);
                  }
                }}
                value={this.state.denomInput}
                onChange={(e) => this.setState({ denomInput: e.target.value })}
              ></input>
            </span>
            <span className="chart-option">
              <button
                id={deltaCheckboxId}
                className={
                  this.props.delta
                    ? "option-checkbox checked"
                    : "option-checkbox"
                }
                onClick={() => {
                  setChartOption(this.props.mprop, "delta", !this.props.delta);
                }}
              ></button>
              <label htmlFor={deltaCheckboxId}>Delta</label>
            </span>
          </div>
        </div>
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
                title={this.props.statVarInfos[statVar].title}
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
    this.loadRawData();
    this.resizeObserver = new ResizeObserver(this.handleWindowResize);
    this.resizeObserver.observe(this.svgContainer.current);
  }

  componentWillUnmount(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    // reset the options to default value if the chart is removed
    setChartOption(this.props.mprop, "pc", false);
    setChartOption(this.props.mprop, "delta", false);
  }

  componentDidUpdate(
    prevProps: ChartPropsType,
    prevState: ChartStateType
  ): void {
    if (prevState.denomInput !== this.state.denomInput) {
      return;
    }
    // We only need to fetch the raw data when place, statvars or denom changes.
    const shouldLoadData =
      !_.isEqual(prevProps.placeNames, this.props.placeNames) ||
      !_.isEqual(prevProps.statVarInfos, this.props.statVarInfos) ||
      !_.isEqual(prevProps.denom, this.props.denom);
    if (shouldLoadData) {
      this.loadRawData();
    } else {
      this.processDataAndDrawChart();
    }
  }

  private handleDenomInput(evt) {
    setDenom(this.props.mprop, evt.target.value);
  }

  private handleWindowResize() {
    if (!this.svgContainer.current) {
      return;
    }
    this.drawChart();
  }

  private getSourceSelectorSvInfo(statVars: string[]): SourceSelectorSvInfo[] {
    return statVars.map((sv) => {
      const displayNames = isIpccStatVarWithMultipleModels(sv)
        ? { "": "Mean across models" }
        : {};
      return {
        dcid: sv,
        name: this.props.statVarInfos[sv].title || sv,
        metahash:
          sv in this.props.metahashMap ? this.props.metahashMap[sv] : "",
        metadataMap:
          this.state.rawData && this.state.rawData.metadataMap[sv]
            ? this.state.rawData.metadataMap[sv]
            : {},
        displayNames,
      };
    });
  }

  private loadRawData() {
    const places = Object.keys(this.props.placeNames);
    const statVars = Object.keys(this.props.statVarInfos);
    fetchRawData(places, statVars, this.props.denom)
      .then((rawData) => {
        this.setState({ rawData });
      })
      .catch(() => {
        this.setState({ rawData: null });
      });
  }

  private processDataAndDrawChart() {
    if (!this.state.rawData) {
      return;
    }
    const places = Object.keys(this.props.placeNames);
    const statVars = Object.keys(this.props.statVarInfos);
    this.statData = getStatData(
      this.state.rawData,
      places,
      statVars,
      this.props.metahashMap,
      this.props.pc,
      this.props.denom
    );
    if (this.minYear || this.maxYear) {
      this.statData = shortenStatData(
        this.statData,
        this.minYear,
        this.maxYear
      );
    }

    // We only want to do multiple model computations on IPCC stat vars with
    // multiple models and only when no source is specified for that stat var.
    const ipccStatVars = statVars.filter(
      (sv) =>
        isIpccStatVarWithMultipleModels(sv) &&
        _.isEmpty(this.props.metahashMap[sv])
    );
    if (_.isEmpty(ipccStatVars)) {
      this.ipccModels = null;
    } else {
      const [processedStat, modelStat] = statDataFromModels(
        this.statData,
        this.state.rawData.statAllData,
        ipccStatVars
      );
      this.statData = processedStat;
      this.ipccModels = modelStat;
      this.ipccModels = shortenStatData(
        this.ipccModels,
        this.minYear,
        this.maxYear
      );
    }
    if (this.props.delta) {
      this.statData = convertToDelta(this.statData);
      if (this.ipccModels) {
        this.ipccModels = convertToDelta(this.ipccModels);
      }
    }
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

    this.props.onDataUpdate(this.props.mprop, this.statData);
    if (this.svgContainer.current) {
      this.drawChart();
    }
  }

  /**
   * Draw chart in current svg container based on stats data.
   */
  private drawChart() {
    const dataGroupsDict = {};
    if (!this.statData) {
      return;
    }
    for (const place of this.statData.places) {
      dataGroupsDict[this.props.placeNames[place]] = getStatVarGroupWithTime(
        this.statData,
        place
      );
    }
    const modelsDataGroupsDict = {};
    if (this.ipccModels) {
      for (const place of this.ipccModels.places) {
        modelsDataGroupsDict[
          this.props.placeNames[place]
        ] = getStatVarGroupWithTime(this.ipccModels, place);
      }
    }
    drawGroupLineChart(
      this.svgContainer.current,
      this.svgContainer.current.offsetWidth,
      CHART_HEIGHT,
      this.props.statVarInfos,
      dataGroupsDict,
      this.plotParams,
      this.ylabel(),
      Array.from(this.statData.sources),
      Array.from(this.statData.measurementMethods),
      this.units.join(", "),
      modelsDataGroupsDict
    );
  }

  private ylabel(): string {
    // get mprop from one statVar
    const statVarSample = Object.keys(this.props.statVarInfos)[0];
    let mprop = this.props.statVarInfos[statVarSample].mprop;
    // ensure the mprop is the same for all the statVars
    for (const statVar in this.props.statVarInfos) {
      if (this.props.statVarInfos[statVar].mprop !== mprop) {
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
