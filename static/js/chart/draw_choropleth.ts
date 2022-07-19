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
 * Creates and manages choropleth rendering.
 */

import * as d3 from "d3";
import * as geo from "geo-albers-usa-territories";
import _ from "lodash";

import { formatNumber } from "../i18n/i18n";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { NamedPlace } from "../shared/types";
import { isTemperatureStatVar, isWetBulbStatVar } from "../tools/shared_util";
import {
  ASIA_NAMED_TYPED_PLACE,
  EUROPE_NAMED_TYPED_PLACE,
} from "./../shared/constants";
import { getColorFn } from "./base";
import {
  GeoJsonData,
  GeoJsonFeature,
  GeoJsonFeatureProperties,
  MapPoint,
} from "./types";

/**
 * Information used for the zoom functionality on a map
 *
 * @param startingTransformation the zoom scale and translation to initially
 *        draw the map at
 * @param onZoomEnd callback function that gets called at the end of each zoom
 *        in or zoom out and takes as an argument the zoom transformation
 * @param zoomInButtonId id of a button that can be clicked to zoom in
 * @param zoomOutButtonId id of a button that can be clicked to zoom out
 */
export interface MapZoomParams {
  startingTransformation: d3.ZoomTransform;
  onZoomEnd: (zoomTransformation: d3.ZoomTransform) => void;
  zoomInButtonId: string;
  zoomOutButtonId: string;
}

const MISSING_DATA_COLOR = "#999";
const DOT_COLOR = "black";
const TOOLTIP_ID = "tooltip";
const MIN_COLOR = "#f0f0f0";
const GEO_STROKE_COLOR = "#fff";
const HIGHLIGHTED_STROKE_COLOR = "#202020";
const STROKE_WIDTH = "0.5px";
const HIGHLIGHTED_STROKE_WIDTH = "1.25px";
const AXIS_TEXT_FILL = "#2b2929";
const AXIS_GRID_FILL = "#999";
const TICK_SIZE = 6;
const LEGEND_MARGIN_TOP = 4;
const LEGEND_MARGIN_BOTTOM = TICK_SIZE;
const LEGEND_MARGIN_RIGHT = 5;
const LEGEND_IMG_WIDTH = 10;
const NUM_TICKS = 4;
const HIGHLIGHTED_CLASS_NAME = "highlighted";
export const HOVER_HIGHLIGHTED_CLASS_NAME = "region-highlighted";
const HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME = "region-highlighted-no-click";
const REGULAR_SCALE_AMOUNT = 1;
const ZOOMED_SCALE_AMOUNT = 0.7;
const LEGEND_CLASS_NAME = "legend";
const MAP_ITEMS_GROUP_ID = "map-items";
const LEGEND_TICK_LABEL_MARGIN = 10;
const MIN_DOT_SIZE = 1.1;

// Curated temperature domains.
const TEMP_BASE_DIFF_DOMAIN = [-10, -5, 0, 5, 10];
const TEMP_MODEL_DIFF_DOMAIN = [0, 15];
const TEMP_DOMAIN = [-40, -20, 0, 20, 40];

/**
 * From https://bl.ocks.org/HarryStevens/0e440b73fbd88df7c6538417481c9065
 * scales and translates the projection to allow resizing of the choropleth map
 */
function fitSize(
  width: number,
  height: number,
  object: GeoJsonData | GeoJsonFeature,
  projection: d3.GeoProjection,
  path: d3.GeoPath<any, d3.GeoPermissibleObjects>,
  scale: number
): void {
  projection.scale(1).translate([0, 0]);
  const b = path.bounds(object);
  const s =
    scale / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
  const translateX = (width - s * (b[1][0] + b[0][0])) / 2;
  const translateY = (height - s * (b[1][1] + b[0][1])) / 2;
  projection.scale(s).translate([translateX, translateY]);
}

/**
 * Generates a color scale to be used for drawing choropleth map and legend.
 * NOTE: Only return linear scales.
 *
 * @param statVar name of the stat var we are drawing choropleth for
 * @param dataValues the values we are using to plot our choropleth
 * @param color the color to use as the middle color in the scale
 * @param domain the domain of the scale. The first number is the min, second
 *               number is the middle number, and the last number is the max.
 */
