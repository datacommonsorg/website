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

import { StatVarInfo } from "../../shared/stat_var";
import { saveToFile } from "../../shared/util";
import { Chart } from "./chart";
import { StatData } from "./data_fetcher";
import {
  getChartOption,
  getDenom,
  getMetahash,
  removeToken,
  setMetahash,
  statVarSep,
} from "./util";

interface ChartGroupInfo {
  chartOrder: string[];
  chartIdToStatVars: { [key: string]: string[] };
}
interface ChartRegionPropsType {
  // Map from place dcid to place name.
  placeName: Record<string, string>;
  // Map from stat var dcid to info.
  statVarInfo: { [key: string]: StatVarInfo };
  // Order in which stat vars were selected.
  statVarOrder: string[];
}

class ChartRegion extends Component<ChartRegionPropsType> {
  downloadLink: HTMLAnchorElement;
  bulkDownloadLink: HTMLAnchorElement;
  allStatData: { [key: string]: StatData };

  constructor(props: ChartRegionPropsType) {
    super(props);
    this.allStatData = {};
    this.downloadLink = document.getElementById(
      "download-link"
    ) as HTMLAnchorElement;
    if (this.downloadLink) {
      this.downloadLink.onclick = () => {
        saveToFile("export.csv", this.createDataCsv());
      };
    }
    this.bulkDownloadLink = document.getElementById(
      "bulk-download-link"
    ) as HTMLAnchorElement;
    if (this.bulkDownloadLink) {
      this.bulkDownloadLink.onclick = () => {
        // Carry over hash params, which is used by the bulk download tool for
        // stat var parsing.
        window.location.href = window.location.href.replace(
          "/timeline",
          "/timeline/bulk_download"
        );
      };
    }
  }

  render(): JSX.Element {
    if (
      Object.keys(this.props.placeName).length === 0 ||
      Object.keys(this.props.statVarInfo).length === 0
    ) {
      return <div></div>;
    }
    // Group stat vars by measured property.
    const chartGroupInfo = this.groupStatVars(
      this.props.statVarOrder,
      this.props.statVarInfo
    );
    return (
      <React.Fragment>
        {chartGroupInfo.chartOrder.map((mprop) => {
          return (
            <Chart
              key={mprop}
              mprop={mprop}
              placeNames={this.props.placeName}
              statVarInfos={_.pick(
                this.props.statVarInfo,
                chartGroupInfo.chartIdToStatVars[mprop]
              )}
              pc={getChartOption(mprop, "pc")}
              denom={getDenom(mprop) || ""}
              delta={getChartOption(mprop, "delta")}
              onDataUpdate={this.onDataUpdate.bind(this)}
              removeStatVar={(statVar) => {
                removeToken("statsVar", statVarSep, statVar);
                setMetahash({ [statVar]: "" });
              }}
              metahashMap={_.pick(
                getMetahash(),
                chartGroupInfo.chartIdToStatVars[mprop]
              )}
            ></Chart>
          );
        }, this)}
      </React.Fragment>
    );
  }

  private onDataUpdate(groupId: string, data: StatData) {
    this.allStatData[groupId] = data;
    if (this.downloadLink && Object.keys(this.allStatData).length > 0) {
      this.downloadLink.style.display = "inline-block";
      this.bulkDownloadLink.style.display = "inline-block";
    } else {
      this.downloadLink.style.display = "none";
      this.bulkDownloadLink.style.display = "none";
    }
  }

  /**
   * Group stats vars with same measured property together so they can be plot
   * in the same chart and get the order in which the charts should be rendered.
   *
   * TODO(shifucun): extend this to accomodate other stats var properties.
   *
   * @param statVarOrder The input stat vars in the order they were selected.
   * @param statVars The stat var info of the selected stat vars.
   */
  private groupStatVars(
    statVarOrder: string[],
    statVarInfo: {
      [key: string]: StatVarInfo;
    }
  ): ChartGroupInfo {
    const groups = {};
    const chartOrder = [];
    for (const statVarId of statVarOrder) {
      if (!statVarInfo[statVarId]) {
        continue;
      }
      const mprop = statVarInfo[statVarId].mprop;
      if (!groups[mprop]) {
        groups[mprop] = [];
      }
      groups[mprop].push(statVarId);
      chartOrder.push(mprop);
    }
    // we want to show the charts in reverse order of when the stat vars were
    // picked. (ie. chart of last picked stat var should be shown first)
    if (!_.isEmpty(chartOrder)) {
      chartOrder.reverse();
    }
    const seenGroups = new Set();
    const filteredChartOrder = chartOrder.filter((group) => {
      const keep = !seenGroups.has(group);
      seenGroups.add(group);
      return keep;
    });
    return { chartOrder: filteredChartOrder, chartIdToStatVars: groups };
  }

  private createDataCsv() {
    // Get all the dates
    let allDates = new Set<string>();
    for (const mprop in this.allStatData) {
      const statData = this.allStatData[mprop];
      allDates = new Set([...Array.from(allDates), ...statData.dates]);
    }
    // Create the the header row.
    const header = ["date"];
    for (const mprop in this.allStatData) {
      const statData = this.allStatData[mprop];
      for (const place of statData.places) {
        for (const sv of statData.statVars) {
          header.push(`${place} ${sv}`);
        }
      }
    }
    // Get the place name
    const placeName: { [key: string]: string } = {};
    const sample = Object.values(this.allStatData)[0];
    for (const place of sample.places) {
      placeName[place] = sample.data[place].name;
    }

    // Iterate each year, group, place, stats var to populate data
    const rows: string[][] = [];
    for (const date of Array.from(allDates)) {
      const row: string[] = [date];
      for (const mprop in this.allStatData) {
        const statData = this.allStatData[mprop];
        for (const place of statData.places) {
          for (const sv of statData.statVars) {
            const tmp = statData.data[place].data[sv];
            if (tmp && tmp.val && tmp.val[date]) {
              row.push(String(tmp.val[date]));
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

export { ChartRegion, ChartRegionPropsType, StatVarInfo };
