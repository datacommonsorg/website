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
import { EARTH_NAMED_TYPED_PLACE } from "../shared/constants";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { NamedPlace } from "../shared/types";
import { getColorFn } from "./base";
import {
  GeoJsonData,
  GeoJsonFeature,
  GeoJsonFeatureProperties,
  MapPoint,
} from "./types";

const MISSING_DATA_COLOR = "#999";
const DOT_COLOR = "black";
const TOOLTIP_ID = "tooltip";
const MIN_COLOR = "#f0f0f0";
const GEO_STROKE_COLOR = "#fff";
const HIGHLIGHTED_STROKE_COLOR = "#202020";
const STROKE_WIDTH = "1px";
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
const REGULAR_SCALE_AMOUNT = 1;
const ZOOMED_SCALE_AMOUNT = 0.7;
const LEGEND_CLASS_NAME = "legend";
const MAP_ITEMS_GROUP_ID = "map-items";

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

/** Generates a color scale to be used for drawing choropleth map and legend.
 *
 * @param statVar name of the stat var we are drawing choropleth for
 * @param dataValues the values we are using to plot our choropleth
 */
function getColorScale(
  statVar: string,
  dataValues: {
    [placeDcid: string]: number;
  }
): d3.ScaleLinear<number, number> {
  const label = getStatsVarLabel(statVar);
  const maxColor = d3.color(getColorFn([label])(label));
  const extent = d3.extent(Object.values(dataValues));
  const medianValue = d3.median(Object.values(dataValues));
  return d3
    .scaleLinear()
    .domain([extent[0], medianValue, extent[1]])
    .nice()
    .range(([
      MIN_COLOR,
      maxColor,
      maxColor.darker(Math.min(extent[1] / medianValue, 1.5)),
    ] as unknown) as number[])
    .interpolate(
      (d3.interpolateHslLong as unknown) as (
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
  const offset = 5;
  const leftOffset = offset;
  const topOffset = -tooltipHeight - offset;
  const left = Math.min(
    d3.event.offsetX + leftOffset,
    containerWidth - tooltipWidth
  );
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
  getTooltipHtml: (place: NamedPlace) => string
): void {
  const filteredMapPoints = mapPoints.filter(
    (point) => !_.isNull(projection([point.longitude, point.latitude]))
  );
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
    .attr("cy", (point) => projection([point.longitude, point.latitude])[1])
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
 * @param enclosingPlaceDcid dcid of the enclosing place we are drawing choropleth for
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
 * @param mapPoints list of points to add onto the map
 * @param mapPointValues data values for the map points
 * @param zoomDcid the dcid of the region to zoom in on when drawing the chart
 * @param zoomInButtonId the id of the zoom in button
 * @param zoomOutButtonId the id of the zoom out button
 */
function drawChoropleth(
  containerId: string,
  enclosingPlaceDcid: string,
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
  mapPoints?: Array<MapPoint>,
  mapPointValues?: { [placeDcid: string]: number },
  zoomDcid?: string,
  zoomInButtonId?: string,
  zoomOutButtonId?: string
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

  const projection =
    enclosingPlaceDcid == EARTH_NAMED_TYPED_PLACE.dcid
      ? d3.geoEquirectangular()
      : geo.geoAlbersUsaTerritories();
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
  let isMapFitted = false;
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
    addMapPoints(
      domContainerId,
      mapPoints,
      mapPointValues,
      projection,
      getTooltipHtml
    );
  }

  if (zoomInButtonId || zoomOutButtonId) {
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
          .classed("region-highlighted", false)
          .attr("transform", d3.event.transform);
      })
      .on("end", function (): void {
        mapObjects
          .on(
            "mousemove",
            onMouseMove(canClickRegion, domContainerId, getTooltipHtml)
          )
          .on("mouseover", onMouseOver(canClickRegion, domContainerId));
      });
    svg.call(zoom);
    if (zoomInButtonId) {
      d3.select(`#${zoomInButtonId}`).on("click", () => {
        svg.call(zoom.scaleBy, 2);
      });
    }
    if (zoomOutButtonId) {
      d3.select(`#${zoomOutButtonId}`).on("click", () => {
        svg.call(zoom.scaleBy, 0.5);
      });
    }
  }
}

const onMouseOver = (
  canClickRegion: (placeDcid: string) => boolean,
  domContainerId: string
) => (e, index): void => {
  const geoProperties = e["properties"];
  mouseHoverAction(
    domContainerId,
    index,
    canClickRegion(geoProperties.geoDcid)
  );
};

const onMouseOut = (domContainerId: string) => (_, index): void => {
  mouseOutAction(domContainerId, index);
};

const onMouseMove = (
  canClickRegion: (placeDcid: string) => boolean,
  domContainerId: string,
  getTooltipHtml: (place: NamedPlace) => string
) => (e, index) => {
  const geoProperties = e["properties"];
  const placeDcid = geoProperties.geoDcid;
  mouseHoverAction(domContainerId, index, canClickRegion(placeDcid));
  const place = {
    dcid: placeDcid,
    name: geoProperties.name,
  };
  showTooltip(domContainerId, place, getTooltipHtml);
};

const onMapClick = (
  canClickRegion: (placeDcid: string) => boolean,
  domContainerId: string,
  redirectAction: (properties: GeoJsonFeatureProperties) => void
) => (geo: GeoJsonFeature, index) => {
  if (!canClickRegion(geo.properties.geoDcid)) return;
  redirectAction(geo.properties);
  mouseOutAction(domContainerId, index);
};

function mouseOutAction(domContainerId: string, index: number): void {
  const container = d3.select(domContainerId);
  container.select("#geoPath" + index).classed("region-highlighted", false);
  container.select(`#${TOOLTIP_ID}`).style("display", "none");
}

function mouseHoverAction(
  domContainerId: string,
  index: number,
  canClick: boolean
): void {
  const container = d3.select(domContainerId);
  // show highlighted border and show cursor as a pointer
  if (canClick) {
    container.select("#geoPath" + index).classed("region-highlighted", true);
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
  const n = Math.min(color.domain().length, color.range().length);

  const legend = svg.append("g").attr("class", LEGEND_CLASS_NAME);
  legend
    .append("image")
    .attr("id", "legend-img")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", LEGEND_IMG_WIDTH)
    .attr("height", height)
    .attr("preserveAspectRatio", "none")
    .attr(
      "xlink:href",
      genScaleImg(
        color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))
      ).toDataURL()
    );

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(color.domain()))
    .range([0, height]);
  // set tick values to show first tick at the start of the legend and last tick
  // at the very bottom of the legend.
  let tickValues = [yScale.invert(0), yScale.invert(height)];
  tickValues = tickValues.concat(
    color.ticks(NUM_TICKS).filter((tick) => {
      const formattedTickValues = tickValues.map((tick) =>
        formatNumber(tick, unit)
      );
      return formattedTickValues.indexOf(formatNumber(tick)) === -1;
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

/** Generate a svg that contains a color scale legend
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
  n = 256
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = n;
  const context = canvas.getContext("2d");
  for (let i = 0; i < n; ++i) {
    context.fillStyle = (color(i / (n - 1)) as unknown) as string;
    context.fillRect(0, i, 1, 1);
  }
  return canvas;
};

export { drawChoropleth, generateLegendSvg, getColorScale };