function getColorScale(
  statVar: string,
  dataValues: {
    [placeDcid: string]: number;
  },
  color?: string,
  domain?: [number, number, number]
): d3.ScaleLinear<number, number> {
  const label = getStatsVarLabel(statVar);
  const maxColor = color
    ? d3.color(color)
    : isWetBulbStatVar(statVar)
    ? d3.color(d3.interpolateReds(1))
    : d3.color(getColorFn([label])(label));
  const allValues = Object.values(dataValues);
  const extent = d3.extent(allValues);
  let domainValues: number[] = domain || [
    extent[0],
    d3.mean(allValues),
    extent[1],
  ];
  if (isTemperatureStatVar(statVar)) {
    let range: any[] = [
      d3.interpolateBlues(1),
      d3.interpolateBlues(0.8),
      MIN_COLOR,
      d3.interpolateReds(0.8),
      d3.interpolateReds(1),
    ];

    if (statVar.indexOf("Difference") >= 0) {
      if (statVar.indexOf("Base") >= 0) {
        domainValues = domain || TEMP_BASE_DIFF_DOMAIN;
      } else {
        domainValues = domain || TEMP_MODEL_DIFF_DOMAIN;
      }
    } else {
      domainValues = domain || TEMP_DOMAIN;
    }
    const min = domainValues[0];
    const max = domainValues[domainValues.length - 1];
    if (min >= 0) {
      domainValues = [0, max / 2, max];
      range = [MIN_COLOR, d3.interpolateReds(0.8), d3.interpolateReds(1)];
    } else if (max <= 0) {
      domainValues = [min, min / 2, 0];
      range = [d3.interpolateBlues(1), d3.interpolateBlues(0.8), MIN_COLOR];
    }
    return d3.scaleLinear().domain(domainValues).nice().range(range);
  }
  const rangeValues =
    domainValues.length == 3
      ? [MIN_COLOR, maxColor, maxColor.darker(2)]
      : [MIN_COLOR, maxColor.darker(2)];
  return d3
    .scaleLinear()
    .domain(domainValues)
    .nice()
    .range(rangeValues as unknown as number[])
    .interpolate(
      d3.interpolateHslLong as unknown as (
        a: unknown,
        b: unknown
      ) => (t: number) => number
    );
}

/** Positions and shows the tooltip on the page
 *
 * @param domContainerId id of the container to show the tooltip in
 * @param place place to show the tooltip for
 * @param getTooltipHtml function to get the html content for the tooltip
 */

function showTooltip(
  domContainerId: string,
  place: NamedPlace,
  getTooltipHtml: (place: NamedPlace) => string
): void {
  const container = d3.select(domContainerId);
  const tooltipSelect = container
    .select(`#${TOOLTIP_ID}`)
    .style("display", "block");
  const tooltipHtml = getTooltipHtml(place);
  const tooltipHeight = (tooltipSelect.node() as HTMLDivElement).clientHeight;
  const tooltipWidth = (tooltipSelect.node() as HTMLDivElement).clientWidth;
  const containerWidth = (container.node() as HTMLDivElement).clientWidth;
  const offset = 15;
  const leftOffset = 2 * offset;
  const topOffset = -tooltipHeight - offset;
  let left = Math.min(
    d3.event.offsetX + leftOffset,
    containerWidth - tooltipWidth - offset // account for decoration around the tooltip
  );
  if (left < 0) {
    left = 0;
    tooltipSelect.style("width", containerWidth + "px");
  } else {
    tooltipSelect.style("width", "fit-content");
  }
  let top = d3.event.offsetY + topOffset;
  if (top < 0) {
    top = d3.event.offsetY + offset;
  }
  tooltipSelect
    .html(tooltipHtml)
    .style("left", left + "px")
    .style("top", top + "px");
}

/** Adds a layer of map points to the map
 *
 * @param domContainerId id of the container
 * @param mapPoints list of MapPoints to add
 * @param mapPointValues data values for the map points
 * @param projection geo projection used by the map
 * @param getTooltipHtml function to get the html content for the tooltip
 */
