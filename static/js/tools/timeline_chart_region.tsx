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
import { StatsData } from "../shared/data_fetcher";
import { StatsVarInfo, ChartOptions } from "./timeline_util";
import { saveToFile } from "../shared/util";
import { Chart } from "./timeline_chart";

interface ChartRegionPropsType {
  // An array of place dcids.
  places: Record<string, string>;
  statsVars: { [key: string]: StatsVarInfo };
  statsVarTitle: Record<string, string>;
  removeStatsVar: (statsVar: string, nodePath?: string[]) => void;
  chartOptions: ChartOptions;
  setPC: (mprop: string, pc: boolean) => void;
  // mappings from StatVar DCIDs to all their possible per capita denominators
  denominators: { [key: string]: string[] };
}

class ChartRegion extends Component<ChartRegionPropsType, unknown> {
  downloadLink: HTMLAnchorElement;
  allStatsData: { [key: string]: StatsData };

  constructor(props: ChartRegionPropsType) {
    super(props);
    this.allStatsData = {};
    this.downloadLink = document.getElementById(
      "download-link"
    ) as HTMLAnchorElement;
    if (this.downloadLink) {
      this.downloadLink.onclick = () => {
        saveToFile("export.csv", this.createDataCsv());
      };
    }
  }

  render(): JSX.Element {
    if (
      Object.keys(this.props.places).length === 0 ||
      Object.keys(this.props.statsVars).length === 0
    ) {
      return <div></div>;
    }
    const groups = this.groupStatsVars(this.props.statsVars);
    return (
      <React.Fragment>
        {Object.keys(groups).map((groupId) => {
          const statsVarDcids = groups[groupId];
          const statsVars = {};
          const statsVarTitle = {};
          const denominators = {};
          for (const id of statsVarDcids) {
            statsVars[id] = this.props.statsVars[id];
            statsVarTitle[id] = this.props.statsVarTitle[id];
            denominators[id] =
              this.props.denominators[id][0] || "Count_Persons";
          }
          return (
            <Chart
              key={groupId}
              groupId={groupId}
              places={this.props.places}
              statsVars={statsVars}
              perCapita={
                groupId in this.props.chartOptions
                  ? this.props.chartOptions[groupId].pc
                  : false
              }
              onDataUpdate={this.onDataUpdate.bind(this)}
              statsVarTitle={statsVarTitle}
              removeStatsVar={this.props.removeStatsVar}
              setPC={this.props.setPC}
              denominators={denominators}
            ></Chart>
          );
        }, this)}
      </React.Fragment>
    );
  }

  private onDataUpdate(groupId: string, data: StatsData) {
    this.allStatsData[groupId] = data;
    if (this.downloadLink && Object.keys(this.allStatsData).length > 0) {
      this.downloadLink.style.visibility = "visible";
    } else {
      this.downloadLink.style.visibility = "hidden";
    }
  }

  /**
   * Group stats vars with same measured property together so they can be plot
   * in the same chart.
   *
   * TODO(shifucun): extend this to accomodate other stats var properties.
   *
   * @param statsVars All the input stats vars.
   */
  private groupStatsVars(statsVars: {
    [key: string]: StatsVarInfo;
  }): { [key: string]: string[] } {
    const groups = {};
    for (const statsVarId in statsVars) {
      const mprop = statsVars[statsVarId].mprop;
      if (!groups[mprop]) {
        groups[mprop] = [];
      }
      groups[mprop].push(statsVarId);
    }
    return groups;
  }

  private createDataCsv() {
    // Get all the dates
    let allDates = new Set<string>();
    for (const mprop in this.allStatsData) {
      const statData = this.allStatsData[mprop];
      allDates = new Set([...Array.from(allDates), ...statData.dates]);
    }
    // Create the the header row.
    const header = ["date"];
    for (const mprop in this.allStatsData) {
      const statData = this.allStatsData[mprop];
      for (const place of statData.places) {
        for (const sv of statData.statsVars) {
          header.push(`${place} ${sv}`);
        }
      }
    }
    // Get the place name
    const placeName: { [key: string]: string } = {};
    const sample = Object.values(this.allStatsData)[0];
    const statsVar = sample.statsVars[0];
    for (const place of sample.places) {
      placeName[sample.data[statsVar][place].placeDcid] =
        sample.data[statsVar][place].placeName;
    }

    // Iterate each year, group, place, stats var to populate data
    const rows: string[][] = [];
    for (const date of Array.from(allDates)) {
      const row: string[] = [date];
      for (const mprop in this.allStatsData) {
        const statData = this.allStatsData[mprop];
        for (const p of statData.places) {
          for (const sv of statData.statsVars) {
            const tmp = statData.data[sv][p];
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
