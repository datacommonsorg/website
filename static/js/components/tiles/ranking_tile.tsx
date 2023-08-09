/**
 * Copyright 2022 Google LLC
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

/**
 * Component for rendering a ranking tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import { INITAL_LOADING_CLASS } from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import { USA_NAMED_TYPED_PLACE } from "../../shared/constants";
import { PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import {
  getCappedStatVarDate,
  loadSpinner,
  removeSpinner,
} from "../../shared/util";
import {
  RankingData,
  RankingGroup,
  RankingPoint,
} from "../../types/ranking_unit_types";
import { RankingTileSpec } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { rankingPointsToCsv } from "../../utils/chart_csv_utils";
import { getPlaceDisplayNames, getPlaceNames } from "../../utils/place_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import { getDateRange } from "../../utils/string_utils";
import { getStatVarName } from "../../utils/tile_utils";
import { NlChartFeedback } from "../nl_feedback";
import { SvRankingUnits } from "./sv_ranking_units";

const RANKING_COUNT = 5;
const HEADING_HEIGHT = 36;
const PER_RANKING_HEIGHT = 24;
const FOOTER_HEIGHT = 26;
const LATEST_DATE_KEY = "latest";

export interface RankingTilePropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title: string;
  statVarSpec: StatVarSpec[];
  rankingMetadata: RankingTileSpec;
  className?: string;
  apiRoot?: string;
  showExploreMore?: boolean;
  hideFooter?: boolean;
  onHoverToggled?: (placeDcid: string, hover: boolean) => void;
  date?: string;
  showLoadingSpinner?: boolean;
}

// TODO: Use ChartTileContainer like other tiles.
export function RankingTile(props: RankingTilePropType): JSX.Element {
  const [rankingData, setRankingData] = useState<RankingData | undefined>(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  const chartContainer = useRef(null);

  useEffect(() => {
    loadSpinner(getSpinnerId());
    fetchData(props).then((rankingData) => {
      setRankingData(rankingData);
      removeSpinner(getSpinnerId());
    });
  }, [props]);

  const numRankingLists = getNumRankingLists(
    props.rankingMetadata,
    rankingData,
    props.statVarSpec
  );
  const rankingCount = props.rankingMetadata.rankingCount || RANKING_COUNT;
  // TODO: have a better way of calculating the loading placeholder height
  const placeHolderHeight =
    PER_RANKING_HEIGHT * rankingCount + FOOTER_HEIGHT + HEADING_HEIGHT;
  const placeHolderArray = Array(numRankingLists).fill("");

  /**
   * Opens export modal window
   */
  function showChartEmbed(
    chartWidth: number,
    chartHeight: number,
    chartHtml: string,
    rankingPoints: RankingPoint[],
    sources: string[],
    svNames: string[]
  ): void {
    embedModalElement.current.show(
      "",
      rankingPointsToCsv(rankingPoints, svNames),
      chartWidth,
      chartHeight,
      chartHtml,
      "",
      "",
      Array.from(sources)
    );
  }

  return (
    <div
      className={`chart-container ${ASYNC_ELEMENT_HOLDER_CLASS} ranking-tile ${props.className}`}
      ref={chartContainer}
      style={{
        gridTemplateColumns:
          numRankingLists > 1 ? "repeat(2, 1fr)" : "repeat(1, 1fr)",
      }}
    >
      {!rankingData &&
        placeHolderArray.map((_, i) => {
          return (
            <div
              key={`ranking-placeholder-${i}`}
              className={INITAL_LOADING_CLASS}
              style={{ minHeight: placeHolderHeight }}
            ></div>
          );
        })}
      {rankingData &&
        Object.keys(rankingData).map((statVar) => {
          return (
            <SvRankingUnits
              key={statVar}
              rankingData={rankingData}
              rankingMetadata={props.rankingMetadata}
              showChartEmbed={showChartEmbed}
              statVar={statVar}
              title={props.title}
              showExploreMore={props.showExploreMore}
              apiRoot={props.apiRoot}
              hideFooter={props.hideFooter}
              onHoverToggled={props.onHoverToggled}
            />
          );
        })}
      <NlChartFeedback id={props.id} />
      <ChartEmbed ref={embedModalElement} />
      {props.showLoadingSpinner && (
        <div id={getSpinnerId()} className="scatter-spinner">
          <div className="screen">
            <div id="spinner"></div>
          </div>
        </div>
      )}
    </div>
  );

  function getSpinnerId(): string {
    return `ranking-spinner-${props.id}`;
  }
}

