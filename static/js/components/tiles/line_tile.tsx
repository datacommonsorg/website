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

import { DataGroup, DataPoint, expandDataPoints } from "../../chart/base";
import { drawLineChart } from "../../chart/draw";
import { SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { computeRatio } from "../../tools/shared_util";
import { stringifyFn } from "../../utils/axios";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import { formatNumber } from "../../utils/string_utils";
import { getStatVarName, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";

interface LineTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  statVarSpec: StatVarSpec[];
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  // Extra classes to add to the container.
  className?: string;
}

interface LineChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
  unit: string;
}

export function LineTile(props: LineTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const [rawData, setRawData] = useState<SeriesApiResponse | undefined>(null);
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
      draw(props, lineChartData, svgContainer);
    }
  }, [props, lineChartData]);

  const rs: ReplacementStrings = {
    placeName: props.place.name,
  };
  return (
    <ChartTileContainer
      title={props.title}
      sources={lineChartData && lineChartData.sources}
      replacementStrings={rs}
      className={`${props.className} line-chart`}
      allowEmbed={true}
      getDataCsv={
        lineChartData ? () => dataGroupsToCsv(lineChartData.dataGroup) : null
      }
      isInitialLoading={_.isNull(lineChartData)}
    >
      <div
        id={props.id}
        className="svg-container"
        ref={svgContainer}
        style={{ minHeight: props.svgChartHeight }}
      ></div>
    </ChartTileContainer>
  );
}

function fetchData(
  props: LineTilePropType,
  setRawData: (data: SeriesApiResponse) => void
): void {
  const statVars = [];
  for (const spec of props.statVarSpec) {
    statVars.push(spec.statVar);
    if (spec.denom) {
      statVars.push(spec.denom);
    }
  }
  axios
    .get("/api/observations/series", {
      // Fetch both numerator stat vars and denominator stat vars
      params: {
        variables: statVars,
        entities: [props.place.dcid],
      },
      paramsSerializer: stringifyFn,
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
  rawData: SeriesApiResponse,
  setChartData: (data: LineChartData) => void
): void {
  const chartData = rawToChart(rawData, props);
  setChartData(chartData);
}

function draw(
  props: LineTilePropType,
  chartData: LineChartData,
  svgContainer: React.RefObject<HTMLElement>
): void {
  const elem = document.getElementById(props.id);
  // TODO: Remove all cases of setting innerHTML directly.
  elem.innerHTML = "";
  const isCompleteLine = drawLineChart(
    props.id,
    elem.offsetWidth,
    props.svgChartHeight,
    chartData.dataGroup,
    false,
    false,
    formatNumber,
    chartData.unit
  );
  if (!isCompleteLine) {
    svgContainer.current.querySelectorAll(".dotted-warning")[0].className +=
      " d-inline";
  }
}

function rawToChart(
  rawData: SeriesApiResponse,
  props: LineTilePropType
): LineChartData {
  // (TODO): We assume the index of numerator and denominator matches.
  // This is brittle and should be updated in the protobuf that binds both
  // together.
  const raw = _.cloneDeep(rawData);
  const dataGroups: DataGroup[] = [];
  const sources = new Set<string>();
  const allDates = new Set<string>();
  let unit = "";
  for (const spec of props.statVarSpec) {
    // Do not modify the React state. Create a clone.
    const series = raw.data[spec.statVar][props.place.dcid];
    let obsList = series.series;
    if (spec.denom) {
      const denomSeries = raw.data[spec.denom][props.place.dcid];
      obsList = computeRatio(obsList, denomSeries.series);
    }
    if (obsList.length > 0) {
      const dataPoints: DataPoint[] = [];
      for (const obs of obsList) {
        dataPoints.push({
          label: obs.date,
          time: new Date(obs.date).getTime(),
          value: spec.scaling ? obs.value * spec.scaling : obs.value,
        });
        allDates.add(obs.date);
      }
      dataGroups.push(
        new DataGroup(
          getStatVarName(spec.statVar, props.statVarSpec),
          dataPoints
        )
      );
      const svUnit = getUnit(raw.facets[series.facet]);
      unit = unit || svUnit;
      sources.add(raw.facets[series.facet].provenanceUrl);
    }
  }
  for (let i = 0; i < dataGroups.length; i++) {
    dataGroups[i].value = expandDataPoints(dataGroups[i].value, allDates);
  }
  if (!_.isEmpty(props.statVarSpec)) {
    unit = props.statVarSpec[0].unit || unit;
  }
  return {
    dataGroup: dataGroups,
    sources: sources,
    unit,
  };
}
