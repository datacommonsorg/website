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
import React, { useEffect, useState } from "react";

import { GetStatSetResponse } from "../shared/stat_types";
import { NamedTypedPlace } from "../shared/types";
import { StatVarMetadata } from "../types/stat_var";
import { getPlaceNames } from "../utils/place_utils";
import { Point, RankingUnit } from "./ranking_unit";
import { getStatVarName } from "./string_utils";
import { RankingMetadataConfig } from "./topic_config";

const RANKING_COUNT = 5;

interface RankingGroup {
  points: Point[];
  unit: string;
  scaling: number;
}

interface RankingData {
  [key: string]: RankingGroup; // Key is main statVarDcid.
}
interface RankingTilePropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title: string;
  statVarMetadata: StatVarMetadata[];
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
          const svName = getStatVarName(statVar, props.statVarMetadata);
          return (
            <React.Fragment key={statVar}>
              {props.rankingMetadata.showHighest && (
                <RankingUnit
                  key={`${statVar}-highest`}
                  statVarName={svName}
                  unit={unit}
                  scaling={scaling}
                  title={
                    props.rankingMetadata.highestTitle
                      ? props.rankingMetadata.highestTitle
                      : "Highest ${statVar}"
                  }
                  points={points.slice(-RANKING_COUNT).reverse()}
                />
              )}
              {props.rankingMetadata.showLowest && (
                <RankingUnit
                  key={`${statVar}-lowest`}
                  statVarName={svName}
                  unit={unit}
                  scaling={scaling}
                  title={
                    props.rankingMetadata.lowestTitle
                      ? props.rankingMetadata.lowestTitle
                      : "Lowest ${statVar}"
                  }
                  points={points.slice(0, RANKING_COUNT)}
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
  let url = `/api/stats/within-place?parent_place=${props.place.dcid}&child_type=${props.enclosedPlaceType}`;
  for (const item of props.statVarMetadata) {
    url += `&stat_vars=${item.statVar}`;
    if (item.denom) {
      url += `&stat_vars=${item.denom}`;
    }
  }
  axios
    .get<GetStatSetResponse>(url)
    .then((resp) => {
      const rankingData: RankingData = {};
      const statData = resp.data.data;
      // Get Ranking data
      for (const item of props.statVarMetadata) {
        if (!(item.statVar in statData)) {
          continue;
        }
        let arr = [];
        for (const place in statData[item.statVar].stat) {
          const rankingPoint = {
            placeDcid: place,
            stat: statData[item.statVar].stat[place].value,
          };
          if (rankingPoint.stat === undefined) {
            console.log(`Skipping ${place}, missing ${item.statVar}`);
            continue;
          }
          if (item.denom) {
            if (item.denom in statData) {
              rankingPoint.stat /= statData[item.denom].stat[place].value;
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
        if (arr.length > RANKING_COUNT * 2) {
          arr = arr.slice(0, RANKING_COUNT).concat(arr.slice(-RANKING_COUNT));
        }
        rankingData[item.statVar] = {
          points: arr,
          unit: item.unit,
          scaling: item.scaling,
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
