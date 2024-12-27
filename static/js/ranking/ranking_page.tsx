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

import axios from "axios";
import _ from "lodash";
import React from "react";
import { defineMessages } from "react-intl";

import { intl, LocalizedLink } from "../i18n/i18n";
import { displayNameForPlaceType } from "../place/util";
import { DEFAULT_POPULATION_DCID } from "../shared/constants";
import {
  PointApiResponse,
  Series,
  SeriesApiResponse,
} from "../shared/stat_types";
import { getStatsVarTitle } from "../shared/stats_var_titles";
import { getMatchingObservation } from "../tools/shared_util";
import { getRoot, stringifyFn } from "../utils/axios";
import { getPointWithin, getSeriesWithin } from "../utils/data_fetch_utils";
import { RankingHistogram } from "./ranking_histogram";
import { RankingTable } from "./ranking_table";
import { LocationRankData, RankInfo } from "./ranking_types";

const GET_BOTTOM_PARAM = "bottom";
const RANK_SIZE = 100;
const MIN_POPULATION = 1000;

export interface RankingPagePropType {
  placeName: string;
  placeType: string;
  withinPlace: string;
  statVar: string;
  isPerCapita: boolean;
  scaling: number;
  unit: string;
  date: string;
}

interface RankingPageStateType {
  data: LocationRankData;
}

export class Page extends React.Component<
  RankingPagePropType,
  RankingPageStateType
