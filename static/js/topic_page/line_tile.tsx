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
import { CHART_HEIGHT } from "./constants";
import { StatVarMetadata } from "./types";

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
    fetchData(props.statVarMetadata);
  }, []);

  useEffect(() => {
    if (rawData) {
      processData(rawData);
    }
  });

  useEffect(() => {
    if (chartData) {
      drawChart(chartData);
    }
  });

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

  function fetchData(statVarMetaData: StatVarMetadata): void {
    axios
      .post(`/api/stats`, {
        // Fetch both numerator stat vars and denominator stat vars
        statVars: statVarMetaData.statVars.concat(statVarMetaData.denominator),
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

  function processData(rawData: StatApiResponse): void {
    const trendData = rawToChart(rawData);
    setChartData(trendData);
  }

  function drawChart(chartData: DataGroup[]): void {
    const elem = document.getElementById(props.id);
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

  function rawToChart(rawData: StatApiResponse): DataGroup[] {
    // (TODO): We assume the index of numerator and denominator matches.
    // This is brittle and should be updated in the protobuf that binds both
    // together.
    const raw = _.cloneDeep(rawData);
    const dataGroups: DataGroup[] = [];
    const sources = new Set<string>();
    const metadata = props.statVarMetadata;
    const computeRatio =
      metadata.statVars.length === metadata.denominator.length;
    const allDates = new Set<string>();
    for (let i = 0; i < metadata.statVars.length; i++) {
      const numSV = metadata.statVars[i];
      console.log(numSV);
      // Do not modify the React state. Create a clone.
      const series = raw[props.placeDcid].data[numSV];
      console.log(series.val);
      if (computeRatio) {
        const denomSV = metadata.denominator[i];
        console.log(denomSV);
        const denomSeries = raw[props.placeDcid].data[denomSV];
        // (TODO): Here expects exact date match. We should implement a generic
        // function that takes two Series and compute the ratio.
        console.log(denomSeries.val);
        for (const date in series.val) {
          if (date in denomSeries.val) {
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
        dataGroups.push(new DataGroup(getStatsVarLabel(numSV), dataPoints));
        sources.add(series.metadata.provenanceUrl);
      }
    }
    for (let i = 0; i < dataGroups.length; i++) {
      dataGroups[i].value = expandDataPoints(dataGroups[i].value, allDates);
    }
    return dataGroups;
  }
}
