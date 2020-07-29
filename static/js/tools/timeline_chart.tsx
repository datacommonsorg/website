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
import { updateUrl, saveToFile } from "./timeline_util";
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
  downloadLink: HTMLAnchorElement;

  constructor(props: ChartRegionPropsType) {
    super(props);
    this.grouping = {};
    this.placeName = {};
    this.chartContainer = React.createRef();
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.downloadLink = document.getElementById(
      "download-link"
    ) as HTMLAnchorElement;
    this.downloadLink.onclick = () => {
      saveToFile("export.csv", this.createDataCsv());
    };
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
          const statsVars = this.grouping[domId];
          const statsVarsTile = statsVars.map(sv => this.props.statsVars[sv].title);
          const plotParams = computePlotParams(
            this.props.places.map((x) => x[1]),
            statsVarsTile,
          );
          // Stats var chip color is independent of places, so pick one place to
          // provide a key for style look up.
          const placeName = this.props.places[0][1];
          return (
            <div key={domId} className="card">
              <div id={domId} className="chart-svg"></div>
              <div>
                {statsVars.map(
                  function (statsVar) {
                    let color: string;
                    const statsVarTitle = this.props.statsVars[statsVar].title;
                    if (statsVars.length > 1) {
                      color = plotParams.lines[placeName + statsVarTitle].color;
                    }
                    return (
                      <StatsVarChip
                        statsVar={statsVar}
                        title={statsVarTitle}
                        color={color}
                        key={randDomId()}
                        deleteStatsVarChip={this.deleteStatsVarChip}
                      />
                    );
                  }.bind(this)
                )}
              </div>
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
      this.downloadLink.style.visibility = "visible";
    } else {
      this.downloadLink.style.visibility = "hidden";
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
      const statsVars = this.grouping[domId];
      if (!statsVars) {
        continue;
      }
      const statsVarsTitle = {};
      for (const statsVar of statsVars) {
        statsVarsTitle[statsVar] = this.props.statsVars[statsVar].title || statsVar;
      }
      const plotParams = computePlotParams(
        this.props.places.map((x) => x[1]),
        Object.values(statsVarsTitle),
      );
      drawGroupLineChart(
        statsData.domId,
        this.chartContainer.current.offsetWidth,
        CHART_HEIGHT,
        statsVarsTitle,
        dataGroupsDict,
        plotParams,
        Array.from(statsData.data.sources)
      );
    }
  }

  private deleteStatsVarChip(statsVarUpdate: string) {
    updateUrl({ statsVar: { statsVar: statsVarUpdate, shouldAdd: false } });
  }

  private createDataCsv() {
    // Get all the dates
    let allDates = new Set<string>();
    for (const statData of this.allStatsData) {
      allDates = new Set([...Array.from(allDates), ...statData.data.dates]);
    }
    // Create the the header row.
    const header = ["date"];
    for (const statData of this.allStatsData) {
      for (const place of statData.data.places) {
        for (const sv of statData.data.statsVars) {
          header.push(`${place} ${sv}`);
        }
      }
    }
    // Get the place name
    const placeName: { [key: string]: string } = {};
    const sample = this.allStatsData[0].data;
    const statsVar = sample.statsVars[0];
    for (const place of sample.places) {
      placeName[sample.data[statsVar][place].place_dcid] =
        sample.data[statsVar][place].place_name;
    }

    // Iterate each year, group, place, stats var to populate data
    const rows: string[][] = [];
    for (const date of Array.from(allDates)) {
      const row: string[] = [date];
      for (const statData of this.allStatsData) {
        for (const p of statData.data.places) {
          for (const sv of statData.data.statsVars) {
            const tmp = statData.data.data[sv][p];
            if (tmp && tmp.data && tmp.data[date]) {
              row.push(String(tmp.data[date]));
            } else {
              row.push("");
            }
          }
        }
      }
      rows.push(row);
    }
    let headerRow = header.join(",") + "\n";
    for (const dcid in placeName) {
      const re = new RegExp(dcid, "g");
      headerRow = headerRow.replace(re, placeName[dcid]);
    }
    let result = headerRow;
    for (const row of rows) {
      result += row.join(",") + "\n";
    }
    return result;
  }
}

export { ChartRegionPropsType, ChartRegion, StatsVarInfo };
