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
import { StatData } from "../../shared/data_fetcher";
import { StatVarInfo } from "../statvar_menu/util";
import { saveToFile } from "../../shared/util";
import { Chart } from "./chart";
import { removeToken, getChartPerCapita, statVarSep } from "./util";

interface ChartRegionPropsType {
  // Map from place dcid to place name.
  placeName: Record<string, string>;
  // Map from stat var dcid to info.
  statVarInfo: { [key: string]: StatVarInfo };
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
    const groups = this.groupStatVars(this.props.statVarInfo);
    return (
      <React.Fragment>
        {Object.keys(groups).map((mprop) => {
          return (
            <Chart
              key={mprop}
              mprop={mprop}
              placeName={this.props.placeName}
              statVarInfo={_.pick(this.props.statVarInfo, groups[mprop])}
              perCapita={getChartPerCapita(mprop)}
              onDataUpdate={this.onDataUpdate.bind(this)}
              removeStatVar={(statVar) => {
                removeToken("statsVar", statVarSep, statVar);
              }}
            ></Chart>
          );
        }, this)}
      </React.Fragment>
    );
  }

  private onDataUpdate(groupId: string, data: StatData) {
    this.allStatData[groupId] = data;
    if (this.downloadLink && Object.keys(this.allStatData).length > 0) {
      this.downloadLink.style.visibility = "visible";
      this.bulkDownloadLink.style.visibility = "visible";
    } else {
      this.downloadLink.style.visibility = "hidden";
      this.bulkDownloadLink.style.visibility = "hidden";
    }
  }

  /**
   * Group stats vars with same measured property together so they can be plot
   * in the same chart.
   *
   * TODO(shifucun): extend this to accomodate other stats var properties.
   *
   * @param statVars All the input stats vars.
   */
  private groupStatVars(statVars: {
    [key: string]: StatVarInfo;
  }): { [key: string]: string[] } {
    const groups = {};
    for (const statVarId in statVars) {
      const mprop = statVars[statVarId].mprop;
      if (!groups[mprop]) {
        groups[mprop] = [];
      }
      groups[mprop].push(statVarId);
    }
    return groups;
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

export { ChartRegionPropsType, ChartRegion, StatVarInfo };
