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
import { StatsVarInfo, updateUrl } from "./timeline_util";
import {
  fetchStatsData,
  StatsData,
  updateStatsData,
  deleteStatsVar,
  deletePlaces,
} from "../shared/data_fetcher";
import { drawGroupLineChart } from "../chart/draw";
import { PlotParams, computePlotParams } from "../chart/base";

const CHART_HEIGHT = 300;

interface StatsVarChipPropsType {
  statsVar: string;
  color: string;
  deleteStatsVarChip: (statsVar: string) => void;
  title: string;
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
            onClick={() => this.props.deleteStatsVarChip(this.props.statsVar)}
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
  places: [string, string][];
  statsVars: { [key: string]: StatsVarInfo };
  perCapita: boolean;
  onDataUpdate: (mprop: string, data: StatsData) => void;
}

class Chart extends Component<ChartPropsType, unknown> {
  data: StatsData;
  svgContainer: React.RefObject<HTMLDivElement>;
  placeName: { [key: string]: string };
  statsVarsTitle: { [key: string]: string };
  plotParams: PlotParams;
  statsData: StatsData;
  // prevProps keeps the last two props,
  // because the chart would render twice due to "set statsVar title" function in statsVar menu
  prevProps: { places: string[][]; statsVars: string[] }[];

  constructor(props: ChartPropsType) {
    super(props);
    this.placeName = {};
    this.statsVarsTitle = {};
    this.svgContainer = React.createRef();
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.prevProps = [
      { places: [], statsVars: [] },
      { places: [], statsVars: [] },
    ];
  }
  render(): JSX.Element {
    const statsVars = Object.keys(this.props.statsVars);
    // TODO(shifucun): investigate on stats var title, now this is updated
    // several times.
    this.statsVarsTitle = {};
    for (const dcid in this.props.statsVars) {
      this.statsVarsTitle[dcid] = this.props.statsVars[dcid].title || dcid;
    }
    // TODO(shifucn): simplify placeid->name, statsid->name logic.
    for (const place of this.props.places) {
      this.placeName[place[0]] = place[1];
    }
    this.plotParams = computePlotParams(
      this.props.places.map((x) => x[1]),
      Object.values(this.statsVarsTitle)
    );
    // Stats var chip color is independent of places, so pick one place to
    // provide a key for style look up.
    const placeName = this.props.places[0][1];
    return (
      <div className="card">
        <div ref={this.svgContainer} className="chart-svg"></div>
        <div>
          {statsVars.map(
            function (statsVar) {
              let color: string;
              const title = this.statsVarsTitle[statsVar];
              if (statsVars.length > 1) {
                color = this.plotParams.lines[placeName + title].color;
              }
              return (
                <StatsVarChip
                  key={statsVar}
                  statsVar={statsVar}
                  title={title}
                  color={color}
                  deleteStatsVarChip={this.deleteStatsVarChip}
                />
              );
            }.bind(this)
          )}
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    this.loadDataAndDrawChart({ places: [], statsVars: [] });
    window.addEventListener("resize", this.handleWindowResize);
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleWindowResize);
  }

  componentDidUpdate(): void {
    this.loadDataAndDrawChart(this.prevProps[0]);
    this.prevProps.shift();
    this.prevProps.push({
      places: this.props.places,
      statsVars: Object.keys(this.props.statsVars),
    });
  }

  private handleWindowResize() {
    if (!this.svgContainer.current) {
      return;
    }
    this.drawChart();
  }

  private loadDataAndDrawChart(prevProps) {
    const placeDiff = this.compareArray(prevProps.places, this.props.places);
    const statsVarDiff = this.compareArray(
      prevProps.statsVars,
      Object.keys(this.props.statsVars)
    );
    let dataNewPlacePromise: Promise<StatsData>;
    let dataNewStatsVarPromise: Promise<StatsData>;
    // fetch data of new places
    if (placeDiff.add.length !== 0) {
      dataNewPlacePromise = fetchStatsData(
        placeDiff.add.map((x) => x[0]),
        Object.keys(this.props.statsVars),
        this.props.perCapita,
        1
      );
    }
    // fetch data of new statsVars
    if (statsVarDiff.add.length !== 0) {
      dataNewStatsVarPromise = fetchStatsData(
        this.props.places.map((x) => x[0]),
        statsVarDiff.add,
        this.props.perCapita,
        1
      );
    }
    // delete data of unselected statsVars
    if (statsVarDiff.delete.length !== 0) {
      this.statsData = deleteStatsVar(this.statsData, statsVarDiff.delete);
    }
    // delete data of unselected places
    if (placeDiff.delete.length !== 0) {
      this.statsData = deletePlaces(
        this.statsData,
        placeDiff.delete.map((x) => x[0])
      );
    }

    Promise.all([dataNewPlacePromise, dataNewStatsVarPromise]).then(
      (values) => {
        if (placeDiff.add.length !== 0) {
          this.statsData = updateStatsData(this.statsData, values[0]);
        }
        if (statsVarDiff.add.length !== 0) {
          this.statsData = updateStatsData(this.statsData, values[1]);
        }
        this.props.onDataUpdate(this.props.mprop, this.statsData);
        this.drawChart();
      }
    );
  }

  private compareArray(array1, array2) {
    const diff = { add: [], delete: [] };
    for (const item of array1) {
      if (!array2.includes(item)) {
        diff.delete.push(item);
      }
    }
    for (const item of array2) {
      if (!array1.includes(item)) {
        diff.add.push(item);
      }
    }
    return diff;
  }

  /**
   * Draw chart in current svg container based on stats data.
   */
  private drawChart() {
    const dataGroupsDict = {};
    for (const placeDcid of this.statsData.places) {
      dataGroupsDict[
        this.placeName[placeDcid]
      ] = this.statsData.getStatsVarGroupWithTime(placeDcid);
    }
    drawGroupLineChart(
      this.svgContainer.current,
      this.svgContainer.current.offsetWidth,
      CHART_HEIGHT,
      this.statsVarsTitle,
      dataGroupsDict,
      this.plotParams,
      Array.from(this.statsData.sources)
    );
  }

  // TODO(shifucun): no need to pass this function from parent?
  private deleteStatsVarChip(statsVarUpdate: string) {
    updateUrl({ statsVar: { statsVar: statsVarUpdate, shouldAdd: false } });
  }
}

export { Chart };
