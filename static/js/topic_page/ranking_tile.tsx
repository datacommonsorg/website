/**
 * Copyright 2021 Google LLC
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

import { GetStatSetResponse } from "../tools/shared_util";
import { StatVarMetadata } from "../types/stat_var";
import { RankingMetadata } from "./tile";

const RANKING_COUNT = 5;

interface Point {
  placeDcid: string;
  placeName?: string;
  stat: number;
}

interface RankingData {
  [key: string]: Point[];
}

interface RankingTilePropType {
  id: string;
  placeDcid: string;
  enclosedPlaceType: string;
  title: string;
  statVarMetadata: StatVarMetadata;
  rankingMetadata: RankingMetadata;
}

function renderRankingUnit(
  props: RankingTilePropType,
  statVar: string,
  points: Point[]
): JSX.Element {
  let highlightJsx: JSX.Element = <></>;
  let lowlightJsx: JSX.Element = <></>;
  if (props.rankingMetadata.showHighest) {
    highlightJsx = (
      <div>
        <h3>{statVar}</h3>
        <ul>
          {points.slice(-5).map((point) => {
            return (
              <li key={point.placeDcid}>
                {point.placeName}
                {"  "}
                {point.stat}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  if (props.rankingMetadata.showLowest) {
    lowlightJsx = (
      <div>
        <h3>{statVar}</h3>
        <ul>
          {points.slice(0, 5).map((point) => {
            return (
              <li key={point.placeDcid}>
                {point.placeName}
                {"  "}
                {point.stat}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return (
    <div>
      {highlightJsx}
      {lowlightJsx}
    </div>
  );
}

export function RankingTile(props: RankingTilePropType): JSX.Element {
  const [rankingData, setRankingData] = useState<RankingData | undefined>(null);

  useEffect(() => {
    fetchData(props, setRankingData);
  }, [props]);

  return (
    <div className="chart-container">
      {rankingData &&
        Object.keys(rankingData).map((statVar) => {
          return (
            <div key={statVar}>
              {renderRankingUnit(props, statVar, rankingData[statVar])}
            </div>
          );
        })}
    </div>
  );
}

function fetchData(
  props: RankingTilePropType,
  setRankingData: (data: RankingData) => void
): void {
  let url = `/api/stats/within-place?parent_place=${props.placeDcid}&child_type=${props.enclosedPlaceType}`;
  for (const item of props.statVarMetadata.statVars) {
    url += `&stat_vars=${item.main}`;
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
      for (const item of props.statVarMetadata.statVars) {
        if (!(item.main in statData)) {
          continue;
        }
        let arr = [];
        for (const place in statData[item.main].stat) {
          const rankingPoint = {
            placeDcid: place,
            stat: statData[item.main].stat[place].value,
          };
          if (item.denom && item.denom in statData) {
            rankingPoint.stat /= statData[item.denom].stat[place].value;
          }
          arr.push(rankingPoint);
        }
        arr.sort((a, b) => {
          return a.stat - b.stat;
        });
        if (arr.length > RANKING_COUNT * 2) {
          arr = arr.slice(0, 5).concat(arr.slice(-5));
        }
        rankingData[item.main] = arr;
      }
      return rankingData;
    })
    .then((rankingData) => {
      // Fetch place names.
      const places = new Set();
      for (const statVar in rankingData) {
        for (const item of rankingData[statVar]) {
          places.add(item.placeDcid);
        }
      }
      const placeParam = Array.from(places)
        .map((x) => "dcid=" + x)
        .join("&");
      axios.get(`/api/place/name?${placeParam}`).then((resp) => {
        const placeNames = resp.data;
        for (const statVar in rankingData) {
          for (const item of rankingData[statVar]) {
            item.placeName = placeNames[item.placeDcid] || item.placeDcid;
          }
        }
        setRankingData(rankingData);
      });
    });
}
