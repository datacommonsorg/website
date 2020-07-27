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
import { randDomId } from "../shared/util";
import { updateUrl } from "./timeline_util";
import { fetchStatsData, StatsData } from "../shared/data_fetcher";
import { drawGroupLineChart, computePlotParams } from "../chart/draw";

const CHART_HEIGHT = 300;

interface StatsVarInfo {
  md: string;
  mprop: string;
  pt: string;
  pvs: { [key: string]: string };
  title: string;
}

interface StatsVarChipPropsType {
  statsVar: string;
  color: string;
  deleteStatsVarChip: (statsVar: string) => void;
  title: string;
}

class StatsVarChip extends Component<StatsVarChipPropsType, {}> {
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

interface ChartRegionPropsType {
  // An array of place dcids.
  places: [string, string][];
  statsVars: { [key: string]: StatsVarInfo };
  perCapita: boolean;
}

class ChartRegion extends Component<ChartRegionPropsType, {}> {
  grouping: { [key: string]: string[] };
  placeName: { [key: string]: string };
  chartContainer: React.RefObject<HTMLDivElement>;
  allStatsData: { domId: string; data: StatsData }[];

  constructor(props: ChartRegionPropsType) {
    super(props);
    this.grouping = {};
    this.placeName = {};
    this.chartContainer = React.createRef();
    this.handleWindowResize = this.handleWindowResize.bind(this);
  }
  render() {
    if (
      this.props.places.length === 0 ||
      Object.keys(this.props.statsVars).length === 0
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
              {Object.keys(plotParams.colors).map((statsVar) => {
                return (
                  <StatsVarChip
                    statsVar={statsVar}
                    title={this.props.statsVars[statsVar].title}
                    color={plotParams.colors[statsVar]}
                    key={randDomId()}
                    deleteStatsVarChip={this.deleteStatsVarChip}
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
    window.addEventListener("resize", this.handleWindowResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleWindowResize);
  }

  componentDidUpdate() {
    this.updateChart();
  }

  private handleWindowResize() {
    if (!this.chartContainer.current) {
      return;
    }
    this.drawChart();
  }

  private buildGrouping() {
    this.grouping = {};
    const temp = {};
    for (const statsVarId in this.props.statsVars) {
      const mprop = this.props.statsVars[statsVarId].mprop;
      if (!temp[mprop]) {
        temp[mprop] = [];
      }
      temp[mprop].push(statsVarId);
    }
    for (const mprop in temp) {
      const domId = randDomId();
      this.grouping[domId] = temp[mprop];
    }
  }

  private updateChart() {
    if (this.props.places.length !== 0) {
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
      Promise.all(promises).then((values) => {
        this.allStatsData = values;
        this.drawChart();
      });
    }
  }

  private drawChart() {
    if (this.props.places.length === 0 || !this.allStatsData) {
      return;
    }
    for (const statsData of this.allStatsData) {
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
      const statsVarTitle = {};
      for (const statsVar of Object.keys(this.props.statsVars)) {
        statsVarTitle[statsVar] = this.props.statsVars[statsVar].title;
      }
      plotParams.title = statsVarTitle;
      drawGroupLineChart(
        statsData.domId,
        this.chartContainer.current.offsetWidth,
        CHART_HEIGHT,
        dataGroupsDict,
        plotParams,
        Array.from(statsData.data.sources),
      );
    }
  }

  private deleteStatsVarChip(statsVar: string) {
    updateUrl({ statsVarDelete: statsVar });
  }
}

export { ChartRegionPropsType, ChartRegion, StatsVarInfo };
