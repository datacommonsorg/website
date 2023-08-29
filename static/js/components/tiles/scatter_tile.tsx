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

import { VisType } from "../../apps/visualization/vis_type_configs";
import {
  drawScatter,
  Point,
  ScatterPlotOptions,
  ScatterPlotProperties,
} from "../../chart/draw_scatter";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { ChartQuadrant } from "../../constants/scatter_chart_constants";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import { SHOW_POPULATION_OFF } from "../../tools/scatter/context";
import { getStatWithinPlace } from "../../tools/scatter/util";
import { ScatterTileSpec } from "../../types/subject_page_proto_types";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import { stringifyFn } from "../../utils/axios";
import { scatterDataToCsv } from "../../utils/chart_csv_utils";
import { getStringOrNA } from "../../utils/number_utils";
import { getPlaceScatterData } from "../../utils/scatter_data_utils";
import { getDateRange } from "../../utils/string_utils";
import { getStatVarNames, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

export interface ScatterTilePropType {
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
  // API root
  apiRoot?: string;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  // Whether or not to show a loading spinner when fetching data.
  showLoadingSpinner?: boolean;
}

interface RawData {
  placeStats: PointApiResponse;
  population: SeriesApiResponse;
  placeNames: { [placeDcid: string]: string };
  statVarNames: { [statVarDcid: string]: string };
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
  // props used when fetching this data
  props: ScatterTilePropType;
  // Names of stat vars to use for labels
  xStatVarName: string;
  yStatVarName: string;
}

export function ScatterTile(props: ScatterTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const tooltip = useRef(null);
  const [scatterChartData, setScatterChartData] = useState<
    ScatterChartData | undefined
  >(null);

  useEffect(() => {
    if (scatterChartData && areDataPropsEqual()) {
      // only re-fetch if the props that affect data fetch are not equal
      return;
    }
    loadSpinner(getSpinnerId());
    (async () => {
      const data = await fetchData(props);
      if (props && _.isEqual(data.props, props)) {
        setScatterChartData(data);
      }
    })();
  }, [props, scatterChartData]);

  const drawFn = useCallback(() => {
    if (!scatterChartData || !areDataPropsEqual()) {
      return;
    }
    if (_.isEmpty(scatterChartData.points)) {
      removeSpinner(getSpinnerId());
      return;
    }
    draw(
      scatterChartData,
      svgContainer.current,
      props.svgChartHeight,
      tooltip.current,
      props.scatterTileSpec || {}
    );
    removeSpinner(getSpinnerId());
  }, [props.svgChartHeight, props.scatterTileSpec, scatterChartData]);

  useDrawOnResize(drawFn, svgContainer.current);

  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      sources={scatterChartData && scatterChartData.sources}
      replacementStrings={getReplacementStrings(props, scatterChartData)}
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
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
    >
      {scatterChartData && scatterChartData.errorMsg ? (
        <div className="error-msg" style={{ minHeight: props.svgChartHeight }}>
          {scatterChartData.errorMsg}
        </div>
      ) : (
        <div className="scatter-tile-content">
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
        </div>
      )}
      {props.showLoadingSpinner && (
        <div id={getSpinnerId()} className="scatter-spinner">
          <div className="screen">
            <div id="spinner"></div>
          </div>
        </div>
      )}
    </ChartTileContainer>
  );

  function getSpinnerId(): string {
    return `scatter-spinner-${props.id}`;
  }

  function areDataPropsEqual(): boolean {
    const oldDataProps = [
      scatterChartData.props.place,
      scatterChartData.props.enclosedPlaceType,
      scatterChartData.props.statVarSpec,
    ];
    const newDataProps = [
      props.place,
      props.enclosedPlaceType,
      props.statVarSpec,
    ];
    return _.isEqual(oldDataProps, newDataProps);
  }
}

// Get the ReplacementStrings object used for formatting the title
export function getReplacementStrings(
  props: ScatterTilePropType,
  chartData: ScatterChartData
): ReplacementStrings {
  return {
    placeName: props.place.name,
    xDate: chartData && chartData.xDate,
    yDate: chartData && chartData.yDate,
  };
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
      {
        statVarDcid: props.statVarSpec[0].statVar,
        date: props.statVarSpec[0].date,
      },
      {
        statVarDcid: props.statVarSpec[1].statVar,
        date: props.statVarSpec[1].date,
      },
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
    const statVarNames = await getStatVarNames(
      props.statVarSpec,
      props.apiRoot
    );
    const rawData = { placeStats, population, placeNames, statVarNames };
    return rawToChart(rawData, props);
  } catch (error) {
    return null;
  }
};

function rawToChart(
  rawData: RawData,
  props: ScatterTilePropType
): ScatterChartData {
  const yStatVar = props.statVarSpec[0];
  const xStatVar = props.statVarSpec[1];
  const yPlacePointStat = rawData.placeStats.data[yStatVar.statVar];
  const xPlacePointStat = rawData.placeStats.data[xStatVar.statVar];
  const xStatVarName = rawData.statVarNames[xStatVar.statVar];
  const yStatVarName = rawData.statVarNames[yStatVar.statVar];
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
    props,
    xStatVarName,
    yStatVarName,
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
  // Need to clear svg container before getting the width for resize cases.
  // Otherwise, svgContainer offsetWidth will just be previous width.
  svgContainer.innerHTML = "";
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
    showQuadrants: scatterTileSpec.showQuadrants,
    showDensity: true,
    showPopulation: SHOW_POPULATION_OFF,
    showLabels: scatterTileSpec.showPlaceLabels,
    showRegression: false,
    highlightPoints,
  };
  const plotProperties: ScatterPlotProperties = {
    width,
    height: svgChartHeight,
    xLabel: chartData.xStatVarName,
    yLabel: chartData.yStatVarName,
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

function getExploreLink(props: ScatterTilePropType): {
  displayText: string;
  url: string;
} {
  const displayOptions = {
    scatterPlaceLables: props.scatterTileSpec.showPlaceLabels,
    scatterQuadrants: props.scatterTileSpec.showQuadrants,
  };
  const hash = getHash(
    VisType.SCATTER,
    [props.place.dcid],
    props.enclosedPlaceType,
    props.statVarSpec.slice(0, 2).map((svSpec) => getContextStatVar(svSpec)),
    displayOptions
  );
  return {
    displayText: "Scatter Tool",
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