function addMapPoints(
  domContainerId: string,
  mapPoints: Array<MapPoint>,
  mapPointValues: { [placeDcid: string]: number },
  projection: d3.GeoProjection,
  getTooltipHtml: (place: NamedPlace) => string,
  minDotSize: number
): void {
  const filteredMapPoints = mapPoints.filter(
    (point) =>
      !_.isNull(projection([point.longitude, point.latitude])) &&
      point.placeDcid in mapPointValues
  );
  const pointSizeScale = d3
    .scaleLinear()
    .domain(d3.extent(Object.values(mapPointValues)))
    .range([minDotSize, minDotSize * 3]);
  d3.select(`#${MAP_ITEMS_GROUP_ID}`)
    .append("g")
    .attr("class", "map-points-layer")
    .selectAll("circle")
    .data(filteredMapPoints)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("fill", (d) => {
      if (d.placeDcid in mapPointValues) {
        return DOT_COLOR;
      } else {
        return MISSING_DATA_COLOR;
      }
    })
    .attr(
      "cx",
      (point: MapPoint) => projection([point.longitude, point.latitude])[0]
    )
    .attr(
      "cy",
      (point: MapPoint) => projection([point.longitude, point.latitude])[1]
    )
    .attr("r", (point: MapPoint) =>
      pointSizeScale(mapPointValues[point.placeDcid])
    )
    .on("mouseover", (point: MapPoint) => {
      const place = {
        dcid: point.placeDcid,
        name: point.placeName,
      };
      showTooltip(domContainerId, place, getTooltipHtml);
    })
    .on("mouseout", () => {
      d3.select(domContainerId)
        .select(`#${TOOLTIP_ID}`)
        .style("display", "none");
    });
}

/** Draws a choropleth chart
 *
 * @param containerId id of the div to draw the choropleth in
 * @param geoJson the geojson data for drawing choropleth
 * @param chartHeight height for the chart
 * @param chartWidth width for the chart
 * @param dataValues data values for plotting
 * @param unit the unit of measurement
 * @param colorScale the color scale to use for drawing the map and legend
 * @param redirectAction function that runs when region on map is clicked
 * @param getTooltipHtml function to get the html content for the tooltip
 * @param canClickRegion function to determine if a region on the map is clickable
 * @param shouldGenerateLegend whether legend needs to be generated
 * @param shouldShowBoundaryLines whether each region should have boundary lines shown
 * @param isUSAPlace whether this is a map of a place in the US
 * @param mapPoints list of points to add onto the map
 * @param mapPointValues data values for the map points
 * @param zoomDcid the dcid of the region to zoom in on when drawing the chart
 * @param zoomInButtonId the id of the zoom in button
 * @param zoomOutButtonId the id of the zoom out button
 */
