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
 * Component for rendering a line type tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";

import { DataGroup, DataPoint, expandDataPoints } from "../chart/base";
import { drawLineChart } from "../chart/draw";
import { StatApiResponse } from "../shared/stat_types";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { StatVarMetadata } from "../types/stat_var";
import { CHART_HEIGHT } from "./constants";

const SVG_CONTAINER_ELEMENT: React.RefObject<HTMLDivElement> = React.createRef();

interface LineTilePropType {
  id: string;
  title: string;
  placeDcid: string;
  statVarMetadata: StatVarMetadata;
}

export function LineTile(props: LineTilePropType): JSX.Element {
  const [rawData, setRawData] = useState<StatApiResponse | undefined>(null);
  const [chartData, setChartData] = useState<DataGroup[] | undefined>(null);

  useEffect(() => {
    fetchData(props, setRawData);
  }, []);

  useEffect(() => {
    if (rawData) {
      processData(props, rawData, setChartData);
    }
  }, [rawData]);

  useEffect(() => {
    if (chartData) {
      draw(props, chartData);
    }
  }, [chartData]);

  return (
    <div className="chart-container">
      {chartData && (
        <>
          <div className="line-title">
            <h4>{props.title}</h4>
          </div>
          <div
            id={props.id}
            className="svg-container"
            ref={SVG_CONTAINER_ELEMENT}
          ></div>
        </>
      )}
    </div>
  );
}

function fetchData(
  props: LineTilePropType,
  setRawData: (data: StatApiResponse) => void
): void {
  const statVars = [];
  for (const item of props.statVarMetadata.statVars) {
    statVars.push(item.main);
    if (item.denom) {
      statVars.push(item.denom);
    }
  }
  axios
    .post(`/api/stats`, {
      // Fetch both numerator stat vars and denominator stat vars
      statVars: statVars,
      places: [props.placeDcid],
    })
    .then((resp) => {
      setRawData(resp.data);
    })
    .catch(() => {
      // TODO: add error message
      setRawData(null);
    });
}

function processData(
  props: LineTilePropType,
  rawData: StatApiResponse,
  setChartData: (data: DataGroup[]) => void
): void {
  const trendData = rawToChart(rawData, props);
  setChartData(trendData);
}

function draw(props: LineTilePropType, chartData: DataGroup[]): void {
  const elem = document.getElementById(props.id);
  // TODO: Remove all cases of setting innerHTML directly.
  elem.innerHTML = "";
  const isCompleteLine = drawLineChart(
    props.id,
    elem.offsetWidth,
    CHART_HEIGHT,
    chartData,
    false,
    false,
    props.statVarMetadata.unit
  );
  if (!isCompleteLine) {
    SVG_CONTAINER_ELEMENT.current.querySelectorAll(
      ".dotted-warning"
    )[0].className += " d-inline";
  }
}

function rawToChart(
  rawData: StatApiResponse,
  props: LineTilePropType
): DataGroup[] {
  // (TODO): We assume the index of numerator and denominator matches.
  // This is brittle and should be updated in the protobuf that binds both
  // together.
  const raw = _.cloneDeep(rawData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();
  const metadata = props.statVarMetadata;
  const allDates = new Set<string>();
  for (const item of metadata.statVars) {
    // Do not modify the React state. Create a clone.
    const series = raw[props.placeDcid].data[item.main];
    if (item.denom) {
      const denomSeries = raw[props.placeDcid].data[item.denom];
      // (TODO): Here expects exact date match. We should implement a generic
      // function that takes two Series and compute the ratio.
      for (const date in series.val) {
        if (date in denomSeries.val && denomSeries.val[date] !== 0) {
          series.val[date] /= denomSeries.val[date];
        } else {
          delete series.val[date];
        }
      }
    }
    if (Object.keys(series.val).length > 0) {
      const dataPoints: DataPoint[] = [];
      for (const date in series.val) {
        dataPoints.push({
          label: date,
          time: new Date(date).getTime(),
          value: series.val[date] * metadata.scaling,
        });
        allDates.add(date);
      }
      dataGroups.push(new DataGroup(getStatsVarLabel(item.main), dataPoints));
      sources.add(series.metadata.provenanceUrl);
    }
  }
  for (let i = 0; i < dataGroups.length; i++) {
    dataGroups[i].value = expandDataPoints(dataGroups[i].value, allDates);
  }
  return dataGroups;
}
