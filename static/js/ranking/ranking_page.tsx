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
import { pluralizedDisplayNameForPlaceType } from "../shared/util";

interface RankingPagePropType {
  placeName: string;
  placeType: string;
  withinPlace: string;
  statVar: string;
  isPerCapita: boolean;
}

interface RankingPageStateType {
  data: LocationRankData;
}

class Page extends Component<RankingPagePropType, RankingPageStateType> {
  constructor(props: RankingPagePropType) {
    super(props);
    this.state = {
      data: undefined,
    };
  }
  render(): JSX.Element {
    const statVar = this.props.statVar;
    const svData = this.state.data;
    if (svData === undefined) {
      return <div>Loading...</div>;
    } else if (svData === null) {
      return <div>There is no ranking data for {statVar}</div>;
    }
    const ranking = svData.rankAll || svData.rankTop1000;
    let subtitle = "";
    if (this.props.isPerCapita) {
      subtitle = ", Per Capita";
    }
    return (
      <div key={statVar}>
        <h1>Rankings of {STATS_VAR_TITLES[statVar]}</h1>
        <h3>
          {pluralizedDisplayNameForPlaceType(this.props.placeType)} in{" "}
          {this.props.placeName}
          {subtitle}
        </h3>
        <RankingHistogram ranking={ranking} id={"ranking-chart"} />
        <RankingTable
          ranking={ranking}
          id={"ranking-table"}
          placeType={this.props.placeType}
        />
      </div>
    );
  }

  componentDidMount(): void {
    let url = `/api/ranking/${this.props.statVar}/${this.props.placeType}/${this.props.withinPlace}`;
    if (this.props.isPerCapita) {
      url += "?pc";
    }
    axios
      .get(url)
      .then((resp) => {
        let respData = null;
        if (
          resp.data &&
          resp.data.payload &&
          this.props.statVar in resp.data.payload
        ) {
          respData = resp.data.payload[this.props.statVar];
          document.title = `${
            STATS_VAR_TITLES[this.props.statVar]
          } of ${pluralizedDisplayNameForPlaceType(this.props.placeType)} in ${
            this.props.placeName
          } | Place Rankings`;
        }
        this.setState({
          data: respData,
        });
      })
      .catch((error) => {
        // TODO(beets): Add better error handling messages
        this.setState({
          data: null,
        });
      });
  }
}

export { Page };
