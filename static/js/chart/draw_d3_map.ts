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

import {
  ASIA_NAMED_TYPED_PLACE,
  EUROPE_NAMED_TYPED_PLACE,
} from "../shared/constants";
import { NamedPlace } from "../shared/types";
import { generateLegend, getPlacePathId } from "./draw_map_utils";
import {
  GeoJsonData,
  GeoJsonFeature,
  GeoJsonFeatureProperties,
  MapPoint,
} from "./types";

/**
 * Information used for the zoom functionality on a map
 *
 * @param zoomInButtonId id of a button that can be clicked to zoom in
 * @param zoomOutButtonId id of a button that can be clicked to zoom out
 */
export interface MapZoomParams {
  zoomInButtonId: string;
  zoomOutButtonId: string;
}

const MISSING_DATA_COLOR = "#999";
const DOT_COLOR = "black";
const TOOLTIP_ID = "tooltip";
const GEO_STROKE_COLOR = "#fff";
const HIGHLIGHTED_STROKE_COLOR = "#202020";
const STROKE_WIDTH = "0.5px";
const HIGHLIGHTED_STROKE_WIDTH = "1.25px";
const TICK_SIZE = 6;
const LEGEND_MARGIN_TOP = 4;
const LEGEND_MARGIN_BOTTOM = TICK_SIZE;
const HIGHLIGHTED_CLASS_NAME = "highlighted";
export const HOVER_HIGHLIGHTED_CLASS_NAME = "region-highlighted";
const HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME = "region-highlighted-no-click";
const REGULAR_SCALE_AMOUNT = 1;
const ZOOMED_SCALE_AMOUNT = 0.7;
const LEGEND_CLASS_NAME = "legend";
const MAP_ITEMS_GROUP_ID = "map-items";
const MAP_GEO_REGIONS_ID = "map-geo-regions";
const STARTING_ZOOM_TRANSFORMATION = d3.zoomIdentity.scale(1).translate(0, 0);

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
  const container = d3.select(`#${domContainerId}`);
  const tooltipSelect = container
    .select(`#${TOOLTIP_ID}`)
    .style("display", "block");
  const tooltipHtml = getTooltipHtml(place);
  if (!tooltipHtml) {
    return;
  }
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

const onMouseOver =
  (canClickRegion: (placeDcid: string) => boolean, domContainerId: string) =>
  (geo: GeoJsonFeature): void => {
    mouseHoverAction(
      domContainerId,
      geo.properties.geoDcid,
      canClickRegion(geo.properties.geoDcid)
    );
  };

const onMouseOut =
  (domContainerId: string) =>
  (geo: GeoJsonFeature): void => {
    mouseOutAction(domContainerId, geo.properties.geoDcid);
  };

const onMouseMove =
  (
    canClickRegion: (placeDcid: string) => boolean,
    domContainerId: string,
    getTooltipHtml: (place: NamedPlace) => string
  ) =>
  (geo: GeoJsonFeature) => {
    const placeDcid = geo.properties.geoDcid;
    mouseHoverAction(domContainerId, placeDcid, canClickRegion(placeDcid));
    const place = {
      dcid: placeDcid,
      name: geo.properties.name,
    };
    showTooltip(domContainerId, place, getTooltipHtml);
  };

const onMapClick =
  (
    canClickRegion: (placeDcid: string) => boolean,
    domContainerId: string,
    redirectAction: (properties: GeoJsonFeatureProperties) => void
  ) =>
  (geo: GeoJsonFeature) => {
    if (!canClickRegion(geo.properties.geoDcid)) return;
    redirectAction(geo.properties);
    mouseOutAction(domContainerId, geo.properties.geoDcid);
  };

function mouseOutAction(domContainerId: string, placeDcid: string): void {
  const container = d3.select(`#${domContainerId}`);
  container.classed(HOVER_HIGHLIGHTED_CLASS_NAME, false);
  container
    .select(`#${getPlacePathId(placeDcid)}`)
    .classed(HOVER_HIGHLIGHTED_CLASS_NAME, false)
    .classed(HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME, false);
  container.select(`#${TOOLTIP_ID}`).style("display", "none");
}

function mouseHoverAction(
  domContainerId: string,
  placeDcid: string,
  canClick: boolean
): void {
  const container = d3
    .select(`#${domContainerId}`)
    .classed(HOVER_HIGHLIGHTED_CLASS_NAME, true);
  const geoPath = container.select(`#${getPlacePathId(placeDcid)}`).raise();
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
  d3.select(`#${domContainerId}`)
    .attr("style", "position: relative")
    .append("div")
    .attr("id", TOOLTIP_ID)
    .attr("style", "position: absolute; display: none; z-index: 10");
}

/**
 * Get the projection to use for drawing a map
 * @param isUSAPlace whether or not the map is of the USA
 * @param enclosingPlaceDcid the enclosing place of the map
 * @param mapWidth the width of the map
 * @param mapHeight the height of the map
 * @returns
 */
export function getProjection(
  isUSAPlace: boolean,
  enclosingPlaceDcid: string,
  mapWidth: number,
  mapHeight: number
): d3.GeoProjection {
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
      .translate([mapWidth / 2, mapHeight / 2])
      .scale(mapWidth / 1.5)
      .precision(0.1);
  } else if (isAsia) {
    // Reference:
    // https://stackoverflow.com/questions/39958471/d3-js-map-with-albers-projection-how-to-rotate-it/41133970#41133970
    projection
      .rotate([-85, 0])
      .center([0, 35])
      .translate([mapWidth / 2, mapHeight / 2])
      .scale(mapHeight / 1.5)
      .precision(0.1);
  }
  return projection;
}