function drawChoropleth(
  containerId: string,
  geoJson: GeoJsonData,
  chartHeight: number,
  chartWidth: number,
  dataValues: {
    [placeDcid: string]: number;
  },
  unit: string,
  colorScale: d3.ScaleLinear<number | string, number>,
  redirectAction: (geoDcid: GeoJsonFeatureProperties) => void,
  getTooltipHtml: (place: NamedPlace) => string,
  canClickRegion: (placeDcid: string) => boolean,
  shouldGenerateLegend: boolean,
  shouldShowBoundaryLines: boolean,
  isUSAPlace: boolean,
  enclosingPlaceDcid?: string, // DCID of enclosing place that might have special projections
  mapPoints?: Array<MapPoint>,
  mapPointValues?: { [placeDcid: string]: number },
  zoomDcid?: string,
  zoomParams?: MapZoomParams
): void {
  // Add svg for the map to the div holding the chart.
  const domContainerId = `#${containerId}`;
  const svg = d3
    .select(domContainerId)
    .append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const map = svg.append("g").attr("id", MAP_ITEMS_GROUP_ID);

  // Combine path elements from D3 content.
  const mapRegionsLayer = map
    .append("g")
    .attr("class", "map-regions")
    .selectAll("path")
    .data(geoJson.features);

  const isEurope = enclosingPlaceDcid == EUROPE_NAMED_TYPED_PLACE.dcid;
  const isAsia = enclosingPlaceDcid == ASIA_NAMED_TYPED_PLACE.dcid;

  // TODO(beets): Refactor projection selection / modification to a helper function.
  const projection = isUSAPlace
    ? geo.geoAlbersUsaTerritories()
    : isEurope
    ? d3.geoAzimuthalEqualArea()
    : d3.geoEquirectangular();

  if (isEurope) {
    // Reference:
    // https://observablehq.com/@toja/five-map-projections-for-europe#_lambertAzimuthalEqualArea
    projection
      .rotate([-20.0, -52.0])
      .translate([chartWidth / 2, chartHeight / 2])
      .scale(chartWidth / 1.5)
      .precision(0.1);
  } else if (isAsia) {
    // Reference:
    // https://stackoverflow.com/questions/39958471/d3-js-map-with-albers-projection-how-to-rotate-it/41133970#41133970
    projection
      .rotate([-85, 0])
      .center([0, 35])
      .translate([chartWidth / 2, chartHeight / 2])
      .scale(chartHeight / 1.5)
      .precision(0.1);
  }
  const geomap = d3.geoPath().projection(projection);

  if (shouldGenerateLegend) {
    const legendHeight = chartHeight - LEGEND_MARGIN_BOTTOM - LEGEND_MARGIN_TOP;
    const legendWidth = generateLegend(
      svg,
      legendHeight,
      colorScale as d3.ScaleLinear<number, number>,
      unit
    );
    chartWidth -= legendWidth;
    svg
      .select(`.${LEGEND_CLASS_NAME}`)
      .attr("transform", `translate(${chartWidth}, ${LEGEND_MARGIN_TOP})`);
  }

  // Scale and center the map
  let isMapFitted = false || isEurope || isAsia;
  if (zoomDcid) {
    const geoJsonFeature = geoJson.features.find(
      (feature) => feature.properties.geoDcid === zoomDcid
    );
    if (geoJsonFeature) {
      fitSize(
        chartWidth,
        chartHeight,
        geoJsonFeature,
        projection,
        geomap,
        ZOOMED_SCALE_AMOUNT
      );
      isMapFitted = true;
    }
  }
  if (!isMapFitted) {
    fitSize(
      chartWidth,
      chartHeight,
      geoJson,
      projection,
      geomap,
      REGULAR_SCALE_AMOUNT
    );
  }

  // Build map objects.
  const mapObjects = mapRegionsLayer
    .enter()
    .append("path")
    .attr("d", geomap)
    .attr("class", (geo: GeoJsonFeature) => {
      // highlight the place of the current page
      if (
        geo.properties.geoDcid === geoJson.properties.current_geo ||
        geo.properties.geoDcid === zoomDcid
      ) {
        return HIGHLIGHTED_CLASS_NAME;
      }
    })
    .attr("fill", (d: GeoJsonFeature) => {
      if (
        d.properties.geoDcid in dataValues &&
        dataValues[d.properties.geoDcid] !== undefined &&
        dataValues[d.properties.geoDcid] !== null
      ) {
        const value = dataValues[d.properties.geoDcid];
        return colorScale(value);
      } else {
        return MISSING_DATA_COLOR;
      }
    })
    .attr("data-geodcid", (d: GeoJsonFeature) => {
      if (d.properties.geoDcid in dataValues) {
        return d.properties.geoDcid;
      }
    })
    .attr("id", (_, index) => {
      return "geoPath" + index;
    })
    .on("mouseover", onMouseOver(canClickRegion, domContainerId))
    .on("mouseout", onMouseOut(domContainerId))
    .on(
      "mousemove",
      onMouseMove(canClickRegion, domContainerId, getTooltipHtml)
    );
  if (shouldShowBoundaryLines) {
    mapObjects
      .attr("stroke-width", STROKE_WIDTH)
      .attr("stroke", GEO_STROKE_COLOR);
  }
  mapObjects.on(
    "click",
    onMapClick(canClickRegion, domContainerId, redirectAction)
  );

  // style highlighted region and bring to the front
  d3.select(domContainerId)
    .select("." + HIGHLIGHTED_CLASS_NAME)
    .raise()
    .attr("stroke-width", HIGHLIGHTED_STROKE_WIDTH)
    .attr("stroke", HIGHLIGHTED_STROKE_COLOR);
  addTooltip(domContainerId);

  // add map points if there are any to add
  if (!_.isEmpty(mapPoints) && !_.isUndefined(mapPointValues)) {
    // calculate the min dot size based on the sizes of the regions on the map
    let minRegionDiagonal = Number.MAX_VALUE;
    mapObjects.each((_, idx, paths) => {
      const pathClientRect = paths[idx].getBoundingClientRect();
      minRegionDiagonal = Math.sqrt(
        Math.pow(pathClientRect.height, 2) + Math.pow(pathClientRect.width, 2)
      );
    });
    const minDotSize = Math.max(minRegionDiagonal * 0.02, 1.1);
    addMapPoints(
      domContainerId,
      mapPoints,
      mapPointValues,
      projection,
      getTooltipHtml,
      minDotSize
    );
  }

  if (!_.isEmpty(zoomParams)) {
    const zoom = d3
      .zoom()
      .scaleExtent([1, Infinity])
      .translateExtent([
        [0, 0],
        [chartWidth, chartHeight],
      ])
      .on("zoom", function (): void {
        mapObjects.on("mousemove", null).on("mouseover", null);
        d3.select(`#${TOOLTIP_ID}`).style("display", "none");
        map
          .selectAll("path,circle")
          .classed(HOVER_HIGHLIGHTED_CLASS_NAME, false)
          .classed(HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME, false)
          .attr("transform", d3.event.transform);
      })
      .on("end", function (): void {
        zoomParams.onZoomEnd(d3.event.transform);
        mapObjects
          .on(
            "mousemove",
            onMouseMove(canClickRegion, domContainerId, getTooltipHtml)
          )
          .on("mouseover", onMouseOver(canClickRegion, domContainerId));
      });
    svg.call(zoom).call(zoom.transform, zoomParams.startingTransformation);
    if (zoomParams.zoomInButtonId) {
      d3.select(`#${zoomParams.zoomInButtonId}`).on("click", () => {
        svg.call(zoom.scaleBy, 2);
      });
    }
    if (zoomParams.zoomOutButtonId) {
      d3.select(`#${zoomParams.zoomOutButtonId}`).on("click", () => {
        svg.call(zoom.scaleBy, 0.5);
      });
    }
  }
}

