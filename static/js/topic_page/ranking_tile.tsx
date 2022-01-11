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

import React, { useEffect, useState } from "react";

import { StatVarMetadata } from "../types/stat_var";

interface RankingTilePropType {
  id: string;
  title: string;
  statVarMetadata: StatVarMetadata;
}

export function RankingTile(props: RankingTilePropType): JSX.Element {
  // TODO: define and use the actual type instead of any
  const [rawData, setRawData] = useState<any | undefined>(null);
  const [rankingData, setRankingData] = useState<any | undefined>(null);

  useEffect(() => {
    fetchData(props.statVarMetadata, setRawData);
  }, [props.statVarMetadata]);

  useEffect(() => {
    if (rawData) {
      processData(rawData, setRankingData);
    }
  }, [rawData]);

  return (
    <div className="chart-container">
      {rankingData && <>{Object.keys(rankingData).join(",")}</>}
    </div>
  );
}

function fetchData(
  statVarMetaData: StatVarMetadata,
  setRawData: (data: any) => void
): void {
  console.log(statVarMetaData);
  setRawData(null);
}

function processData(rawData: any, setRankingData: (data: any) => void): void {
  setRankingData(rawToRanking(rawData));
}

function rawToRanking(rawData: Record<string, string>): Record<string, string> {
  console.log(rawData);
  return {};
}
