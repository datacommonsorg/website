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
import React, { useEffect, useRef, useState } from "react";

import { DataGroup, DataPoint, expandDataPoints } from "../chart/base";
import { drawLineChart } from "../chart/draw";
import { StatApiResponse } from "../shared/stat_types";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { NamedTypedPlace } from "../shared/types";
import { StatVarMetadata } from "../types/stat_var";
import { ChartTileContainer } from "./chart_tile";
import { CHART_HEIGHT } from "./constants";
import { ReplacementStrings } from "./string_utils";

interface LineTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  statVarMetadata: StatVarMetadata[];
}

interface LineChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
}

export function LineTile(props: LineTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const [rawData, setRawData] = useState<StatApiResponse | undefined>(null);
  const [lineChartData, setLineChartData] = useState<LineChartData | undefined>(
    null
  );

  useEffect(() => {
    fetchData(props, setRawData);
  }, [props]);

  useEffect(() => {
    if (rawData) {
      processData(props, rawData, setLineChartData);
    }
  }, [props, rawData]);

  useEffect(() => {
    if (lineChartData) {
      draw(props, lineChartData.dataGroup, svgContainer);
    }
  }, [props, lineChartData]);

  if (!lineChartData) {
    return null;
  }
  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };
  return (
    <ChartTileContainer
      title={props.title}
      sources={lineChartData.sources}
      replacementStrings={rs}
    >
      <div id={props.id} className="svg-container" ref={svgContainer}></div>
    </ChartTileContainer>
  );
}

function fetchData(
  props: LineTilePropType,
  setRawData: (data: StatApiResponse) => void
): void {
  const statVars = [];
  for (const item of props.statVarMetadata) {
    statVars.push(item.statVar);
    if (item.denom) {
      statVars.push(item.denom);
    }
  }
  axios
    .post(`/api/stats`, {
      // Fetch both numerator stat vars and denominator stat vars
      statVars: statVars,
      places: [props.place.dcid],
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
  setChartData: (data: LineChartData) => void
): void {
  const chartData = rawToChart(rawData, props);
  setChartData(chartData);
}

function draw(
  props: LineTilePropType,
  chartData: DataGroup[],
  svgContainer: React.RefObject<HTMLElement>
): void {
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
    props.statVarMetadata[0].unit
  );
  if (!isCompleteLine) {
    svgContainer.current.querySelectorAll(".dotted-warning")[0].className +=
      " d-inline";
  }
}

function rawToChart(
  rawData: StatApiResponse,
  props: LineTilePropType
): LineChartData {
  // (TODO): We assume the index of numerator and denominator matches.
  // This is brittle and should be updated in the protobuf that binds both
  // together.
  const raw = _.cloneDeep(rawData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();
  const metadata = props.statVarMetadata;
  const allDates = new Set<string>();
  for (const item of metadata) {
    // Do not modify the React state. Create a clone.
    const series = raw[props.place.dcid].data[item.statVar];
    if (item.denom) {
      const denomSeries = raw[props.place.dcid].data[item.denom];
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
    if (series.val && Object.keys(series.val).length > 0) {
      const dataPoints: DataPoint[] = [];
      for (const date in series.val) {
        dataPoints.push({
          label: date,
          time: new Date(date).getTime(),
          value: series.val[date] * item.scaling,
        });
        allDates.add(date);
      }
      dataGroups.push(
        new DataGroup(getStatsVarLabel(item.statVar), dataPoints)
      );
      sources.add(series.metadata.provenanceUrl);
    }
  }
  for (let i = 0; i < dataGroups.length; i++) {
    dataGroups[i].value = expandDataPoints(dataGroups[i].value, allDates);
  }
  return {
    dataGroup: dataGroups,
    sources: sources,
  };
}