export async function fetchData(
  props: RankingTilePropType
): Promise<RankingData> {
  // Get map of date to variables that should use this date for its data fetch
  const dateToVariable = { [LATEST_DATE_KEY]: [] };
  for (const spec of props.statVarSpec) {
    for (const sv of [spec.statVar, spec.denom]) {
      if (!sv) {
        continue;
      }
      const variableDate =
        props.date || getCappedStatVarDate(sv) || LATEST_DATE_KEY;
      if (!dateToVariable[variableDate]) {
        dateToVariable[variableDate] = [];
      }
      dateToVariable[variableDate].push(sv);
    }
  }
  // Make one promise for each date
  const statPromises: Promise<PointApiResponse>[] = [];
  for (const date of Object.keys(dateToVariable)) {
    if (_.isEmpty(dateToVariable[date])) {
      continue;
    }
    const params = {
      parentEntity: props.place.dcid,
      childType: props.enclosedPlaceType,
      variables: dateToVariable[date],
    };
    if (date !== LATEST_DATE_KEY) {
      params["date"] = date;
    }
    statPromises.push(
      axios
        .get<PointApiResponse>(
          `${props.apiRoot || ""}/api/observations/point/within`,
          {
            params,
            paramsSerializer: stringifyFn,
          }
        )
        .then((resp) => resp.data)
    );
  }
  return Promise.all(statPromises)
    .then((statResponses) => {
      // Merge the responses of all stat promises and get the ranking data from
      // the merged response
      const mergedResponse = { data: {}, facets: {} };
      statResponses.forEach((resp) => {
        mergedResponse.data = Object.assign(mergedResponse.data, resp.data);
        mergedResponse.facets = Object.assign(
          mergedResponse.facets,
          resp.facets
        );
      });
      const rankingData = pointApiToPerSvRankingData(
        mergedResponse,
        props.statVarSpec
      );
      if (props.rankingMetadata.showMultiColumn) {
        return transformRankingDataForMultiColumn(
          rankingData,
          props.statVarSpec
        );
      }
      return rankingData;
    })
    .then((rankingData) => {
      // Fetch place names.
      const places: Set<string> = new Set();
      for (const statVar in rankingData) {
        for (const point of rankingData[statVar].points) {
          places.add(point.placeDcid);
        }
      }
      // We want the display name (gets name with state code if available) if
      // parent place is USA
      const placeNamesPromise = _.isEqual(
        props.place.dcid,
        USA_NAMED_TYPED_PLACE.dcid
      )
        ? getPlaceDisplayNames(Array.from(places), props.apiRoot)
        : getPlaceNames(Array.from(places), props.apiRoot);
      return placeNamesPromise.then((placeNames) => {
        for (const statVar in rankingData) {
          for (const point of rankingData[statVar].points) {
            point.placeName = placeNames[point.placeDcid] || point.placeDcid;
          }
        }
        return rankingData;
      });
    });
}

