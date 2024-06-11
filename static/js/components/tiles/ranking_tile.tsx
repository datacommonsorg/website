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

import { DataCommonsClient } from "@datacommonsorg/client";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { ASYNC_ELEMENT_HOLDER_CLASS } from "../../constants/css_constants";
import {
  CSV_FIELD_DELIMITER,
  INITIAL_LOADING_CLASS,
} from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import { useLazyLoad } from "../../shared/hooks";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import { StatVarSpec } from "../../shared/types";
import { getCappedStatVarDate } from "../../shared/util";
import {
  RankingData,
  RankingGroup,
  RankingPoint,
} from "../../types/ranking_unit_types";
import { RankingTileSpec } from "../../types/subject_page_proto_types";
import { getPointWithin, getSeriesWithin } from "../../utils/data_fetch_utils";
import { getDateRange } from "../../utils/string_utils";
import {
  getDenomInfo,
  getFirstCappedStatVarSpecDate,
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarName,
  transformCsvHeader,
} from "../../utils/tile_utils";
import { LoadingHeader } from "./loading_header";
import { SvRankingUnits } from "./sv_ranking_units";
import { ContainedInPlaceMultiVariableTileProp } from "./tile_types";

const RANKING_COUNT = 5;
const HEADING_HEIGHT = 36;
const PER_RANKING_HEIGHT = 24;
const FOOTER_HEIGHT = 26;
const LATEST_DATE_KEY = "latest";
const EMPTY_FACET_ID_KEY = "empty";

export interface RankingTilePropType
  extends ContainedInPlaceMultiVariableTileProp {
  hideFooter?: boolean;
  onHoverToggled?: (placeDcid: string, hover: boolean) => void;
  rankingMetadata: RankingTileSpec;
  footnote?: string;
  // Optional: Override sources for this tile
  sources?: string[];
  // Optional: only load this component when it's near the viewport
  lazyLoad?: boolean;
  /**
   * Optional: If lazy loading is enabled, load the component when it is within
   * this margin of the viewport. Default: "0px"
   */
  lazyLoadMargin?: string;
}

