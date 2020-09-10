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
import { Ranking, RankInfo } from "./ranking_types";

interface RankingTablePropType {
  ranking: Ranking;
  id: string;
}

class RankingTable extends Component<RankingTablePropType> {
  constructor(props: RankingTablePropType) {
    super(props);
  }

  render(): JSX.Element {
    function renderRankInfo(rankInfo) {
      return (
        <tr key={rankInfo.rank}>
          <td>{rankInfo.rank ? rankInfo.rank : 0}</td>
          <td>
            <a href={`/place?dcid=${rankInfo.placeDcid}`}>
              {rankInfo.placeName || rankInfo.placeDcid}
            </a>
          </td>
          <td className="text-right">{rankInfo.value.toLocaleString()}</td>
        </tr>
      );
    }

    return (
      <table key={this.props.id} className="table mt-3">
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Place</th>
            <th scope="col" className="text-center">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {this.props.ranking &&
            this.props.ranking.info.map((rankInfo) => {
              return renderRankInfo(rankInfo);
            })}
        </tbody>
      </table>
    );
  }
}

export { RankingTable };
