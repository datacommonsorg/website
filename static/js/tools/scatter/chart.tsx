/**
 * Copyright 2020 Google LLC
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
 * Chart component for plotting a scatter plot.
 */

import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import ReactDOMServer from "react-dom/server";
import { Card } from "reactstrap";

import { BivariateProperties, drawBivariate } from "../../chart/draw_bivariate";
import {
  drawScatter,
  Point,
  ScatterPlotOptions,
  ScatterPlotProperties,
} from "../../chart/draw_scatter";
import { GeoJsonData, GeoJsonFeatureProperties } from "../../chart/types";
import { USA_PLACE_DCID } from "../../shared/constants";
import { FacetSelectorFacetInfo } from "../../shared/facet_selector";
import {
  GA_EVENT_TOOL_CHART_PLOT,
  GA_PARAM_PLACE_DCID,
  GA_PARAM_STAT_VAR,
  triggerGAEvent,
} from "../../shared/ga_events";
import { NamedPlace } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import { getStringOrNA } from "../../utils/number_utils";
import { getDateRange } from "../../utils/string_utils";
import { ToolChartFooter } from "../shared/tool_chart_footer";
import { isChildPlaceOf, shouldShowMapBoundaries } from "../shared_util";
import { DisplayOptionsWrapper, PlaceInfo } from "./context";
import { PlotOptions } from "./plot_options";
import { ScatterChartType } from "./util";

interface ChartPropsType {
  points: { [placeDcid: string]: Point };
  xLabel: string;
  yLabel: string;
  xLog: boolean;
  yLog: boolean;
  xPerCapita: boolean;
  yPerCapita: boolean;
  xUnit?: string;
  yUnit?: string;
  placeInfo: PlaceInfo;
  display: DisplayOptionsWrapper;
  sources: Set<string>;
  svFacetId: Record<string, string>;
  facetList: FacetSelectorFacetInfo[];
  onSvFacetIdUpdated: (svFacetId: Record<string, string>) => void;
}

const DOT_REDIRECT_PREFIX = "/place/";
const SVG_CONTAINER_ID = "scatter-plot-container";
const MAP_LEGEND_CONTAINER_ID = "legend-container";
const CONTAINER_ID = "chart";
const DEBOUNCE_INTERVAL_MS = 30;

