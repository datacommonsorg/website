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
import React, { useEffect, useState } from "react";

import { PointApiResponse } from "../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../shared/types";
import { getPlaceNames } from "../utils/place_utils";
import { Point, RankingUnit } from "./ranking_unit";
import { formatString, getStatVarName } from "./string_utils";
import { RankingMetadataConfig } from "./topic_config";

const RANKING_COUNT = 5;

interface RankingGroup {
  points: Point[];
  unit: string;
  scaling: number;
  numDataPoints?: number;
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
  rankingMetadata: RankingMetadataConfig;
}

export function RankingTile(props: RankingTilePropType): JSX.Element {
  const [rankingData, setRankingData] = useState<RankingData | undefined>(null);

  useEffect(() => {
    fetchData(props, setRankingData);
  }, [props]);

  return (
    <div className="chart-container ranking-tile">
      {rankingData &&
        Object.keys(rankingData).map((statVar) => {
          const points = rankingData[statVar].points;
          const unit = rankingData[statVar].unit;
          const scaling = rankingData[statVar].scaling;
          const svName = getStatVarName(statVar, props.statVarSpec);
          const numDataPoints = rankingData[statVar].numDataPoints;
          return (
            <React.Fragment key={statVar}>
              {props.rankingMetadata.showHighest && (
                <RankingUnit
                  key={`${statVar}-highest`}
                  unit={unit}
                  scaling={scaling}
                  title={formatString(
                    props.rankingMetadata.highestTitle
                      ? props.rankingMetadata.highestTitle
                      : "Highest ${statVar}",
                    {
                      date: "",
                      place: "",
                      statVar: svName,
                    }
                  )}
                  points={points.slice(-RANKING_COUNT).reverse()}
                  isHighest={true}
                />
              )}
              {props.rankingMetadata.showLowest && (
                <RankingUnit
                  key={`${statVar}-lowest`}
                  unit={unit}
                  scaling={scaling}
                  title={formatString(
                    props.rankingMetadata.lowestTitle
                      ? props.rankingMetadata.lowestTitle
                      : "Lowest ${statVar}",
                    {
                      date: "",
                      place: "",
                      statVar: svName,
                    }
                  )}
                  numDataPoints={numDataPoints}
                  points={points.slice(0, RANKING_COUNT)}
                  isHighest={false}
                />
              )}
            </React.Fragment>
          );
        })}
    </div>
  );
}

function fetchData(
  props: RankingTilePropType,
  setRankingData: (data: RankingData) => void
): void {
  const variables = [];
  for (const item of props.statVarSpec) {
    variables.push(item.statVar);
    if (item.denom) {
      variables.push(item.denom);
    }
  }
  axios
    .post<PointApiResponse>("/api/observations/point/within", {
      parent_entity: props.place.dcid,
      child_type: props.enclosedPlaceType,
      variables: variables,
    })
    .then((resp) => {
      const rankingData: RankingData = {};
      const statData = resp.data;
      // Get Ranking data
      for (const item of props.statVarSpec) {
        if (!(item.statVar in statData.data)) {
          continue;
        }
        let arr = [];
        for (const place in statData.data[item.statVar]) {
          const rankingPoint = {
            placeDcid: place,
            value: statData.data[item.statVar][place].value,
          };
          if (_.isUndefined(rankingPoint.value)) {
            console.log(`Skipping ${place}, missing ${item.statVar}`);
            continue;
          }
          if (item.denom) {
            if (item.denom in statData.data) {
              rankingPoint.value /= statData.data[item.denom][place].value;
            } else {
              console.log(`Skipping ${place}, missing ${item.denom}`);
              continue;
            }
          }
          arr.push(rankingPoint);
        }
        arr.sort((a, b) => {
          return a.stat - b.stat;
        });
        const numDataPoints = arr.length;
        if (arr.length > RANKING_COUNT * 2) {
          arr = arr.slice(0, RANKING_COUNT).concat(arr.slice(-RANKING_COUNT));
        }
        rankingData[item.statVar] = {
          points: arr,
          unit: item.unit,
          scaling: item.scaling,
          numDataPoints,
        };
      }
      return rankingData;
    })
    .then((rankingData) => {
      // Fetch place names.
      const places: Set<string> = new Set();
      for (const statVar in rankingData) {
        for (const item of rankingData[statVar].points) {
          places.add(item.placeDcid);
        }
      }
      getPlaceNames(Array.from(places)).then((placeNames) => {
        for (const statVar in rankingData) {
          for (const item of rankingData[statVar].points) {
            item.placeName = placeNames[item.placeDcid] || item.placeDcid;
          }
        }
        setRankingData(rankingData);
      });
    });
}
