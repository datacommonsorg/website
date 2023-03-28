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
} from "../../chart/draw_scatter";
import { ChartQuadrant } from "../../constants/scatter_chart_constants";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { getStatWithinPlace } from "../../tools/scatter/util";
import { ScatterTileSpec } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { scatterDataToCsv } from "../../utils/chart_csv_utils";
import { getStringOrNA } from "../../utils/number_utils";
import { getPlaceScatterData } from "../../utils/scatter_data_utils";
import { getDateRange } from "../../utils/string_utils";
import { getStatVarName, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";

interface ScatterTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  statVarSpec: StatVarSpec[];
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  scatterTileSpec: ScatterTileSpec;
  // Extra classes to add to the container.
  className?: string;
}

interface RawData {
  placeStats: PointApiResponse;
  population: SeriesApiResponse;
  placeNames: { [placeDcid: string]: string };
}

interface ScatterChartData {
  xStatVar: StatVarSpec;
  yStatVar: StatVarSpec;
  points: { [placeDcid: string]: Point };
  sources: Set<string>;
  xUnit: string;
  yUnit: string;
  xDate: string;
  yDate: string;
}

export function ScatterTile(props: ScatterTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const tooltip = useRef(null);
  const [rawData, setRawData] = useState<RawData | undefined>(null);
  const [scatterChartData, setScatterChartData] = useState<
    ScatterChartData | undefined
  >(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    fetchData(
      props.place.dcid,
      props.enclosedPlaceType,
      props.statVarSpec,
      setRawData
    );
    setErrorMsg("");
  }, [props]);

  useEffect(() => {
    if (rawData) {
      processData(rawData, props.statVarSpec, setScatterChartData, setErrorMsg);
    }
  }, [props, rawData]);

  useEffect(() => {
    if (scatterChartData && !_.isEmpty(scatterChartData.points)) {
      draw(
        scatterChartData,
        svgContainer,
        props.svgChartHeight,
        tooltip,
        props.scatterTileSpec || {}
      );
    }
  }, [props.svgChartHeight, props.scatterTileSpec, scatterChartData]);

  const rs: ReplacementStrings = {
    placeName: props.place.name,
    xDate: scatterChartData && scatterChartData.xDate,
    yDate: scatterChartData && scatterChartData.yDate,
  };

  return (
    <ChartTileContainer
      title={props.title}
      sources={scatterChartData && scatterChartData.sources}
      replacementStrings={rs}
      className={`${props.className} scatter-chart`}
      allowEmbed={!errorMsg}
      getDataCsv={
        scatterChartData
          ? () =>
              scatterDataToCsv(
                scatterChartData.xStatVar.statVar,
                scatterChartData.xStatVar.denom,
                scatterChartData.yStatVar.statVar,
                scatterChartData.yStatVar.denom,
                scatterChartData.points
              )
          : null
      }
      isInitialLoading={_.isNull(scatterChartData)}
    >
      {errorMsg ? (
        <div className="error-msg" style={{ minHeight: props.svgChartHeight }}>
          {errorMsg}
        </div>
      ) : (
        <>
          <div
            id={props.id}
            className="scatter-svg-container"
            ref={svgContainer}
            style={{ minHeight: props.svgChartHeight }}
          />
          <div
            id="scatter-tooltip"
            ref={tooltip}
            style={{ visibility: "hidden" }}
          />
        </>
      )}
    </ChartTileContainer>
  );
}

