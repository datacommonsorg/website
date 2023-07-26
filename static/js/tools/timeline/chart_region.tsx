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

import { DEFAULT_POPULATION_DCID } from "../../shared/constants";
import { StatMetadata } from "../../shared/stat_types";
import { StatVarInfo } from "../../shared/stat_var";
import { saveToFile } from "../../shared/util";
import { getStatVarGroups } from "../../utils/app/timeline_utils";
import { BqModal } from "../shared/bq_modal";
import { getTimelineSqlQuery } from "./bq_query_utils";
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

interface ChartOptions {
  perCapita: boolean;
  denom: string;
  delta: boolean;
}
export interface ChartGroupInfo {
  chartOrder: string[];
  chartIdToStatVars: { [key: string]: string[] };
  chartIdToOptions: { [key: string]: ChartOptions };
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
  bqLink: HTMLAnchorElement;
  allStatData: { [key: string]: StatData };
  // map of stat var dcid to map of metahash to source metadata
  metadataMap: Record<string, Record<string, StatMetadata>>;

  constructor(props: ChartRegionPropsType) {
    super(props);
    this.allStatData = {};
    this.metadataMap = {};
    this.downloadLink = document.getElementById(
      "download-link"
    ) as HTMLAnchorElement;
    if (this.downloadLink) {
      this.downloadLink.onclick = () => {
        saveToFile("export.csv", this.createDataCsv(this.props.placeName));
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
    // TODO: uncomment to re-enable opening big query
    // this.bqLink = setUpBqButton(this.getSqlQuery);
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
    if (this.bqLink) {
      this.bqLink.style.display = this.shouldShowBqButton(chartGroupInfo)
        ? "inline-block"
        : "none";
    }
    return (
      <React.Fragment>
        {chartGroupInfo.chartOrder.map((mprop) => {
          return (
            <Chart
              key={mprop}
              chartId={mprop}
              placeNameMap={this.props.placeName}
              statVarInfos={_.pick(
                this.props.statVarInfo,
                chartGroupInfo.chartIdToStatVars[mprop]
              )}
              pc={chartGroupInfo.chartIdToOptions[mprop].perCapita}
              denom={chartGroupInfo.chartIdToOptions[mprop].denom}
              delta={chartGroupInfo.chartIdToOptions[mprop].delta}
              onDataUpdate={this.onDataUpdate.bind(this)}
              removeStatVar={(statVar) => {
                removeToken("statsVar", statVarSep, statVar);
                setMetahash({ [statVar]: "" });
              }}
              svFacetId={_.pick(
                getMetahash(),
                chartGroupInfo.chartIdToStatVars[mprop]
              )}
              onMetadataMapUpdate={(metadataMap) => {
                this.metadataMap = { ...this.metadataMap, ...metadataMap };
              }}
            ></Chart>
          );
        }, this)}
        <BqModal
          getSqlQuery={this.getSqlQuery(chartGroupInfo).bind(this)}
          showButton={this.shouldShowBqButton(chartGroupInfo)}
        />
      </React.Fragment>
    );
  }

  componentWillUnmount() {
    if (this.bqLink) {
      this.bqLink.style.display = "none";
    }
    if (this.downloadLink) {
      this.downloadLink.style.display = "none";
    }
    if (this.bulkDownloadLink) {
      this.bulkDownloadLink.style.display = "none";
    }
  }

  private onDataUpdate(groupId: string, data: StatData) {
    this.allStatData[groupId] = data;
    const displayStyle =
      Object.keys(this.allStatData).length > 0 ? "inline-block" : "none";
    if (this.downloadLink) {
      this.downloadLink.style.display = displayStyle;
    }
    if (this.bulkDownloadLink) {
      this.bulkDownloadLink.style.display = displayStyle;
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
    const { groups, chartOrder } = getStatVarGroups(statVarOrder, statVarInfo);
    const options = {};
    for (const chartId of chartOrder) {
      options[chartId] = {
        delta: getChartOption(chartId, "delta"),
        denom: getDenom(chartId) || DEFAULT_POPULATION_DCID,
        perCapita: getChartOption(chartId, "pc"),
      };
    }
    return {
      chartIdToOptions: options,
      chartIdToStatVars: groups,
      chartOrder,
    };
  }

  private createDataCsv(placeNames: Record<string, string>) {
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

    // Iterate each year, group, place, stats var to populate data
    const rows: string[][] = [];
    for (const date of Array.from(allDates)) {
      const row: string[] = [date];
      for (const mprop in this.allStatData) {
        const statData = this.allStatData[mprop];
        for (const sv of statData.statVars) {
          for (const place of statData.places) {
            const tmp = statData.data[sv][place];
            let val = "";
            if (tmp && tmp.series) {
              for (const obs of tmp.series) {
                if (obs.date == date) {
                  val = obs.value.toString();
                  break;
                }
              }
            }
            row.push(val);
          }
        }
      }
      rows.push(row);
    }
    let headerRow = header.join(",") + "\n";
    for (const dcid in placeNames) {
      const re = new RegExp(dcid, "g");
      headerRow = headerRow.replace(re, placeNames[dcid]);
    }
    let result = headerRow;
    for (const row of rows) {
      result += row.join(",") + "\n";
    }
    return result;
  }

  private shouldShowBqButton(chartGroupInfo: ChartGroupInfo): boolean {
    for (const mprop of Object.keys(chartGroupInfo.chartIdToStatVars)) {
      if (!getChartOption(mprop, "delta")) {
        return true;
      }
    }
    return false;
  }

  private getSqlQuery = (chartGroupInfo: ChartGroupInfo) => () => {
    return getTimelineSqlQuery(
      chartGroupInfo,
      Object.keys(this.props.placeName),
      getMetahash(),
      this.metadataMap
    );
  };
}

export { ChartRegion, ChartRegionPropsType, StatVarInfo };
