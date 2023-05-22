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

import React from "react";

import { intl, LocalizedLink, translateUnit } from "../i18n/i18n";
import { displayNameForPlaceType } from "../place/util";
import { randDomId } from "../shared/util";
import { getRoot } from "../utils/axios";
import { RankInfo, Ranking } from "./ranking_types";

interface RankingTablePropType {
  ranking: Ranking;
  placeType: string;
  sortAscending: boolean;
  scaling: number;
  unit: string;
  isPerCapita: boolean;
  statVar: string;
}

class RankingTable extends React.Component<RankingTablePropType> {
  info: RankInfo[];
  numFractionDigits: number;

  constructor(props: RankingTablePropType) {
    super(props);
    // Clone and sort the copy since there might be a different sort ordering elsewhere (e.g. histogram)
    this.info = [...this.props.ranking.info];
    this.info.sort((a, b) => {
      if (this.props.sortAscending) {
        return a.rank - b.rank;
      } else {
        return b.rank - a.rank;
      }
    });
    const statVar = this.props.statVar;
    if (
      (statVar.startsWith("Count_") &&
        !statVar.includes("FractionOf") &&
        !this.props.isPerCapita) ||
      statVar.startsWith("Median_Income")
    ) {
      this.numFractionDigits = 0;
    } else {
      this.numFractionDigits = 2;
    }
  }

  private renderRankInfo(rankInfo: RankInfo, scaling: number): JSX.Element {
    let value = rankInfo.value ? rankInfo.value : 0;
    value = value * scaling;
    return (
      <tr key={rankInfo.rank} data-dcid={rankInfo.placeDcid}>
        <td>{rankInfo.rank ? rankInfo.rank : 0}</td>
        <td>
          <LocalizedLink
            href={`${getRoot()}/place/${rankInfo.placeDcid}`}
            text={rankInfo.placeName || rankInfo.placeDcid}
          />
        </td>
        <td className="text-center">
          <span className="num-value">
            {value.toLocaleString(intl.locale, {
              maximumFractionDigits: this.numFractionDigits,
              minimumFractionDigits: this.numFractionDigits,
            })}
          </span>
        </td>
      </tr>
    );
  }

  render(): JSX.Element {
    return (
      <table key={randDomId()} className="table mt-3">
        <thead>
          <tr>
            <th scope="col">
              {intl.formatMessage({
                id: "ranking_table-header_rank",
                defaultMessage: "Rank",
                description:
                  "Column header for a ranking table. Column includes values associated with the numerical rank of a place.",
              })}
            </th>
            <th scope="col">{displayNameForPlaceType(this.props.placeType)}</th>
            <th scope="col" className="text-center">
              {this.props.unit
                ? translateUnit(this.props.unit)
                : intl.formatMessage({
                    id: "ranking_table-header_value",
                    defaultMessage: "Value",
                    description:
                      "Column header for a ranking table. Column includes values associated with a statistical variable for a place.",
                  })}
            </th>
          </tr>
        </thead>
        <tbody>
          {this.info &&
            this.info.map((rankInfo) => {
              return this.renderRankInfo(rankInfo, this.props.scaling);
            })}
        </tbody>
      </table>
    );
  }
}

export { RankingTable };
