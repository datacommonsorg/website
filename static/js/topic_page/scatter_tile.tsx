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
 * Component for rendering a scatter type tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import {
  drawScatter,
  Point,
  ScatterPlotOptions,
  ScatterPlotProperties,
} from "../chart/draw_scatter";
import { StatApiResponse } from "../shared/stat_types";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { NamedTypedPlace } from "../shared/types";
import { getStatsWithinPlace } from "../tools/scatter/util";
import { GetStatSetResponse } from "../tools/shared_util";
import { StatVarMetadata } from "../types/stat_var";
import { getStringOrNA } from "../utils/number_utils";
import { getPlaceScatterData } from "../utils/scatter_data_utils";
import { ChartTileContainer } from "./chart_tile";
import { CHART_HEIGHT } from "./constants";
import { ReplacementStrings } from "./string_utils";

interface ScatterTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  statVarMetadata: StatVarMetadata[];
}

interface RawData {
  placeStats: GetStatSetResponse;
  population: StatApiResponse;
  placeNames: { [placeDcid: string]: string };
}

interface ScatterChartData {
  xStatVar: StatVarMetadata;
  yStatVar: StatVarMetadata;
  points: { [placeDcid: string]: Point };
  sources: Set<string>;
}

export function ScatterTile(props: ScatterTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const tooltip = useRef(null);
  const [rawData, setRawData] = useState<RawData | undefined>(null);
  const [scatterChartData, setScatterChartData] = useState<
    ScatterChartData | undefined
  >(null);

  useEffect(() => {
    fetchData(
      props.place.dcid,
      props.enclosedPlaceType,
      props.statVarMetadata,
      setRawData
    );
  }, [props]);

  useEffect(() => {
    if (rawData) {
      processData(rawData, props.statVarMetadata, setScatterChartData);
    }
  }, [props, rawData]);

  useEffect(() => {
    if (scatterChartData) {
      draw(scatterChartData, svgContainer, tooltip);
    }
  }, [scatterChartData]);

  if (!scatterChartData) {
    return null;
  }
  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };

  return (
    <ChartTileContainer
      title={props.title}
      sources={scatterChartData.sources}
      replacementStrings={rs}
    >
      <div id={props.id} className="scatter-svg-container" ref={svgContainer} />
      <div id="scatter-tooltip" ref={tooltip} />
    </ChartTileContainer>
  );
}

function getPopulationPromise(
  placeDcid: string,
  enclosedPlaceType: string,
  statVarMetadata: StatVarMetadata[]
): Promise<StatApiResponse> {
  let statVarParams = "";
  for (const sv of statVarMetadata) {
    if (sv.denom) {
      statVarParams += `&stat_vars=${sv.denom}`;
    }
  }
  if (_.isEmpty(statVarParams)) {
    return Promise.resolve({});
  } else {
    return axios
      .get(
        `/api/stats/set/series/within-place?parent_place=${placeDcid}&child_type=${enclosedPlaceType}${statVarParams}`
      )
      .then((resp) => resp.data);
  }
}

function fetchData(
  placeDcid: string,
  enclosedPlaceType: string,
  statVarMetadata: StatVarMetadata[],
  setRawData: (data: RawData) => void
): void {
  if (statVarMetadata.length < 2) {
    // TODO: add error message
    return;
  }
  const placeStatsPromise = getStatsWithinPlace(placeDcid, enclosedPlaceType, [
    { statVarDcid: statVarMetadata[0].statVar },
    { statVarDcid: statVarMetadata[1].statVar },
  ]);
  const populationPromise = getPopulationPromise(
    placeDcid,
    enclosedPlaceType,
    statVarMetadata
  );
  const placeNamesPromise = axios
    .get(
      `/api/place/places-in-names?dcid=${placeDcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  Promise.all([placeStatsPromise, populationPromise, placeNamesPromise])
    .then(([placeStats, population, placeNames]) => {
      setRawData({
        placeStats,
        population,
        placeNames,
      });
    })
    .catch(() => {
      // TODO: add error message
      setRawData(null);
    });
}

function processData(
  rawData: RawData,
  statVarMetadata: StatVarMetadata[],
  setChartdata: (data: ScatterChartData) => void
): void {
  const xStatVar = statVarMetadata[0];
  const yStatVar = statVarMetadata[1];
  const xPlacePointStat = rawData.placeStats.data[xStatVar.statVar];
  const yPlacePointStat = rawData.placeStats.data[yStatVar.statVar];
  if (!xPlacePointStat || !yPlacePointStat) {
    return;
  }
  const points = {};
  const sources: Set<string> = new Set();
  for (const place in xPlacePointStat.stat) {
    const namedPlace = {
      dcid: place,
      name: rawData.placeNames[place] || place,
    };
    const placeChartData = getPlaceScatterData(
      namedPlace,
      xPlacePointStat,
      yPlacePointStat,
      rawData.population,
      rawData.placeStats.metadata,
      xStatVar.denom,
      yStatVar.denom,
      null,
      xStatVar.scaling,
      yStatVar.scaling
    );
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sources.add(source);
      }
    });
    points[place] = placeChartData.point;
  }
  setChartdata({ xStatVar, yStatVar, points, sources });
}

function getTooltipElement(
  point: Point,
  xLabel: string,
  yLabel: string
): JSX.Element {
  return (
    <>
      <header>
        <b>{point.place.name || point.place.dcid}</b>
      </header>
      {xLabel} ({point.xDate}): <b>{getStringOrNA(point.xVal)}</b>
      <br />
      {yLabel} ({point.yDate}): <b>{getStringOrNA(point.yVal)}</b>
      <br />
    </>
  );
}

function draw(
  chartData: ScatterChartData,
  svgContainer: React.RefObject<HTMLDivElement>,
  tooltip: React.RefObject<HTMLDivElement>
): void {
  const width = svgContainer.current.offsetWidth;
  const plotOptions: ScatterPlotOptions = {
    xPerCapita: !_.isEmpty(chartData.xStatVar.denom),
    yPerCapita: !_.isEmpty(chartData.yStatVar.denom),
    xLog: chartData.xStatVar.log,
    yLog: chartData.yStatVar.log,
    showQuadrants: false,
    showDensity: true,
    showLabels: false,
    showRegression: false,
  };
  const yLabelSuffix = !_.isEmpty(chartData.yStatVar.denom)
    ? " Per Capita"
    : "";
  const yLabel = `${getStatsVarLabel(
    chartData.yStatVar.statVar
  )}${yLabelSuffix}`;
  const xLabelSuffix = !_.isEmpty(chartData.xStatVar.denom)
    ? " Per Capita"
    : "";
  const xLabel = `${getStatsVarLabel(
    chartData.xStatVar.statVar
  )}${xLabelSuffix}`;
  const plotProperties: ScatterPlotProperties = {
    width,
    height: CHART_HEIGHT,
    xLabel,
    yLabel,
    xUnit: chartData.xStatVar.unit,
    yUnit: chartData.yStatVar.unit,
  };
  drawScatter(
    svgContainer,
    tooltip,
    plotProperties,
    plotOptions,
    chartData.points,
    _.noop,
    getTooltipElement
  );
}