function getPopulationPromise(
  placeDcid: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[]
): Promise<SeriesApiResponse> {
  const statVars = [];
  for (const sv of statVarSpec) {
    if (sv.denom) {
      statVars.push(sv.denom);
    }
  }
  if (_.isEmpty(statVars)) {
    return Promise.resolve(null);
  } else {
    return axios
      .get("/api/observations/series/within", {
        params: {
          parent_entity: placeDcid,
          child_type: enclosedPlaceType,
          variables: statVars,
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => resp.data);
  }
}

function fetchData(
  placeDcid: string,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec[],
  setRawData: (data: RawData) => void
): void {
  if (statVarSpec.length < 2) {
    // TODO: add error message
    return;
  }
  const placeStatsPromise = getStatWithinPlace(placeDcid, enclosedPlaceType, [
    { statVarDcid: statVarSpec[0].statVar },
    { statVarDcid: statVarSpec[1].statVar },
  ]);
  const populationPromise = getPopulationPromise(
    placeDcid,
    enclosedPlaceType,
    statVarSpec
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
  statVarSpec: StatVarSpec[],
  setChartdata: (data: ScatterChartData) => void,
  setErrorMsg: (msg: string) => void
): void {
  const yStatVar = statVarSpec[0];
  const xStatVar = statVarSpec[1];
  const yPlacePointStat = rawData.placeStats.data[yStatVar.statVar];
  const xPlacePointStat = rawData.placeStats.data[xStatVar.statVar];
  if (!xPlacePointStat || !yPlacePointStat) {
    return;
  }
  const points = {};
  const sources: Set<string> = new Set();
  const xDates: Set<string> = new Set();
  const yDates: Set<string> = new Set();
  let xUnit = xStatVar.unit;
  let yUnit = yStatVar.unit;
  for (const place in xPlacePointStat) {
    const namedPlace = {
      dcid: place,
      name: rawData.placeNames[place] || place,
    };
    const placeChartData = getPlaceScatterData(
      namedPlace,
      xPlacePointStat,
      yPlacePointStat,
      rawData.population,
      rawData.placeStats.facets,
      xStatVar.denom,
      yStatVar.denom,
      null,
      xStatVar.scaling,
      yStatVar.scaling
    );
    if (!placeChartData) {
      console.log(
        `SCATTER: no data ${xStatVar} / ${yStatVar} for ${place}. skipping.`
      );
      continue;
    }
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sources.add(source);
      }
    });
    points[place] = placeChartData.point;
    xDates.add(placeChartData.point.xDate);
    yDates.add(placeChartData.point.yDate);
    xUnit = xUnit || placeChartData.xUnit;
    yUnit = yUnit || placeChartData.yUnit;
  }
  if (_.isEmpty(points)) {
    setErrorMsg("Sorry, we don't have data for those variables");
  }
  setChartdata({
    xStatVar,
    yStatVar,
    points,
    sources,
    xUnit,
    yUnit,
    xDate: getDateRange(Array.from(xDates)),
    yDate: getDateRange(Array.from(yDates)),
  });
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
  svgChartHeight: number,
  tooltip: React.RefObject<HTMLDivElement>,
  scatterTileSpec: ScatterTileSpec
): void {
  const width = svgContainer.current.offsetWidth;
  const shouldHighlightQuadrants = {
    [ChartQuadrant.TOP_LEFT]: scatterTileSpec.highlightTopLeft,
    [ChartQuadrant.TOP_RIGHT]: scatterTileSpec.highlightTopRight,
    [ChartQuadrant.BOTTOM_LEFT]: scatterTileSpec.highlightBottomLeft,
    [ChartQuadrant.BOTTOM_RIGHT]: scatterTileSpec.highlightBottomRight,
  };
  const highlightPoints = [
    ChartQuadrant.TOP_LEFT,
    ChartQuadrant.TOP_RIGHT,
    ChartQuadrant.BOTTOM_LEFT,
    ChartQuadrant.BOTTOM_RIGHT,
  ].filter((quadrant) => shouldHighlightQuadrants[quadrant]);
  const plotOptions: ScatterPlotOptions = {
    xPerCapita: !_.isEmpty(chartData.xStatVar.denom),
    yPerCapita: !_.isEmpty(chartData.yStatVar.denom),
    xLog: chartData.xStatVar.log,
    yLog: chartData.yStatVar.log,
    showQuadrants: false,
    showDensity: true,
    showLabels: false,
    showRegression: false,
    highlightPoints,
  };
  const yLabel = getStatVarName(
    chartData.yStatVar.statVar,
    [chartData.yStatVar],
    !_.isEmpty(chartData.yStatVar.denom)
  );
  const xLabel = getStatVarName(
    chartData.xStatVar.statVar,
    [chartData.xStatVar],
    !_.isEmpty(chartData.xStatVar.denom)
  );
  const plotProperties: ScatterPlotProperties = {
    width,
    height: svgChartHeight,
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
