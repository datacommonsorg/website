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
import axios from "axios";
import { STATS_VAR_TITLES } from "../shared/stats_var_titles";
import { LocationRankData } from "./ranking_types";
import { RankingHistogram } from "./ranking_histogram";
import { RankingTable } from "./ranking_table";
import { pluralizedDisplayNameForPlaceType } from "../shared/util";

const GET_BOTTOM_PARAM = "bottom";
const RANK_SIZE = 100;

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

class Page extends React.Component<RankingPagePropType, RankingPageStateType> {
  constructor(props: RankingPagePropType) {
    super(props);
    this.state = {
      data: undefined,
    };
  }

  private renderToggle(): JSX.Element {
    const svData = this.state.data;
    if (svData.rankAll) return;
    if (svData.rankBottom1000) {
      // show link to top 100
      const params = new URLSearchParams(window.location.search);
      params.delete(GET_BOTTOM_PARAM);
      const search = params.toString();
      const href = window.location.pathname + (search ? "?" + search : "");
      return <a href={href}>Show Top {RANK_SIZE}</a>;
    }
    // show link to bottom 100
    const search = window.location.search;
    const href =
      window.location.pathname +
      (search == "" ? "?" : search + "&") +
      GET_BOTTOM_PARAM;
    return <a href={href}>Show Bottom {RANK_SIZE}</a>;
  }

  render(): JSX.Element {
    const statVar = this.props.statVar;
    const svData = this.state.data;
    if (svData === undefined) {
      return <div>Loading...</div>;
    } else if (svData === null) {
      return <div>There is no ranking data for {statVar}</div>;
    }
    let isBottom = false;
    let ranking = svData.rankAll || svData.rankTop1000;
    if (!ranking) {
      ranking = svData.rankBottom1000;
      isBottom = true;
    }
    if (!ranking.info) {
      return <div>There is no ranking data for {statVar}</div>;
    }
    let subtitle = "";
    if (this.props.isPerCapita) {
      subtitle = ", Per Capita";
    }
    return (
      <div key={statVar}>
        <div className="btn-group btn-group-sm float-right" role="group"></div>
        <h1>Rankings of {STATS_VAR_TITLES[statVar]}</h1>
        <h3>
          {svData.rankAll
            ? "All"
            : svData.rankTop1000
            ? "Top " + RANK_SIZE
            : "Bottom " + RANK_SIZE}{" "}
          {pluralizedDisplayNameForPlaceType(this.props.placeType)} in{" "}
          {this.props.placeName}
          {subtitle}
          {this.renderToggle()}
        </h3>
        <RankingHistogram ranking={ranking} id={"ranking-chart"} />
        <RankingTable
          ranking={ranking}
          id={"ranking-table"}
          placeType={this.props.placeType}
          sortAscending={!isBottom}
        />
      </div>
    );
  }

  componentDidMount(): void {
    const url =
      `/api/ranking/${this.props.statVar}/${this.props.placeType}/${this.props.withinPlace}` +
      window.location.search;
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
