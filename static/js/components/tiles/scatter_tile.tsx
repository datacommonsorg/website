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
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  drawScatter,
  Point,
  ScatterPlotOptions,
  ScatterPlotProperties,
} from "../../chart/draw_scatter";
import { ChartQuadrant } from "../../constants/scatter_chart_constants";
import { DATA_CSS_CLASS } from "../../constants/tile_constants";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { SHOW_POPULATION_OFF } from "../../tools/scatter/context";
import { getStatWithinPlace } from "../../tools/scatter/util";
import { ScatterTileSpec } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { scatterDataToCsv } from "../../utils/chart_csv_utils";
import { getStringOrNA } from "../../utils/number_utils";
import { getPlaceScatterData } from "../../utils/scatter_data_utils";
import { getDateRange } from "../../utils/string_utils";
import { getStatVarName, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

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
  // Whether or not to render the data version of this tile
  isDataTile?: boolean;
  // API root
  apiRoot?: string;
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
  errorMsg: string;
}

export function ScatterTile(props: ScatterTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const tooltip = useRef(null);
  const [scatterChartData, setScatterChartData] = useState<
    ScatterChartData | undefined
  >(null);

  useEffect(() => {
    if (!scatterChartData) {
      (async () => {
        const data = await fetchData(props);
        setScatterChartData(data);
      })();
    }
  }, [props, scatterChartData]);

  const drawFn = useCallback(() => {
    if (!scatterChartData || _.isEmpty(scatterChartData.points)) {
      return;
    }
    draw(
      scatterChartData,
      svgContainer.current,
      props.svgChartHeight,
      tooltip.current,
      props.scatterTileSpec || {}
    );
  }, [props.svgChartHeight, props.scatterTileSpec, scatterChartData]);

  useDrawOnResize(drawFn, svgContainer.current);

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
      allowEmbed={!(scatterChartData && scatterChartData.errorMsg)}
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
      {scatterChartData && scatterChartData.errorMsg ? (
        <div className="error-msg" style={{ minHeight: props.svgChartHeight }}>
          {scatterChartData.errorMsg}
        </div>
      ) : (
        <>
          {props.isDataTile && scatterChartData && (
            <div
              className={DATA_CSS_CLASS}
              data-csv={scatterDataToCsv(
                scatterChartData.xStatVar.statVar,
                scatterChartData.xStatVar.denom,
                scatterChartData.yStatVar.statVar,
                scatterChartData.yStatVar.denom,
                scatterChartData.points
              )}
            />
          )}
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
  statVarSpec: StatVarSpec[],
  apiRoot?: string
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
      .get(`${apiRoot || ""}/api/observations/series/within`, {
        params: {
          parentEntity: placeDcid,
          childType: enclosedPlaceType,
          variables: statVars,
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => resp.data);
  }
}

export const fetchData = async (props: ScatterTilePropType) => {
  if (props.statVarSpec.length < 2) {
    // TODO: add error message
    return;
  }
  const placeStatsPromise = getStatWithinPlace(
    props.place.dcid,
    props.enclosedPlaceType,
    [
      { statVarDcid: props.statVarSpec[0].statVar },
      { statVarDcid: props.statVarSpec[1].statVar },
    ],
    props.apiRoot
  );
  const populationPromise = getPopulationPromise(
    props.place.dcid,
    props.enclosedPlaceType,
    props.statVarSpec,
    props.apiRoot
  );
  const placeNamesPromise = axios
    .get(`${props.apiRoot || ""}/api/place/descendent/name`, {
      params: {
        dcid: props.place.dcid,
        descendentType: props.enclosedPlaceType,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => resp.data);
  try {
    const [placeStats, population, placeNames] = await Promise.all([
      placeStatsPromise,
      populationPromise,
      placeNamesPromise,
    ]);
    const rawData = { placeStats, population, placeNames };
    return rawToChart(rawData, props.statVarSpec);
  } catch (error) {
    return null;
  }
};

function rawToChart(
  rawData: RawData,
  statVarSpec: StatVarSpec[]
): ScatterChartData {
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
  const errorMsg = _.isEmpty(points)
    ? "Sorry, we don't have data for those variables"
    : "";
  return {
    xStatVar,
    yStatVar,
    points,
    sources,
    xUnit,
    yUnit,
    xDate: getDateRange(Array.from(xDates)),
    yDate: getDateRange(Array.from(yDates)),
    errorMsg,
  };
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

export function draw(
  chartData: ScatterChartData,
  svgContainer: HTMLDivElement,
  svgChartHeight: number,
  tooltip: HTMLDivElement,
  scatterTileSpec: ScatterTileSpec,
  svgWidth?: number
): void {
  const width = svgWidth || svgContainer.offsetWidth;
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
    showPopulation: SHOW_POPULATION_OFF,
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