const onMouseOver =
  (canClickRegion: (placeDcid: string) => boolean, domContainerId: string) =>
  (e, index): void => {
    const geoProperties = e["properties"];
    mouseHoverAction(
      domContainerId,
      index,
      canClickRegion(geoProperties.geoDcid)
    );
  };

const onMouseOut =
  (domContainerId: string) =>
  (_, index): void => {
    mouseOutAction(domContainerId, index);
  };

const onMouseMove =
  (
    canClickRegion: (placeDcid: string) => boolean,
    domContainerId: string,
    getTooltipHtml: (place: NamedPlace) => string
  ) =>
  (e, index) => {
    const geoProperties = e["properties"];
    const placeDcid = geoProperties.geoDcid;
    mouseHoverAction(domContainerId, index, canClickRegion(placeDcid));
    const place = {
      dcid: placeDcid,
      name: geoProperties.name,
    };
    showTooltip(domContainerId, place, getTooltipHtml);
  };

const onMapClick =
  (
    canClickRegion: (placeDcid: string) => boolean,
    domContainerId: string,
    redirectAction: (properties: GeoJsonFeatureProperties) => void
  ) =>
  (geo: GeoJsonFeature, index) => {
    if (!canClickRegion(geo.properties.geoDcid)) return;
    redirectAction(geo.properties);
    mouseOutAction(domContainerId, index);
  };

function mouseOutAction(domContainerId: string, index: number): void {
  const container = d3.select(domContainerId);
  container.classed(HOVER_HIGHLIGHTED_CLASS_NAME, false);
  container
    .select("#geoPath" + index)
    .classed(HOVER_HIGHLIGHTED_CLASS_NAME, false)
    .classed(HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME, false);
  container.select(`#${TOOLTIP_ID}`).style("display", "none");
}

function mouseHoverAction(
  domContainerId: string,
  index: number,
  canClick: boolean
): void {
  const container = d3
    .select(domContainerId)
    .classed(HOVER_HIGHLIGHTED_CLASS_NAME, true);
  const geoPath = container.select("#geoPath" + index).raise();
  // show highlighted border and show cursor as a pointer
  if (canClick) {
    geoPath.classed(HOVER_HIGHLIGHTED_CLASS_NAME, true);
  } else {
    geoPath.classed(HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME, true);
  }
  // show tooltip
  container.select(`#${TOOLTIP_ID}`).style("display", "block");
}

