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

import { INITAL_LOADING_CLASS } from "../../constants/tile_constants";
import { ChartEmbed } from "../../place/chart_embed";
import { USA_NAMED_TYPED_PLACE } from "../../shared/constants";
import { PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { RankingPoint } from "../../types/ranking_unit_types";
import { RankingTileSpec } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { rankingPointsToCsv } from "../../utils/chart_csv_utils";
import { getPlaceDisplayNames, getPlaceNames } from "../../utils/place_utils";
import { formatNumber, getDateRange } from "../../utils/string_utils";
import {
  formatString,
  getStatVarName,
  getUnitString,
} from "../../utils/tile_utils";
import { RankingUnit } from "../ranking_unit";
import { ChartFooter } from "./chart_footer";

const RANKING_COUNT = 5;
const HEADING_HEIGHT = 36;
const PER_RANKING_HEIGHT = 24;
const FOOTER_HEIGHT = 26;
interface RankingGroup {
  points: RankingPoint[];
  // If only value is used in RankingPoint - then there will only be one unit &
  // scaling set. Otherwise, will match the order of values[].
  unit: string[];
  scaling: number[];
  sources: Set<string>;
  numDataPoints?: number;
  dateRange: string;
}

interface RankingData {
  [key: string]: RankingGroup; // Key is main statVarDcid.
}
interface RankingTilePropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title: string;
  statVarSpec: StatVarSpec[];
  rankingMetadata: RankingTileSpec;
  className?: string;
}

export function RankingTile(props: RankingTilePropType): JSX.Element {
  const [rankingData, setRankingData] = useState<RankingData | undefined>(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  const chartContainer = useRef(null);

  useEffect(() => {
    fetchData(props, setRankingData);
  }, [props]);

  const numRankingLists = getNumRankingLists(
    props.rankingMetadata,
    rankingData,
    props.statVarSpec
  );
  const rankingCount = props.rankingMetadata.rankingCount || RANKING_COUNT;
  const isMultiColumn = props.rankingMetadata.showMultiColumn;
  const svNames = props.statVarSpec.map((sv) => sv.name);
  // TODO: have a better way of calculating the loading placeholder height
  const placeHolderHeight =
    PER_RANKING_HEIGHT * rankingCount + FOOTER_HEIGHT + HEADING_HEIGHT;
  const placeHolderArray = Array(numRankingLists).fill("");
  return (
    <div
      className={`chart-container ranking-tile ${props.className}`}
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
          const points = rankingData[statVar].points;
          const unit = rankingData[statVar].unit;
          const scaling = rankingData[statVar].scaling;
          const svName = getStatVarName(statVar, props.statVarSpec);
          const numDataPoints = rankingData[statVar].numDataPoints;
          const sources = rankingData[statVar].sources;
          const dateRange = rankingData[statVar].dateRange;
          return (
            <React.Fragment key={statVar}>
              {props.rankingMetadata.showHighest && (
                <div className="ranking-unit-container">
                  <RankingUnit
                    key={`${statVar}-highest`}
                    unit={unit}
                    scaling={scaling}
                    title={formatString(
                      props.title ||
                        (props.rankingMetadata.highestTitle
                          ? props.rankingMetadata.highestTitle
                          : "Highest ${statVar}"),
                      {
                        date: dateRange,
                        placeName: "",
                        statVar: svName,
                      }
                    )}
                    points={points.slice(-rankingCount).reverse()}
                    isHighest={true}
                    svNames={isMultiColumn ? svNames : undefined}
                    formatNumberFn={formatNumber}
                  />
                  <ChartFooter
                    sources={sources}
                    handleEmbed={() => handleEmbed(points.reverse())}
                  />
                </div>
              )}
              {props.rankingMetadata.showLowest && (
                <div>
                  <RankingUnit
                    key={`${statVar}-lowest`}
                    unit={unit}
                    scaling={scaling}
                    title={formatString(
                      props.title ||
                        (props.rankingMetadata.lowestTitle
                          ? props.rankingMetadata.lowestTitle
                          : "Lowest ${statVar}"),
                      {
                        date: dateRange,
                        placeName: "",
                        statVar: svName,
                      }
                    )}
                    numDataPoints={numDataPoints}
                    points={points.slice(0, rankingCount)}
                    isHighest={false}
                    svNames={isMultiColumn ? svNames : undefined}
                    formatNumberFn={formatNumber}
                  />
                  <ChartFooter
                    sources={sources}
                    handleEmbed={() => handleEmbed(points)}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      <ChartEmbed ref={embedModalElement} />
    </div>
  );

  function handleEmbed(rankingPoints: RankingPoint[]): void {
    embedModalElement.current.show(
      "",
      rankingPointsToCsv(rankingPoints),
      chartContainer.current.offsetWidth,
      0,
      "",
      "",
      []
    );
  }
}
function fetchData(
  props: RankingTilePropType,
  setRankingData: (data: RankingData) => void
): void {
  const variables = [];
  for (const spec of props.statVarSpec) {
    variables.push(spec.statVar);
    if (spec.denom) {
      variables.push(spec.denom);
    }
  }
  axios
    .get<PointApiResponse>("/api/observations/point/within", {
      params: {
        parent_entity: props.place.dcid,
        child_type: props.enclosedPlaceType,
        variables: variables,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      const rankingData = pointApiToPerSvRankingData(
        resp.data,
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
      const placeNamesPromise = _.isEqual(props.place, USA_NAMED_TYPED_PLACE)
        ? getPlaceDisplayNames(Array.from(places))
        : getPlaceNames(Array.from(places));
      placeNamesPromise.then((placeNames) => {
        for (const statVar in rankingData) {
          for (const point of rankingData[statVar].points) {
            point.placeName = placeNames[point.placeDcid] || point.placeDcid;
          }
        }
        setRankingData(rankingData);
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
        const statPointUnit = statData.facets[statPoint.facet].unit;
        if (statPointSource) {
          sources.add(statPointSource);
          svUnit = svUnit || statPointUnit;
        }
      }
    }
    arr.sort((a, b) => {
      return a.value - b.value;
    });
    const numDataPoints = arr.length;
    svUnit = getUnitString(svUnit, spec.denom);
    rankingData[spec.statVar] = {
      points: arr,
      unit: [spec.unit || svUnit],
      scaling: [spec.scaling],
      numDataPoints,
      sources,
      dateRange: getDateRange(Array.from(dates)),
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