> {
  svTitle: string;
  pluralPlaceType: string;
  isBottom: boolean;

  constructor(props: RankingPagePropType) {
    super(props);
    this.state = {
      data: undefined,
    };
    this.svTitle = getStatsVarTitle(props.statVar);
    this.pluralPlaceType = displayNameForPlaceType(
      this.props.placeType,
      true /* isPlural */
    );
    const params = new URLSearchParams(window.location.search);
    this.isBottom = params.get(GET_BOTTOM_PARAM) !== null;
    this.loadData = this.loadData.bind(this);
    this.fetchDataFromRankingCache = this.fetchDataFromRankingCache.bind(this);
  }

  subtitleMessages = defineMessages({
    all: {
      id: "ranking-subtitle_all",
      defaultMessage: "All {pluralPlaceType} in {placeName}",
      description:
        "Subtitle of the page, which shows ranking of all contained places of a type within a place, where {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
    },
    allPerCapita: {
      id: "ranking-subtitle_all_percapita",
      defaultMessage: "All {pluralPlaceType} in {placeName}, per capita",
      description:
        "Subtitle of the page, which shows ranking of all contained places of a type within a place, computed on a per capita basis, where {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
    },
    top: {
      id: "ranking-subtitle_top",
      defaultMessage: "Top {rankSize} {pluralPlaceType} in {placeName}",
      description:
        "Subtitle of the page, which shows ranking of the top / highest {rankSize} contained places of a type within a place, where {rankSize} will be replaced by a number, {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {rankSize}, {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
    },
    topPerCapita: {
      id: "ranking-subtitle_top_percapita",
      defaultMessage:
        "Top {rankSize} {pluralPlaceType} in {placeName}, per capita",
      description:
        "Subtitle of the page, which shows ranking of the top / highest {rankSize} contained places of a type within a place, computed on a per capita basis, where {rankSize} will be replaced by a number, {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {rankSize}, {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
    },
    bottom: {
      id: "ranking-subtitle_bottom",
      defaultMessage: "Bottom {rankSize} {pluralPlaceType} in {placeName}",
      description:
        "Subtitle of the page, which shows ranking of the bottom {rankSize} contained places of a type within a place, where {rankSize} will be replaced by a number, {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {rankSize}, {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
    },
    bottomPerCapita: {
      id: "ranking-subtitle_bottom_percapita",
      defaultMessage:
        "Bottom {rankSize} {pluralPlaceType} in {placeName}, per capita",
      description:
        "Subtitle of the page, which shows ranking of the bottom {rankSize} contained places of a type within a place, computed on a per capita basis, where {rankSize} will be replaced by a number, {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {rankSize}, {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
    },
    none: {
      id: "ranking-subtitle_none",
      defaultMessage: "{pluralPlaceType} in {placeName}",
      description:
        "Subtitle of the page, which shows ranking of contained places of a type within a place, where {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
    },
    nonePerCapita: {
      id: "ranking-subtitle_none_percapita",
      defaultMessage: "{pluralPlaceType} in {placeName}, per capita",
      description:
        "Subtitle of the page, which shows ranking of contained places of a type within a place, computed on a per capita basis, where {pluralPlaceType} will be replaced by the place type of the contained places (could be cities, countries, counties), and {placeName} is the containing place. Please maintain the {placeName} and {pluralPlaceType} as is in the final translation, and use a gender neutral structure that conveys the same meaning (e.g. dashes to separate).",
    },
  });

  private renderToggle(): JSX.Element {
    const svData = this.state.data;
    if (!_.isEmpty(svData.rankAll)) {
      return;
    }
    if (this.isBottom) {
      // show link to top 100
      const params = new URLSearchParams(window.location.search);
      params.delete(GET_BOTTOM_PARAM);
      const search = params.toString();
      const href = window.location.pathname + (search ? "?" + search : "");
      return (
        <LocalizedLink
          href={href}
          text={intl.formatMessage(
            {
              id: "ranking-sort_top",
              defaultMessage: "Show Highest {rankSize}",
              description:
                "Link used to show the highest {rankSize} items in the sorted ranking table, where {rankSize} is a number, e.g. 100. Please keep {rankSize} as is in the final translation.",
            },
            {
              rankSize: RANK_SIZE,
            }
          )}
        />
      );
    }
    // show link to bottom 100
    const search = window.location.search;
    const href =
      window.location.pathname +
      (search == "" ? "?" : search + "&") +
      GET_BOTTOM_PARAM;
    return (
      <LocalizedLink
        href={href}
        text={intl.formatMessage(
          {
            id: "ranking-sort_bottom",
            defaultMessage: "Show Lowest {rankSize}",
            description:
              "Link used to show the lowest {rankSize} items in the sorted ranking table, where {rankSize} is a number, e.g. 100. Please keep {rankSize} as is in the final translation.",
          },
          { rankSize: RANK_SIZE }
        )}
      />
    );
  }

  render(): JSX.Element {
    const statVar = this.props.statVar;
    const svData = this.state.data;

    let ranking;
    if (svData) {
      if (!_.isEmpty(svData.rankAll)) {
        ranking = svData.rankAll;
      } else if (this.isBottom) {
        ranking = svData.rankBottom1000;
      } else {
        ranking = svData.rankTop1000;
      }
    }

    let subtitleMessage;
    if (ranking) {
      if (svData.rankAll) {
        subtitleMessage = this.props.isPerCapita
          ? this.subtitleMessages.allPerCapita
          : this.subtitleMessages.all;
      } else if (svData.rankTop1000) {
        subtitleMessage = this.props.isPerCapita
          ? this.subtitleMessages.topPerCapita
          : this.subtitleMessages.top;
      } else {
        subtitleMessage = this.props.isPerCapita
          ? this.subtitleMessages.bottomPerCapita
          : this.subtitleMessages.bottom;
      }
    } else {
      subtitleMessage = this.props.isPerCapita
        ? this.subtitleMessages.nonePerCapita
        : this.subtitleMessages.none;
    }

    const subtitleArgs = {
      rankSize: RANK_SIZE,
      pluralPlaceType: this.pluralPlaceType,
      placeName: this.props.placeName,
    };

    let mainBlock: JSX.Element;
    if (svData === undefined) {
      mainBlock = (
        <div className="mt-4">
          {intl.formatMessage({
            id: "ranking-loading",
            defaultMessage: "Loading...",
            description: "Message shown while ranking data is still loading.",
          })}
        </div>
      );
    } else if (svData === null || (ranking && !ranking.info)) {
      mainBlock = (
        <div className="mt-4">
          {intl.formatMessage({
            id: "ranking-no_data",
            defaultMessage: "There is no ranking data available.",
            description:
              "Message to notify users that there is no ranking information available to show.",
          })}
        </div>
      );
    } else {
      mainBlock = (
        <>
          <RankingHistogram
            ranking={ranking}
            scaling={this.props.scaling}
            unit={this.props.unit}
          />
          <RankingTable
            ranking={ranking}
            isPerCapita={this.props.isPerCapita}
            placeType={this.props.placeType}
            scaling={this.props.scaling}
            sortAscending={!this.isBottom}
            statVar={this.props.statVar}
            unit={this.props.unit}
          />
        </>
      );
    }
    return (
      <div key={statVar}>
        <div className="btn-group btn-group-sm float-right" role="group"></div>
        <h1>
          {intl.formatMessage(
            {
              id: "ranking-page_title",
              defaultMessage: "Ranking by {statVar}",
              description:
                "Main title on a page showing the ranking of places measured by a statistical variable. The statistical variable is translated separately, and will be replaced in {statVar}.  Please leave the '{statVar}' as is in the resulting translation.",
            },
            {
              statVar: this.svTitle,
            }
          )}
        </h1>
        <h3>
          {intl.formatMessage(subtitleMessage, subtitleArgs)}
          {svData && this.renderToggle()}
        </h3>
        {mainBlock}
      </div>
    );
  }

  componentDidMount(): void {
    if (this.props.date) {
      this.loadData();
    } else {
      this.fetchDataFromRankingCache();
    }
  }

  private fetchDataFromRankingCache(): void {
    const url =
      `${getRoot()}/api/ranking/${this.props.statVar}/${this.props.placeType}/${
        this.props.withinPlace
      }` + window.location.search;
    axios
      .get(url)
      .then((resp) => {
        let respData = null;
        if (resp.data && this.props.statVar in resp.data) {
          respData = resp.data[this.props.statVar];
          const title = intl.formatMessage(
            {
              id: "ranking-document_title",
              defaultMessage:
                "Ranking by {statVar} - {pluralPlaceType} in {placeName}",
              description:
                "HTML document title for a page with rankings of places measured by a statistical variable, where {statVar} will be replaced with the statistical variable, {pluralPlaceType} with the pluralized type for the places in the ranking, e.g. Cities or States, and {placeName} is the containing place for the places in the ranking. Please keep the variables with curly brackets as is in the final translation.",
            },
            {
              statVar: this.svTitle,
              pluralPlaceType: this.pluralPlaceType,
              placeName: this.props.placeName,
            }
          );
          document.title = `${title} - ${document.title}`;
        }
        this.setState({
          data: respData,
        });
      })
      .catch(() => {
        // TODO(beets): Add better error handling messages
        this.setState({
          data: null,
        });
      });
  }

  private loadData(): void {
    const popPromise: Promise<SeriesApiResponse> = getSeriesWithin(
      getRoot(),
      this.props.withinPlace,
      this.props.placeType,
      [DEFAULT_POPULATION_DCID]
    );
    const statPromise: Promise<PointApiResponse> = getPointWithin(
      getRoot(),
      this.props.placeType,
      this.props.withinPlace,
      [this.props.statVar],
      this.props.date
    );
    const placeNamesPromise: Promise<Record<string, string>> = axios
      .get(`${getRoot()}/api/place/descendent/name`, {
        params: {
          dcid: this.props.withinPlace,
          descendentType: this.props.placeType,
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => resp.data);
    Promise.all([popPromise, statPromise, placeNamesPromise]).then(
      ([population, stat, placeNames]) => {
        let rankInfo: Array<RankInfo> = [];
        const statData = stat.data[this.props.statVar];
        // Get RankInfo without the actual rank for each place that there is
        // data for
        for (const place in statData) {
          if (_.isEmpty(statData[place])) {
            continue;
          }
          const placeStat = statData[place];
          let value = _.isUndefined(placeStat.value) ? 0 : placeStat.value;
          let popSeries: Series = null;
          if (DEFAULT_POPULATION_DCID in population.data) {
            if (place in population.data[DEFAULT_POPULATION_DCID]) {
              popSeries = population.data[DEFAULT_POPULATION_DCID][place];
            }
          }
          if (!_.isEmpty(popSeries)) {
            const popObs = getMatchingObservation(
              popSeries.series,
              placeStat.date
            );
            if (!popObs) {
              continue;
            }
            const popValue = popObs.value;
            if (popValue < MIN_POPULATION) {
              continue;
            }
            if (this.props.isPerCapita) {
              value /= popValue;
            }
          } else if (this.props.isPerCapita) {
            // empty pop series but is per capita
            console.log(
              `${place} excluded from ranking because of missing population data.`
            );
            continue;
          }
          rankInfo.push({
            placeDcid: place,
            placeName: placeNames[place] || place,
            rank: null,
            value,
          });
        }
        // Sort the RankInfo by their values and update each RankInfo with their
        // rank in the sorted list
        rankInfo.sort((a, b) => b.value - a.value);
        rankInfo = rankInfo.map((r, i) => {
          return { ...r, rank: i + 1 };
        });
        this.setState({
          data: {
            rankAll: rankInfo.length < RANK_SIZE ? { info: rankInfo } : null,
            rankBottom1000: { info: rankInfo.slice(-RANK_SIZE) },
            rankTop1000: { info: rankInfo.slice(0, RANK_SIZE) },
          },
        });
      }
    );
  }
}