// TODO: Use ChartTileContainer like other tiles.
export function RankingTile(props: RankingTilePropType): JSX.Element {
  const [rankingData, setRankingData] = useState<RankingData | undefined>(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { shouldLoad, containerRef } = useLazyLoad(props.lazyLoadMargin);
  useEffect(() => {
    if (props.lazyLoad && !shouldLoad) {
      return;
    }
    (async () => {
      try {
        const rankingData = await fetchData(props);
        setRankingData(rankingData);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [props, shouldLoad]);

  const numRankingLists = getNumRankingLists(
    props.rankingMetadata,
    rankingData,
    props.variables
  );
  const rankingCount = props.rankingMetadata.rankingCount || RANKING_COUNT;
  // TODO: have a better way of calculating the loading placeholder height
  const placeHolderHeight =
    PER_RANKING_HEIGHT * rankingCount + FOOTER_HEIGHT + HEADING_HEIGHT;
  const placeHolderArray = Array(numRankingLists).fill("");
  const dataCommonsClient = new DataCommonsClient({ apiRoot: props.apiRoot });

  /**
   * Opens export modal window
   */
  function showChartEmbed(
    chartWidth: number,
    chartHeight: number,
    chartHtml: string,
    chartTitle: string,
    sources: string[]
  ): void {
    embedModalElement.current.show(
      "",
      () => {
        // Assume all variables will have the same date
        // TODO: Update getCsv to handle multiple dates
        const date = getFirstCappedStatVarSpecDate(props.variables);
        const perCapitaVariables = props.variables
          .filter((v) => v.denom)
          .map((v) => v.statVar);
        return dataCommonsClient.getCsv({
          childType: props.enclosedPlaceType,
          date,
          fieldDelimiter: CSV_FIELD_DELIMITER,
          parentEntity: props.parentPlace,
          perCapitaVariables,
          transformHeader: transformCsvHeader,
          variables: props.variables.map((v) => v.statVar),
        });
      },
      chartWidth,
      chartHeight,
      chartHtml,
      chartTitle,
      "",
      props.sources || Array.from(sources)
    );
  }
  return (
    <div
      className={`chart-container ${ASYNC_ELEMENT_HOLDER_CLASS} ranking-tile ${
        props.className
      } ${isLoading ? `loading ${INITIAL_LOADING_CLASS}` : ""}`}
      ref={containerRef}
      style={{
        gridTemplateColumns:
          numRankingLists > 1 ? "repeat(2, 1fr)" : "repeat(1, 1fr)",
      }}
    >
      {!rankingData &&
        placeHolderArray.map((_, i) => {
          return (
            <div className="loading" key={`ranking-placeholder-${i}`}>
              <div className="chart-headers">
                <LoadingHeader isLoading={true} />
              </div>
              <div style={{ minHeight: placeHolderHeight }}></div>
            </div>
          );
        })}
      {rankingData &&
        Object.keys(rankingData).map((statVar) => {
          const errorMsg =
            _.isEmpty(rankingData[statVar]) ||
            rankingData[statVar].numDataPoints === 0
              ? getNoDataErrorMsg(props.variables)
              : "";
          return (
            <SvRankingUnits
              apiRoot={props.apiRoot}
              containerRef={containerRef}
              entityType={props.enclosedPlaceType}
              errorMsg={errorMsg}
              footnote={props.footnote}
              hideFooter={props.hideFooter}
              isLoading={isLoading}
              key={statVar}
              onHoverToggled={props.onHoverToggled}
              rankingData={rankingData}
              rankingMetadata={props.rankingMetadata}
              showChartEmbed={showChartEmbed}
              showExploreMore={props.showExploreMore}
              sources={props.sources}
              statVar={statVar}
              tileId={props.id}
              title={props.title}
              statVarSpecs={props.variables}
            />
          );
        })}
      <ChartEmbed container={containerRef.current} ref={embedModalElement} />
    </div>
  );
}

export async function fetchData(
  props: RankingTilePropType
): Promise<RankingData> {
  // Get map of date to map of facet id to variables that should use this date
  // and facet id for its data fetch
  const dateFacetToVariable = {
    [LATEST_DATE_KEY]: {
      [EMPTY_FACET_ID_KEY]: [],
    },
  };
  for (const spec of props.variables) {
    const variableDate = getCappedStatVarDate(spec.statVar, spec.date);
    const variableFacetId = spec.facetId || EMPTY_FACET_ID_KEY;
    if (!dateFacetToVariable[variableDate]) {
      dateFacetToVariable[variableDate] = {};
    }
    if (!dateFacetToVariable[variableDate][variableFacetId]) {
      dateFacetToVariable[variableDate][variableFacetId] = [];
    }
    dateFacetToVariable[variableDate][variableFacetId].push(spec.statVar);
  }
  // Make one promise for each date
  const statPromises: Promise<PointApiResponse>[] = [];
  for (const date of Object.keys(dateFacetToVariable)) {
    if (_.isEmpty(dateFacetToVariable[date])) {
      continue;
    }
    for (const facetId of Object.keys(dateFacetToVariable[date])) {
      if (_.isEmpty(dateFacetToVariable[date][facetId])) {
        continue;
      }
      let dateParam = "";
      if (date !== LATEST_DATE_KEY) {
        dateParam = date;
      }
      let facetIds = [];
      if (facetId !== EMPTY_FACET_ID_KEY) {
        facetIds = [facetId];
      }
      statPromises.push(
        getPointWithin(
          props.apiRoot,
          props.enclosedPlaceType,
          props.parentPlace,
          dateFacetToVariable[date][facetId],
          dateParam,
          [],
          facetIds
        )
      );
    }
  }
  const statPromise = Promise.all(statPromises).then((statResponses) => {
    // Merge the responses of all stat promises
    const mergedResponse = { data: {}, facets: {} };
    statResponses.forEach((resp) => {
      mergedResponse.data = Object.assign(mergedResponse.data, resp.data);
      mergedResponse.facets = Object.assign(mergedResponse.facets, resp.facets);
    });
    return mergedResponse;
  });
  const denoms = props.variables.map((spec) => spec.denom).filter((sv) => !!sv);
  const denomPromise = _.isEmpty(denoms)
    ? Promise.resolve(null)
    : getSeriesWithin(
        props.apiRoot,
        props.parentPlace,
        props.enclosedPlaceType,
        denoms
      );
  return Promise.all([statPromise, denomPromise]).then(
    ([statResp, denomResp]) => {
      const rankingData = pointApiToPerSvRankingData(
        statResp,
        denomResp,
        props.variables
      );
      if (props.rankingMetadata.showMultiColumn) {
        return transformRankingDataForMultiColumn(rankingData, props.variables);
      }
      return rankingData;
    }
  );
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
  denomData: SeriesApiResponse,
  statVarSpecs: StatVarSpec[]
): RankingData {
  const rankingData: RankingData = {};
  // Get Ranking data
  for (const spec of statVarSpecs) {
    if (!(spec.statVar in statData.data)) {
      continue;
    }
    const rankingPoints: RankingPoint[] = [];
    // Note: this returns sources and dates for all places, even those which
    // might not display.
    const sources = new Set<string>();
    const dates = new Set<string>();
    const { unit, scaling } = getStatFormat(spec, statData);
    for (const place in statData.data[spec.statVar]) {
      const statPoint = statData.data[spec.statVar][place];
      const rankingPoint = {
        date: statPoint.date,
        placeDcid: place,
        value: statPoint.value,
      };
      if (_.isUndefined(rankingPoint.value)) {
        console.log(`Skipping ${place}, missing ${spec.statVar}`);
        continue;
      }
      if (spec.denom) {
        const denomInfo = getDenomInfo(spec, denomData, place, statPoint.date);
        if (!denomInfo) {
          console.log(`Skipping ${place}, missing ${spec.denom}`);
          continue;
        }
        rankingPoint.value /= denomInfo.value;
        sources.add(denomInfo.source);
      }
      rankingPoints.push(rankingPoint);
      dates.add(statPoint.date);
      if (statPoint.facet && statData.facets[statPoint.facet]) {
        const statPointSource = statData.facets[statPoint.facet].provenanceUrl;
        if (statPointSource) {
          sources.add(statPointSource);
        }
      }
    }
    rankingPoints.sort((a, b) => {
      return a.value - b.value;
    });
    const numDataPoints = rankingPoints.length;
    rankingData[spec.statVar] = {
      points: rankingPoints,
      unit: [unit],
      scaling: [scaling],
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
  statVarSpecs: StatVarSpec[]
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
  // if showHighestLowest is set, will show a single list and ignore
  // showHighest/showLowest.
  if (rankingTileSpec.showHighestLowest) {
    numListsPerSv = 1;
  }
  if (!rankingData) {
    return statVarSpecs.length * numListsPerSv;
  }
  return Object.keys(rankingData).length * numListsPerSv;
}
