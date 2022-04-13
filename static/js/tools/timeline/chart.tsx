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
import { FormGroup, Input, Label } from "reactstrap";

import { computePlotParams, PlotParams } from "../../chart/base";
import { drawGroupLineChart } from "../../chart/draw";
import { SourceSelectorSvInfo } from "../../shared/source_selector";
import { StatVarInfo } from "../../shared/stat_var";
import { ToolChartFooter } from "../shared/tool_chart_footer";
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
  statData: StatData;
  ipccModels: StatData;
}

class Chart extends Component<ChartPropsType, ChartStateType> {
  svgContainer: React.RefObject<HTMLDivElement>;
  denomInput: React.RefObject<HTMLInputElement>;
  plotParams: PlotParams;
  units: string[];
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
    this.processData = this.processData.bind(this);
    this.drawChart = this.drawChart.bind(this);
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    this.minYear = urlParams.get("minYear");
    this.maxYear = urlParams.get("maxYear");
    this.state = { rawData: null, statData: null, ipccModels: null };
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
    const sourceSelectorSvInfoList = this.getSourceSelectorSvInfo(statVars);
    return (
      <div className="chart-container">
        <div className="card">
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
          <div ref={this.svgContainer} className="chart-svg"></div>
        </div>
        <ToolChartFooter
          chartId={this.props.mprop}
          sources={
            this.state.statData ? this.state.statData.sources : new Set()
          }
          mMethods={
            this.state.statData
              ? this.state.statData.measurementMethods
              : new Set()
          }
          sourceSelectorSvInfoList={sourceSelectorSvInfoList}
          onSvMetahashUpdated={(svMetahashMap) => setMetahash(svMetahashMap)}
          hideIsRatio={false}
          isPerCapita={this.props.pc}
          onIsPerCapitaUpdated={(isPerCapita: boolean) =>
            setChartOption(this.props.mprop, "pc", isPerCapita)
          }
        >
          <span className="chart-option">
            <FormGroup check>
              <Label check>
                <Input
                  id={deltaCheckboxId}
                  className="is-delta-input"
                  type="checkbox"
                  checked={this.props.delta}
                  onChange={() =>
                    setChartOption(this.props.mprop, "delta", !this.props.delta)
                  }
                />
                Delta
              </Label>
            </FormGroup>
          </span>
        </ToolChartFooter>
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
    // We only need to fetch the raw data when place, statvars or denom changes.
    const shouldLoadData =
      !_.isEqual(prevProps.placeNames, this.props.placeNames) ||
      !_.isEqual(prevProps.statVarInfos, this.props.statVarInfos) ||
      !_.isEqual(prevProps.denom, this.props.denom);
    if (shouldLoadData) {
      this.loadRawData();
      return;
    }
    // If stat data or ipccModels data changes, need to redraw the chart
    const shouldDrawChart =
      this.state.statData !== prevState.statData ||
      this.state.ipccModels !== prevState.ipccModels;
    if (shouldDrawChart) {
      this.drawChart();
      return;
    }
    this.processData();
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

  private processData() {
    if (!this.state.rawData) {
      return;
    }
    const places = Object.keys(this.props.placeNames);
    const statVars = Object.keys(this.props.statVarInfos);
    let statData = getStatData(
      this.state.rawData,
      places,
      statVars,
      this.props.metahashMap,
      this.props.pc,
      this.props.denom
    );
    if (this.minYear || this.maxYear) {
      statData = shortenStatData(statData, this.minYear, this.maxYear);
    }

    let ipccModels = null;
    // We only want to do multiple model computations on IPCC stat vars with
    // multiple models and only when no source is specified for that stat var.
    const ipccStatVars = statVars.filter(
      (sv) =>
        isIpccStatVarWithMultipleModels(sv) &&
        _.isEmpty(this.props.metahashMap[sv])
    );
    if (!_.isEmpty(ipccStatVars)) {
      const [processedStat, modelStat] = statDataFromModels(
        statData,
        this.state.rawData.statAllData,
        ipccStatVars
      );
      statData = processedStat;
      ipccModels = modelStat;
      ipccModels = shortenStatData(ipccModels, this.minYear, this.maxYear);
    }
    if (this.props.delta) {
      statData = convertToDelta(statData);
      if (ipccModels) {
        ipccModels = convertToDelta(ipccModels);
      }
    }
    // Get from all stat vars. In most cases there should be only one
    // unit.
    const placeData = Object.values(statData.data)[0];
    this.units = [];
    const units: Set<string> = new Set();
    for (const series of Object.values(placeData.data)) {
      if (series && series["metadata"] && series["metadata"].unit) {
        units.add(series["metadata"].unit);
      }
    }
    this.units = Array.from(units).sort();

    this.props.onDataUpdate(this.props.mprop, statData);
    this.setState({ statData, ipccModels });
  }

  /**
   * Draw chart in current svg container based on stats data.
   */
  private drawChart() {
    const dataGroupsDict = {};
    if (!this.state.statData) {
      return;
    }
    for (const place of this.state.statData.places) {
      dataGroupsDict[this.props.placeNames[place]] = getStatVarGroupWithTime(
        this.state.statData,
        place
      );
    }
    const modelsDataGroupsDict = {};
    if (this.state.ipccModels) {
      for (const place of this.state.ipccModels.places) {
        modelsDataGroupsDict[
          this.props.placeNames[place]
        ] = getStatVarGroupWithTime(this.state.ipccModels, place);
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
