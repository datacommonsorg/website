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
import axios from "axios";
import { STATS_VAR_TITLES } from "../shared/stats_var_titles";
import { RankingTable } from "./ranking_table";
import { LocationRankData } from "./ranking_types";
import { RankingHistogram } from "./ranking_histogram";

interface RankingPagePropType {
  placeType: string;
  withinPlace: string;
  statVars: string[];
}

interface RankingPageStateType {
  data: {
    [statVar: string]: LocationRankData;
  };
}

class Page extends Component<RankingPagePropType, RankingPageStateType> {
  constructor(props: RankingPagePropType) {
    super(props);
    this.state = {
      data: {},
    };
  }
  render(): JSX.Element {
    function renderRankInfo(statVar, rankInfo) {
      return (
        <tr key={[statVar, "-", rankInfo.rank].join()}>
          <td>{(rankInfo.rank ? rankInfo.rank : 0) + 1}</td>
          <td>
            <a href={`/place?dcid=${rankInfo.placeDcid}`}>
              {rankInfo.placeName || rankInfo.placeDcid}
            </a>
          </td>
          <td className="text-right">{rankInfo.value.toLocaleString()}</td>
        </tr>
      );
    }

    let statVarFragments = [];
    for (let statVar in this.state.data) {
      let svData = this.state.data[statVar];
      let ranking = svData.rankAll || svData.rankTop1000;
      console.log(ranking);
      statVarFragments.push(
        <div key={statVar}>
          <h3>{STATS_VAR_TITLES[statVar]}</h3>
          <RankingHistogram
            ranking={ranking}
            id={[statVar, "chart"].join("-")}
          />
          <RankingTable ranking={ranking} id={[statVar, "table"].join("-")} />
        </div>
      );
    }

    return <div>{statVarFragments}</div>;
  }

  componentDidMount() {
    const statsParam = this.props.statVars.map((x) => `stat=${x}`).join("&");
    return axios
      .get(
        `/ranking/api/${this.props.placeType}/${this.props.withinPlace}?${statsParam}`
      )
      .then((resp) => {
        this.setState({
          data: resp.data.payload,
        });
      });
  }
}

export { Page };