function addTooltip(domContainerId: string): void {
  d3.select(domContainerId)
    .attr("style", "position: relative")
    .append("div")
    .attr("id", TOOLTIP_ID)
    .attr("style", "position: absolute; display: none; z-index: 10");
}

/**
 * Draw a color scale legend.
 * @param color The d3 linearScale that encodes the color gradient to be
 *        plotted.
 *
 * @return the width of the legend
 */
function generateLegend(
  svg: d3.Selection<SVGElement, any, any, any>,
  height: number,
  color: d3.ScaleLinear<number, number>,
  unit: string
): number {
  // Build a scale from color.domain() to the canvas height (from [height, 0]).
  // NOTE: This assumes the color domain is linear.
  const yScaleRange = [];
  const heightBucket = height / (color.domain().length - 1);
  for (
    let i = 0, currBucket = 0;
    i < color.domain().length;
    i++, currBucket += heightBucket
  ) {
    yScaleRange.unshift(currBucket);
  }
  const yScale = d3.scaleLinear().domain(color.domain()).range(yScaleRange);

  const legend = svg.append("g").attr("class", LEGEND_CLASS_NAME);
  legend
    .append("image")
    .attr("id", "legend-img")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", LEGEND_IMG_WIDTH)
    .attr("height", height)
    .attr("preserveAspectRatio", "none")
    .attr("xlink:href", genScaleImg(color, yScale, height).toDataURL());

  // set tick values to show first tick at the start of the legend and last tick
  // at the very bottom of the legend.
  let tickValues = [yScale.invert(0), yScale.invert(height)];
  const formattedTickValues = tickValues.map((tick) =>
    formatNumber(tick, unit)
  );
  tickValues = tickValues.concat(
    color.ticks(NUM_TICKS).filter((tick) => {
      const formattedTick = formatNumber(tick, unit);
      const tickHeight = yScale(tick);
      return (
        formattedTickValues.indexOf(formattedTick) === -1 &&
        tickHeight > LEGEND_TICK_LABEL_MARGIN &&
        tickHeight < height - LEGEND_TICK_LABEL_MARGIN
      );
    })
  );
  legend
    .append("g")
    .call(
      d3
        .axisRight(yScale)
        .tickSize(TICK_SIZE)
        .tickFormat((d) => {
          return formatNumber(d.valueOf(), unit);
        })
        .tickValues(tickValues)
    )
    .call((g) =>
      g
        .selectAll(".tick line")
        .attr("x2", LEGEND_IMG_WIDTH + LEGEND_MARGIN_RIGHT)
        .attr("fill", AXIS_TEXT_FILL)
        .attr("stroke", AXIS_GRID_FILL)
    )
    .call((g) =>
      g
        .selectAll(".tick text")
        .attr("transform", `translate(${LEGEND_IMG_WIDTH}, 0)`)
    )
    .call((g) => g.select(".domain").remove());

  const legendWidth = legend.node().getBBox().width;
  return legendWidth;
}

/**
 * Generate a svg that contains a color scale legend
 *
 * @param containerId id of the container to draw the legend in
 * @param height height of the legend
 * @param colorScale the color scale to use for the legend
 * @param unit unit of measurement
 * @param marginLeft left margin of the legend
 *
 * @return width of the svg
 */
function generateLegendSvg(
  containerId: string,
  height: number,
  colorScale: d3.ScaleLinear<number, number>,
  unit: string,
  marginLeft: number
): number {
  const svg = d3.select(`#${containerId}`).append("svg");
  const legendWidth =
    generateLegend(svg, height, colorScale, unit) + marginLeft;
  svg
    .attr("width", legendWidth)
    .attr("height", height + TICK_SIZE * 2)
    .select(`.${LEGEND_CLASS_NAME}`)
    .attr("transform", `translate(${marginLeft}, ${TICK_SIZE})`);
  return legendWidth;
}

const genScaleImg = (
  color: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  height: number
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = height;
  const context = canvas.getContext("2d");
  for (let i = 0; i < height; ++i) {
    // yScale maps from color domain values to height values. Therefore, to get
    // the color at a certain height, we want to first get the color domain
    // value for that height and then get the color for that value.
    const colorDomainVal = yScale.invert(i);
    context.fillStyle = color(colorDomainVal) as unknown as string;
    context.fillRect(0, i, 1, 1);
  }
  return canvas;
};

export { drawChoropleth, generateLegendSvg, getColorScale };