/**
 * Draws the base d3 map
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
 * @param enclosingPlaceDcid DCID of enclosing place that might have special projections
 * @param zoomDcid the dcid of the region to zoom in on when drawing the chart
 * @param zoomParams the parameters needed to add zoom functionality for the map
 */
export function drawD3Map(
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
  projection: d3.GeoProjection,
  enclosingPlaceDcid?: string, // DCID of enclosing place that might have special projections
  zoomDcid?: string,
  zoomParams?: MapZoomParams
): void {
  // Add svg for the map to the div holding the chart.
  const svg = d3
    .select(`#${containerId}`)
    .append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const map = svg.append("g").attr("id", MAP_ITEMS_GROUP_ID);

  // Combine path elements from D3 content.
  const mapRegionsLayer = map
    .append("g")
    .attr("class", "map-regions")
    .attr("id", MAP_GEO_REGIONS_ID)
    .selectAll("path")
    .data(geoJson.features);

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
  const isEurope = enclosingPlaceDcid == EUROPE_NAMED_TYPED_PLACE.dcid;
  const isAsia = enclosingPlaceDcid == ASIA_NAMED_TYPED_PLACE.dcid;
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
    .attr("id", (d: GeoJsonFeature) => {
      return getPlacePathId(d.properties.geoDcid);
    })
    .on("mouseover", onMouseOver(canClickRegion, containerId))
    .on("mouseout", onMouseOut(containerId))
    .on("mousemove", onMouseMove(canClickRegion, containerId, getTooltipHtml));
  if (shouldShowBoundaryLines) {
    mapObjects
      .attr("stroke-width", STROKE_WIDTH)
      .attr("stroke", GEO_STROKE_COLOR);
  }
  mapObjects.on(
    "click",
    onMapClick(canClickRegion, containerId, redirectAction)
  );

  // style highlighted region and bring to the front
  d3.select(`#${containerId}`)
    .select("." + HIGHLIGHTED_CLASS_NAME)
    .raise()
    .attr("stroke-width", HIGHLIGHTED_STROKE_WIDTH)
    .attr("stroke", HIGHLIGHTED_STROKE_COLOR);
  addTooltip(containerId);

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
        mapObjects
          .on(
            "mousemove",
            onMouseMove(canClickRegion, containerId, getTooltipHtml)
          )
          .on("mouseover", onMouseOver(canClickRegion, containerId));
      });
    svg.call(zoom).call(zoom.transform, STARTING_ZOOM_TRANSFORMATION);
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

/**
 * Adds a layer of map points to a map and returns that layer
 * @param domContainerId id of the container holding the map to add points to
 * @param mapPoints list of MapPoints to add
 * @param mapPointValues data values for the map points
 * @param projection geo projection used by the map
 * @param getPointColor function to get the color for each map point
 * @param getTooltipHtml function to get the html content for the tooltip
 */
export function addMapPoints(
  domContainerId: string,
  mapPoints: Array<MapPoint>,
  mapPointValues: { [placeDcid: string]: number },
  projection: d3.GeoProjection,
  getPointColor?: (point: MapPoint) => string,
  getTooltipHtml?: (place: NamedPlace) => string
): d3.Selection<SVGCircleElement, MapPoint, SVGGElement, unknown> {
  // get the smallest diagonal length of a region on the d3 map.
  let minRegionDiagonal = Number.MAX_VALUE;
  d3.select(`#${MAP_GEO_REGIONS_ID}`)
    .selectAll("path")
    .each((_, idx, paths) => {
      const pathClientRect = (
        paths[idx] as SVGPathElement
      ).getBoundingClientRect();
      minRegionDiagonal = Math.sqrt(
        Math.pow(pathClientRect.height, 2) + Math.pow(pathClientRect.width, 2)
      );
    });
  const minDotSize = Math.max(minRegionDiagonal * 0.02, 1.1);
  const filteredMapPoints = mapPoints.filter((point) => {
    return !_.isNull(projection([point.longitude, point.latitude]));
  });
  let pointSizeScale = null;
  if (!_.isEmpty(mapPointValues)) {
    pointSizeScale = d3
      .scaleLinear()
      .domain(d3.extent(Object.values(mapPointValues)))
      .range([minDotSize, minDotSize * 3]);
  }
  const mapPointsLayer = d3
    .select(`#${MAP_ITEMS_GROUP_ID}`)
    .append("g")
    .attr("class", "map-points-layer")
    .selectAll("circle")
    .data(filteredMapPoints)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("fill", (d) => {
      if (getPointColor) {
        return getPointColor(d);
      } else if (d.placeDcid in mapPointValues) {
        return DOT_COLOR;
      } else {
        return MISSING_DATA_COLOR;
      }
    })
    .attr("cx", (point: MapPoint) => {
      return projection([point.longitude, point.latitude])[0];
    })
    .attr(
      "cy",
      (point: MapPoint) => projection([point.longitude, point.latitude])[1]
    )
    .attr("r", (point: MapPoint) => {
      if (
        _.isEmpty(pointSizeScale) ||
        !mapPointValues[point.placeDcid]
      ) {
        return minDotSize * 2;
      }
      return pointSizeScale(mapPointValues[point.placeDcid]);
    });
  if (getTooltipHtml) {
    mapPointsLayer
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
  return mapPointsLayer;
}
