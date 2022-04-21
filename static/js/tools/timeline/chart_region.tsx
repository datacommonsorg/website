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
import { BqModal } from "../shared/bq_modal";
import { getSvMetadataPredicate, setUpBqButton } from "../shared/bq_utils";
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
    // TODO: add webdriver test for BigQuery button to ensure query works
    this.getSqlQuery = this.getSqlQuery.bind(this);
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
              mprop={mprop}
              placeNames={this.props.placeName}
              statVarInfos={_.pick(
                this.props.statVarInfo,
                chartGroupInfo.chartIdToStatVars[mprop]
              )}
              pc={getChartOption(mprop, "pc")}
              denom={getDenom(mprop) || DEFAULT_POPULATION_DCID}
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
              onMetadataMapUpdate={(metadataMap) => {
                this.metadataMap = { ...this.metadataMap, ...metadataMap };
              }}
            ></Chart>
          );
        }, this)}
        <BqModal
          getSqlQuery={this.getSqlQuery}
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

  private shouldShowBqButton(chartGroupInfo: ChartGroupInfo): boolean {
    for (const mprop of Object.keys(chartGroupInfo.chartIdToStatVars)) {
      if (!getChartOption(mprop, "delta")) {
        return true;
      }
    }
    return false;
  }

  private getQueryForGroup(
    svList: string[],
    places: string[],
    metahashMap: Record<string, string>
  ): string {
    const svMetadataMap = {};
    for (const sv of svList) {
      const metahash = metahashMap[sv];
      svMetadataMap[sv] = this.metadataMap[sv]
        ? this.metadataMap[sv][metahash] || {}
        : {};
    }
    let svMetadataPredicate = svList
      .map((sv) => {
        const predicate = _.isEmpty(svMetadataMap[sv])
          ? `O.variable_measured = '${sv}' AND O.facet_rank = 1`
          : `O.variable_measured = '${sv}' AND
${getSvMetadataPredicate("O", svMetadataMap[sv])}`;
        return svList.length > 1 ? `(${predicate})` : predicate;
      })
      .join(" OR\n");
    if (svList.length > 1) {
      svMetadataPredicate = `(${svMetadataPredicate})`;
    }
    let placesPredicate = places
      .map((place) => `O.observation_about = '${place}'`)
      .join(" OR ");
    if (places.length > 1) {
      placesPredicate = `(${placesPredicate})`;
    }
    return `SELECT O.observation_about AS PlaceId,
    P.name AS PlaceName,
    O.variable_measured AS VariableId,
    V.name AS VariableName,
    O.observation_date AS Date,
    CAST(O.value AS FLOAT64) AS Value,
    O.measurement_method AS MeasurementMethod,
    O.unit AS Unit,
    NET.REG_DOMAIN(I.provenance_url) AS Source,
    NULL as DenomDate,
    NULL as DenomValue
FROM \`data_commons.Observation\` AS O
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
WHERE
    ${svMetadataPredicate} AND
    O.observation_about = P.id AND
    O.variable_measured = V.id AND
    O.prov_id = I.prov_id AND
    ${placesPredicate}`;
  }

  private getPcQueryForGroup(
    svList: string[],
    places: string[],
    metahashMap: Record<string, string>
  ): string {
    const svMetadataMap = {};
    for (const sv of svList) {
      const metahash = metahashMap[sv];
      svMetadataMap[sv] = this.metadataMap[sv]
        ? this.metadataMap[sv][metahash] || {}
        : {};
    }
    let svMetadataPredicate = svList
      .map((sv) => {
        const predicate = _.isEmpty(svMetadataMap[sv])
          ? `ONum.variable_measured = '${sv}' AND ONum.facet_rank = 1`
          : `ONum.variable_measured = '${sv}' AND
${getSvMetadataPredicate("ONum", svMetadataMap[sv])}`;
        return svList.length > 1 ? `(${predicate})` : predicate;
      })
      .join(" OR\n");
    if (svList.length > 1) {
      svMetadataPredicate = `(${svMetadataPredicate})`;
    }
    let placesPredicate = places
      .map((place) => `ONum.observation_about = '${place}'`)
      .join(" OR ");
    if (places.length > 1) {
      placesPredicate = `(${placesPredicate})`;
    }
    return (
      `(WITH PlaceObsDatesAndDenomRank AS (` +
      `
SELECT ONum.observation_about AS PlaceId,
      ONum.variable_measured AS NumVariableId,
      ONum.observation_date AS NumDate,
      ODenom.variable_measured AS DenomVariableId,
      ODenom.observation_date AS DenomDate,
      MIN(ODenom.facet_rank) AS DenomRank
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
WHERE
    ODenom.observation_date = SUBSTR(ONum.observation_date, 0, 4) AND
    ODenom.observation_about = ONum.observation_about AND
    ODenom.variable_measured = 'Count_Person' AND
    ${svMetadataPredicate} AND
    ${placesPredicate}
GROUP BY PlaceId, NumVariableId, NumDate, DenomVariableId, DenomDate
)
SELECT ONum.observation_about AS PlaceId,
      P.name AS PlaceName,
      ONum.variable_measured AS VariableId,
      CONCAT(V.name, " (Per Capita)") AS VariableName,
      ONum.observation_date AS Date,
      IF(ODenom.value IS NOT NULL AND CAST(ODenom.value AS FLOAT64) > 0,
        CAST(ONum.value AS FLOAT64) / CAST(ODenom.value AS FLOAT64),
        NULL) AS Value,
      ONum.measurement_method AS MeasurementMethod,
      ONum.unit AS Unit,
      NET.REG_DOMAIN(I.provenance_url) AS Source,
      ODenom.observation_date AS DenomDate,
      ODenom.value AS DenomValue,
FROM \`data_commons.Observation\` AS ONum
JOIN \`data_commons.Observation\` AS ODenom ON TRUE
JOIN PlaceObsDatesAndDenomRank AS PODDR ON TRUE
JOIN \`data_commons.Place\` AS P ON TRUE
JOIN \`data_commons.Variable\` AS V ON TRUE
JOIN \`data_commons.Provenance\` AS I ON TRUE
WHERE
    PODDR.PlaceId = ONum.observation_about AND
    PODDR.NumVariableId = ONum.variable_measured AND
    PODDR.NumDate = ONum.observation_date AND
    PODDR.PlaceId = ODenom.observation_about AND
    PODDR.DenomVariableId = ODenom.variable_measured AND
    PODDR.DenomDate = ODenom.observation_date AND
    PODDR.DenomRank = ODenom.facet_rank AND
    ${svMetadataPredicate} AND
    ONum.observation_about = P.id AND
    ONum.variable_measured = V.id AND
    ONum.prov_id = I.prov_id AND
    ${placesPredicate})`
    );
  }

  // TODO: Add unit tests for this function
  private getSqlQuery(): string {
    const chartGroupInfo = this.groupStatVars(
      this.props.statVarOrder,
      this.props.statVarInfo
    );
    const places = Object.keys(this.props.placeName);
    const metahashMap = getMetahash();
    const query = Object.keys(chartGroupInfo.chartIdToStatVars)
      .map((mprop) => {
        if (getChartOption(mprop, "delta")) {
          return "";
        }
        const isPc = getChartOption(mprop, "pc");
        if (isPc) {
          return this.getPcQueryForGroup(
            chartGroupInfo.chartIdToStatVars[mprop],
            places,
            metahashMap
          );
        } else {
          return this.getQueryForGroup(
            chartGroupInfo.chartIdToStatVars[mprop],
            places,
            metahashMap
          );
        }
      })
      .filter((s) => s !== "")
      .join("\n\nUNION ALL\n");
    return query + "\nORDER BY PlaceId, VariableId, Date";
  }
}

export { ChartRegion, ChartRegionPropsType, StatVarInfo };