export function Chart(props: ChartPropsType): JSX.Element {
  const svgContainerRef = useRef<HTMLDivElement>();
  const tooltipRef = useRef<HTMLDivElement>();
  const chartContainerRef = useRef<HTMLDivElement>();
  const mapLegendRef = useRef<HTMLDivElement>();
  const [geoJson, setGeoJson] = useState(null);
  const [geoJsonFetched, setGeoJsonFetched] = useState(false);
  const xDates: Set<string> = new Set();
  const yDates: Set<string> = new Set();
  Object.values(props.points).forEach((point) => {
    xDates.add(point.xDate);
    yDates.add(point.yDate);
  });
  const xTitle = getTitle(Array.from(xDates), props.xLabel);
  const yTitle = getTitle(Array.from(yDates), props.yLabel);
  // Tooltip needs to start off hidden
  d3.select(tooltipRef.current)
    .style("visibility", "hidden")
    .style("position", "absolute");

  // Fetch geojson in the background when component is first mounted.
  useEffect(() => {
    axios
      .get(
        `/api/choropleth/geojson?placeDcid=${props.placeInfo.enclosingPlace.dcid}&placeType=${props.placeInfo.enclosedPlaceType}`
      )
      .then((resp) => {
        setGeoJson(resp.data);
        setGeoJsonFetched(true);
      })
      .catch(() => setGeoJsonFetched(true));
  }, []);

  function replot() {
    if (!_.isEmpty(props.points)) {
      if (svgContainerRef.current) {
        clearSVGs();
        plot(svgContainerRef, tooltipRef, mapLegendRef, props, geoJson);
      }
    }
  }

  // Replot when props or chart width changes.
  useEffect(() => {
    const entrySet = new Set();
    if (props.display.chartType === ScatterChartType.MAP && !geoJsonFetched) {
      loadSpinner(CONTAINER_ID);
      return;
    } else {
      removeSpinner(CONTAINER_ID);
      replot();
    }
    // ResizeObserver callback function documentation:
    // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/ResizeObserver
    const debouncedHandler = _.debounce((entries) => {
      if (_.isEmpty(entries)) return;
      if (entrySet.has(entries[0].target)) {
        replot();
      } else {
        entrySet.add(entries[0].target);
      }
    }, DEBOUNCE_INTERVAL_MS);
    const resizeObserver = new ResizeObserver(debouncedHandler);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    return () => {
      resizeObserver.unobserve(chartContainerRef.current);
      debouncedHandler.cancel();
    };
  }, [props, chartContainerRef, geoJsonFetched]);

  // Triggered only when stat vars or places change to avoid double counting and send data to google analytics.
  const statVars = ["", ""];
  if (props.facetList.length >= 2) {
    statVars[0] = props.facetList[0].dcid;
    statVars[1] = props.facetList[1].dcid;
    statVars.sort();
  }
  useEffect(() => {
    triggerGAEvent(GA_EVENT_TOOL_CHART_PLOT, {
      [GA_PARAM_PLACE_DCID]: props.placeInfo.enclosingPlace.dcid,
      [GA_PARAM_STAT_VAR]: statVars,
    });
  }, [statVars[0], statVars[1], props.placeInfo.enclosingPlace.dcid]);

  return (
    <div id="chart" className="chart-section-container" ref={chartContainerRef}>
      <Card className="chart-card">
        <div className="chart-title">
          <h3>{yTitle}</h3>
          <span>vs</span>
          <h3>{xTitle}</h3>
        </div>
        <div className="scatter-chart-container">
          <div id={SVG_CONTAINER_ID} ref={svgContainerRef}></div>
          <div id={MAP_LEGEND_CONTAINER_ID} ref={mapLegendRef}></div>
          <div id="scatter-tooltip" ref={tooltipRef} />
        </div>
      </Card>
      <ToolChartFooter
        chartId="scatter"
        sources={props.sources}
        mMethods={null}
        svFacetId={props.svFacetId}
        facetList={props.facetList}
        onSvFacetIdUpdated={props.onSvFacetIdUpdated}
        hideIsRatio={true}
      >
        <PlotOptions />
      </ToolChartFooter>
      <div id="scatter-chart-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </div>
  );
}

/**
 * Clear the svgs from each div container that contains an svg.
 */
function clearSVGs(): void {
  d3.select(`#${SVG_CONTAINER_ID}`).selectAll("*").remove();
  d3.select(`#${MAP_LEGEND_CONTAINER_ID}`).selectAll("*").remove();
}

/**
 * Plots the chart which could either be a scatter plot or map.
 * @param svgContainerRef Ref for the container to plot the chart within
 * @param tooltipRef Ref for the tooltip div
 * @param props Options and information about the chart
 */
