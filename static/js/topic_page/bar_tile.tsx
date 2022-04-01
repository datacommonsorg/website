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
 * Component for rendering a bar tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";

import { DataGroup, DataPoint } from "../chart/base";
import { drawGroupBarChart } from "../chart/draw";
import { GetStatSetResponse } from "../shared/stat_types";
import { NamedTypedPlace } from "../shared/types";
import { StatVarMetadata } from "../types/stat_var";
import { getPlaceNames } from "../utils/place_utils";
import { ChartTileContainer } from "./chart_tile";
import { CHART_HEIGHT } from "./constants";
import { Point } from "./ranking_unit";
import { getStatVarName, ReplacementStrings } from "./string_utils";

const NUM_PLACES = 6;

const FILTER_STAT_VAR = "Count_Person";

interface BarTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  statVarMetadata: StatVarMetadata[];
}

interface BarChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
}

export function BarTile(props: BarTilePropType): JSX.Element {
  const [rawData, setRawData] = useState<GetStatSetResponse | undefined>(null);
  const [barChartData, setBarChartData] = useState<BarChartData | undefined>(
    null
  );

  useEffect(() => {
    fetchData(props, setRawData);
  }, [props]);

  useEffect(() => {
    if (rawData) {
      processData(props, rawData, setBarChartData);
    }
  }, [props, rawData]);

  useEffect(() => {
    if (barChartData) {
      draw(props, barChartData);
    }
  }, [props, barChartData]);

  if (!barChartData) {
    return null;
  }
  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };
  return (
    <ChartTileContainer
      title={props.title}
      sources={barChartData.sources}
      replacementStrings={rs}
      className="bar-chart"
    >
      <div id={props.id} className="svg-container"></div>
    </ChartTileContainer>
  );
}

function fetchData(
  props: BarTilePropType,
  setRawData: (data: GetStatSetResponse) => void
): void {
  let url = `/api/stats/within-place?parent_place=${props.place.dcid}&child_type=${props.enclosedPlaceType}`;
  for (const item of props.statVarMetadata) {
    url += `&stat_vars=${item.statVar}`;
    if (item.denom) {
      url += `&stat_vars=${item.denom}`;
    }
  }
  // Fetch populations.
  url += "&stat_vars=" + FILTER_STAT_VAR;
  axios
    .get<GetStatSetResponse>(url)
    .then((resp) => {
      setRawData(resp.data);
    })
    .catch(() => {
      setRawData(null);
    });
}

function processData(
  props: BarTilePropType,
  rawData: GetStatSetResponse,
  setBarChartData: (data: BarChartData) => void
): void {
  const raw = _.cloneDeep(rawData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();
  // TODO(beets): Fill in source URLs.

  // Find the most populated places.
  let popPoints: Point[] = [];
  for (const place in raw.data[FILTER_STAT_VAR].stat) {
    popPoints.push({
      placeDcid: place,
      stat: raw.data[FILTER_STAT_VAR].stat[place].value,
    });
  }
  // Take the most populated places.
  popPoints.sort((a, b) => a.stat - b.stat);
  popPoints = popPoints.slice(0, NUM_PLACES);

  // Fetch the place names
  getPlaceNames(Array.from(popPoints).map((x) => x.placeDcid)).then(
    (placeNames) => {
      for (const point of popPoints) {
        const placeDcid = point.placeDcid;
        const dataPoints: DataPoint[] = [];
        for (const item of props.statVarMetadata) {
          const statVar = item.statVar;
          if (
            !raw.data[statVar] ||
            !raw.data[statVar].stat ||
            !raw.data[statVar].stat[placeDcid]
          ) {
            continue;
          }
          const stat = raw.data[statVar].stat[placeDcid];
          const dataPoint = {
            label: getStatVarName(statVar, props.statVarMetadata),
            value: stat.value || 0,
            dcid: placeDcid,
          };
          sources.add(raw.metadata[stat.metaHash].provenanceUrl);
          if (item.denom && item.denom in raw.data) {
            const denomStat = raw.data[item.denom].stat[placeDcid];
            dataPoint.value /= denomStat.value;
            sources.add(raw.metadata[denomStat.metaHash].provenanceUrl);
          }
          if (item.scaling) {
            dataPoint.value *= item.scaling;
          }
          dataPoints.push(dataPoint);
        }
        dataGroups.push(
          new DataGroup(placeNames[placeDcid] || placeDcid, dataPoints)
        );
      }
      setBarChartData({
        dataGroup: dataGroups,
        sources: sources,
      });
    }
  );
}

function draw(props: BarTilePropType, chartData: BarChartData): void {
  const elem = document.getElementById(props.id);
  // TODO: Remove all cases of setting innerHTML directly.
  elem.innerHTML = "";
  drawGroupBarChart(
    props.id,
    elem.offsetWidth,
    CHART_HEIGHT,
    chartData.dataGroup,
    props.statVarMetadata[0].unit
  );
}