// Reduces RankingData to only the SV used for sorting, to be compatible for multi-column rendering in RankingUnit.
function transformRankingDataForMultiColumn(
  rankingData: RankingData,
  statVarSpecs: StatVarSpec[]
): RankingData {
  const svs = statVarSpecs.map((spec) => spec.statVar);
  const sortSv = svs[svs.length - 1];
  const sortedPlacePoints = rankingData[sortSv].points;
  const svsToDict = svs.map((sv) => {
    const placeToVal = {};
    const points = rankingData[sv].points;
    for (const p of points) {
      placeToVal[p.placeDcid] = p.value;
    }
    return placeToVal;
  });
  for (const p of sortedPlacePoints) {
    p.value = undefined;
    p.values = svs.map((_, i) => svsToDict[i][p.placeDcid]);
  }
  rankingData[sortSv].unit = statVarSpecs.map((spec) => spec.unit);
  rankingData[sortSv].scaling = statVarSpecs.map((spec) => spec.scaling);
  rankingData[sortSv].svName = statVarSpecs.map((spec) =>
    getStatVarName(spec.statVar, [spec])
  );
  return { [sortSv]: rankingData[sortSv] };
}

function pointApiToPerSvRankingData(
  statData: PointApiResponse,
  statVarSpecs: StatVarSpec[]
): RankingData {
  const rankingData: RankingData = {};
  // Get Ranking data
  for (const spec of statVarSpecs) {
    if (!(spec.statVar in statData.data)) {
      continue;
    }
    const arr = [];
    // Note: this returns sources and dates for all places, even those which
    // might not display.
    const sources = new Set<string>();
    const dates = new Set<string>();
    let svUnit = "";
    for (const place in statData.data[spec.statVar]) {
      const statPoint = statData.data[spec.statVar][place];
      const rankingPoint = {
        placeDcid: place,
        value: statPoint.value,
      };
      if (_.isUndefined(rankingPoint.value)) {
        console.log(`Skipping ${place}, missing ${spec.statVar}`);
        continue;
      }
      if (spec.denom) {
        if (
          spec.denom in statData.data &&
          place in statData.data[spec.denom] &&
          statData.data[spec.denom][place].value != 0
        ) {
          const denomPoint = statData.data[spec.denom][place];
          rankingPoint.value /= denomPoint.value;
          if (denomPoint.facet && statData.facets[denomPoint.facet]) {
            const denomSource = statData.facets[denomPoint.facet].provenanceUrl;
            if (denomSource) {
              sources.add(denomSource);
            }
          }
        } else {
          console.log(`Skipping ${place}, missing ${spec.denom}`);
          continue;
        }
      }
      arr.push(rankingPoint);
      dates.add(statPoint.date);
      if (statPoint.facet && statData.facets[statPoint.facet]) {
        const statPointSource = statData.facets[statPoint.facet].provenanceUrl;
        svUnit = svUnit || getUnit(statData.facets[statPoint.facet]);
        if (statPointSource) {
          sources.add(statPointSource);
        }
      }
    }
    arr.sort((a, b) => {
      return a.value - b.value;
    });
    const numDataPoints = arr.length;
    rankingData[spec.statVar] = {
      points: arr,
      unit: [spec.unit || svUnit],
      scaling: [spec.scaling],
      numDataPoints,
      sources,
      dateRange: getDateRange(Array.from(dates)),
      svName: [getStatVarName(spec.statVar, [spec])],
    };
  }
  return rankingData;
}

/**
 * Gets the number of ranking lists that will be shown
 * @param rankingTileSpec ranking tile specifications
 * @param rankingData ranking data to be shown
 */
function getNumRankingLists(
  rankingTileSpec: RankingTileSpec,
  rankingData: { [sv: string]: RankingGroup },
  statVarSpec: StatVarSpec[]
): number {
  if (rankingTileSpec.showMultiColumn) {
    return [rankingTileSpec.showHighest, rankingTileSpec.showLowest].filter(
      Boolean
    ).length;
  }
  let numListsPerSv = 0;
  if (rankingTileSpec.showHighest) {
    numListsPerSv++;
  }
  if (rankingTileSpec.showLowest) {
    numListsPerSv++;
  }
  if (!rankingData) {
    return statVarSpec.length * numListsPerSv;
  }
  return Object.keys(rankingData).length * numListsPerSv;
}