function plot(
  svgContainerRef: React.MutableRefObject<HTMLDivElement>,
  tooltipRef: React.MutableRefObject<HTMLDivElement>,
  mapLegendRef: React.MutableRefObject<HTMLDivElement>,
  props: ChartPropsType,
  geoJsonData: GeoJsonData
): void {
  const svgContainerRealWidth = svgContainerRef.current.offsetWidth;
  const chartHeight = svgContainerRef.current.offsetHeight;
  const scatterPlotOptions: ScatterPlotOptions = {
    xPerCapita: props.xPerCapita,
    yPerCapita: props.yPerCapita,
    xLog: props.xLog,
    yLog: props.yLog,
    showQuadrants: props.display.showQuadrants,
    showDensity: props.display.showDensity,
    showLabels: props.display.showLabels,
    showRegression: props.display.showRegression,
    highlightPoints: [],
  };
  const ScatterPlotProperties: ScatterPlotProperties = {
    width: svgContainerRealWidth,
    height: chartHeight,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
    xUnit: props.xUnit,
    yUnit: props.yUnit,
  };
  if (props.display.chartType === ScatterChartType.SCATTER) {
    drawScatter(
      svgContainerRef,
      tooltipRef,
      ScatterPlotProperties,
      scatterPlotOptions,
      props.points,
      redirectAction,
      getTooltipElement
    );
  } else {
    if (_.isEmpty(geoJsonData)) {
      alert(`Sorry, there was an error loading map view.`);
      props.display.setChartType(ScatterChartType.SCATTER);
      return;
    }
    const bivariateProperties: BivariateProperties = {
      width: svgContainerRealWidth,
      height: chartHeight,
      xLog: props.xLog,
      yLog: props.yLog,
      xLabel: props.xLabel,
      yLabel: props.yLabel,
      xUnit: props.xUnit,
      yUnit: props.yUnit,
      placeDcid: props.placeInfo.enclosingPlace.dcid,
      isUsaPlace: isChildPlaceOf(
        props.placeInfo.enclosingPlace.dcid,
        USA_PLACE_DCID,
        props.placeInfo.parentPlaces
      ),
      showMapBoundaries: shouldShowMapBoundaries(
        props.placeInfo.enclosingPlace,
        props.placeInfo.enclosedPlaceType
      ),
    };
    drawBivariate(
      svgContainerRef,
      mapLegendRef,
      props.points,
      geoJsonData,
      bivariateProperties,
      (geoDcid: GeoJsonFeatureProperties) => {
        redirectAction(geoDcid.geoDcid);
      },
      getMapTooltipHtml(
        props.points,
        props.xLabel,
        props.yLabel,
        props.xPerCapita,
        props.yPerCapita
      )
    );
  }
}

/**
 * Get the tooltip element for a given a point
 * @param point the point to get the tooltip element for
 * @param xLabel the xLabel for the tooltip element
 * @param yLabel the yLabel for the tooltip element
 * @param xPerCapita whether the x is per capita
 * @param yPerCapita whether the y is per capita
 */
function getTooltipElement(
  point: Point,
  xLabel: string,
  yLabel: string,
  xPerCapita: boolean,
  yPerCapita: boolean
): JSX.Element {
  let supIndex = 0;
  const xPopDateMessage =
    xPerCapita && point.xPopDate && !point.xDate.includes(point.xPopDate)
      ? ++supIndex
      : null;
  const yPopDateMessage =
    yPerCapita && point.yPopDate && !point.yDate.includes(point.yPopDate)
      ? ++supIndex
      : null;
  return (
    <>
      <header>
        <b>{point.place.name || point.place.dcid}</b>
      </header>
      {xLabel}
      {xPopDateMessage && <sup>{xPopDateMessage}</sup>} ({point.xDate}):{" "}
      <b>{getStringOrNA(point.xVal)}</b>
      <br />
      {yLabel}
      {yPopDateMessage && <sup>{yPopDateMessage}</sup>} ({point.yDate}):{" "}
      <b>{getStringOrNA(point.yVal)}</b>
      <br />
      <footer>
        {xPopDateMessage && (
          <>
            <sup>{xPopDateMessage}</sup> Uses population data from:{" "}
            {point.xPopDate}
            <br />
          </>
        )}
        {yPopDateMessage && (
          <>
            <sup>{yPopDateMessage}</sup> Uses population data from:{" "}
            {point.yPopDate}
          </>
        )}
      </footer>
    </>
  );
}

function redirectAction(placeDcid: string): void {
  const uri = `${DOT_REDIRECT_PREFIX}${placeDcid}`;
  window.open(uri);
}

function getTitle(dates: string[], statVarLabel: string) {
  const dateRange = `(${getDateRange(dates)})`;
  return `${statVarLabel} ${dateRange}`;
}

const getMapTooltipHtml =
  (
    points: { [placeDcid: string]: Point },
    xLabel: string,
    yLabel: string,
    xPerCapita: boolean,
    yPerCapita: boolean
  ) =>
  (place: NamedPlace) => {
    const point = points[place.dcid];
    if (_.isEmpty(point)) {
      return (
        `<header><b>${place.name || place.dcid}</b></header>` +
        "Data Unavailable"
      );
    }
    const element = getTooltipElement(
      point,
      xLabel,
      yLabel,
      xPerCapita,
      yPerCapita
    );
    return ReactDOMServer.renderToStaticMarkup(element);
  };
