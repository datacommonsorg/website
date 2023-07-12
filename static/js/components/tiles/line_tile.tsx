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
import React, { useCallback, useEffect, useRef, useState } from "react";

import { DataGroup, DataPoint, expandDataPoints } from "../../chart/base";
import { drawLineChart } from "../../chart/draw";
import { DATA_CSS_CLASS } from "../../constants/tile_constants";
import { formatNumber } from "../../i18n/i18n";
import { SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { computeRatio } from "../../tools/shared_util";
import { stringifyFn } from "../../utils/axios";
import { dataGroupsToCsv } from "../../utils/chart_csv_utils";
import { getUnit } from "../../utils/stat_metadata_utils";
import { getStatVarName, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

export interface LineTilePropType {
  // API root
  apiRoot?: string;
  // Extra classes to add to the container.
  className?: string;
  // colors to use
  colors?: string[];
  id: string;
  // Whether or not to render the data version of this tile
  isDataTile?: boolean;
  title: string;
  place: NamedTypedPlace;
  statVarSpec: StatVarSpec[];
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  // Width, in px, for the SVG chart.
  svgChartWidth?: number;
}

export interface LineChartData {
  dataGroup: DataGroup[];
  sources: Set<string>;
  unit: string;
}

export function LineTile(props: LineTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const [chartData, setChartData] = useState<LineChartData | undefined>(null);

  useEffect(() => {
    if (!chartData) {
      (async () => {
        const data = await fetchData(props);
        setChartData(data);
      })();
    }
  }, [props, chartData]);

  const drawFn = useCallback(() => {
    if (_.isEmpty(chartData)) {
      return;
    }
    draw(props, chartData, svgContainer.current);
  }, [props, chartData]);

  useDrawOnResize(drawFn, svgContainer.current);
  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      sources={chartData && chartData.sources}
      replacementStrings={getReplacementStrings(props)}
      className={`${props.className} line-chart`}
      allowEmbed={true}
      getDataCsv={chartData ? () => dataGroupsToCsv(chartData.dataGroup) : null}
      isInitialLoading={_.isNull(chartData)}
    >
      {props.isDataTile && chartData && (
        <div
          className={DATA_CSS_CLASS}
          data-csv={dataGroupsToCsv(chartData.dataGroup)}
        />
      )}
      <div
        id={props.id}
        className="svg-container"
        ref={svgContainer}
        style={{ minHeight: props.svgChartHeight }}
      ></div>
    </ChartTileContainer>
  );
}

// Get the ReplacementStrings object used for formatting the title
export function getReplacementStrings(
  props: LineTilePropType
): ReplacementStrings {
  return {
    placeName: props.place.name,
  };
}

export const fetchData = async (props: LineTilePropType) => {
  const statVars = [];
  for (const spec of props.statVarSpec) {
    statVars.push(spec.statVar);
    if (spec.denom) {
      statVars.push(spec.denom);
    }
  }
  let endpoint = "/api/observations/series";
  if (props.apiRoot) {
    endpoint = props.apiRoot + endpoint;
  }
  const resp = await axios.get(endpoint, {
    // Fetch both numerator stat vars and denominator stat vars
    params: {
      variables: statVars,
      entities: [props.place.dcid],
    },
    paramsSerializer: stringifyFn,
  });
  return rawToChart(resp.data, props);
};

export function draw(
  props: LineTilePropType,
  chartData: LineChartData,
  svgContainer: HTMLDivElement
): void {
  // TODO: Remove all cases of setting innerHTML directly.
  svgContainer.innerHTML = "";
  const isCompleteLine = drawLineChart(
    svgContainer,
    props.svgChartWidth || svgContainer.offsetWidth,
    props.svgChartHeight,
    chartData.dataGroup,
    false,
    false,
    formatNumber,
    {
      colors: props.colors,
      unit: chartData.unit,
    }
  );
  if (!isCompleteLine) {
    svgContainer.querySelectorAll(".dotted-warning")[0].className +=
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
    sources,
    unit,
  };
}
