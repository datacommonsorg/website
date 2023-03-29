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
import { geoChamberlin } from "d3-geo-projection";
import * as geo from "geo-albers-usa-territories";
import _, { isMap } from "lodash";

import {
  ASIA_NAMED_TYPED_PLACE,
  EUROPE_NAMED_TYPED_PLACE,
  NORTH_AMERICA_DCID,
  OCEANIA_DCID,
} from "../shared/constants";
import { NamedPlace } from "../shared/types";
import { getPlacePathId } from "./draw_map_utils";
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
const HIGHLIGHTED_CLASS_NAME = "highlighted";
export const HOVER_HIGHLIGHTED_CLASS_NAME = "region-highlighted";
const HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME = "region-highlighted-no-click";
const REGULAR_SCALE_AMOUNT = 1;
const ZOOMED_SCALE_AMOUNT = 0.7;
const MAP_ITEMS_GROUP_ID = "map-items";
const MAP_GEO_REGIONS_ID = "map-geo-regions";
const STARTING_ZOOM_TRANSFORMATION = d3.zoomIdentity.scale(1).translate(0, 0);
const MAP_POLYGON_LAYER_CLASS = "map-polygon-layer";
const MAP_POLYGON_HIGHLIGHT_CLASS = "map-polygon-highlight";
const MAP_PATH_LAYER_CLASS = "map-path-layer";
const MAP_PATH_HIGHLIGHT_CLASS = "map-path-highlight";
const MAP_PATH_STROKE_WIDTH = "1.5px";
const MAP_PATH_OPACITY = "0.5";
const CUSTOM_PROJECTIONS = {};

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
 * @param containerElement div element to show the tooltip in
 * @param place place to show the tooltip for
 * @param getTooltipHtml function to get the html content for the tooltip
 */

function showTooltip(
  containerElement: HTMLDivElement,
  place: NamedPlace,
  getTooltipHtml: (place: NamedPlace) => string
): void {
  const container = d3.select(containerElement);
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
  (
    canClickRegion: (placeDcid: string) => boolean,
    containerElement: HTMLDivElement
  ) =>
  (geo: GeoJsonFeature): void => {
    mouseHoverAction(
      containerElement,
      geo.properties.geoDcid,
      canClickRegion(geo.properties.geoDcid)
        ? HOVER_HIGHLIGHTED_CLASS_NAME
        : HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME
    );
  };

const onMouseOut =
  (containerElement: HTMLDivElement) =>
  (geo: GeoJsonFeature): void => {
    mouseOutAction(containerElement, geo.properties.geoDcid, [
      HOVER_HIGHLIGHTED_CLASS_NAME,
      HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME,
    ]);
    d3.select(containerElement)
      .select(`#${TOOLTIP_ID}`)
      .style("display", "none");
  };

const onMouseMove =
  (
    canClickRegion: (placeDcid: string) => boolean,
    containerElement: HTMLDivElement,
    getTooltipHtml: (place: NamedPlace) => string
  ) =>
  (geo: GeoJsonFeature) => {
    const placeDcid = geo.properties.geoDcid;
    mouseHoverAction(
      containerElement,
      placeDcid,
      canClickRegion(placeDcid)
        ? HOVER_HIGHLIGHTED_CLASS_NAME
        : HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME
    );
    const place = {
      dcid: placeDcid,
      name: geo.properties.name,
    };
    showTooltip(containerElement, place, getTooltipHtml);
  };

const onMapClick =
  (
    canClickRegion: (placeDcid: string) => boolean,
    containerElement: HTMLDivElement,
    redirectAction: (properties: GeoJsonFeatureProperties) => void
  ) =>
  (geo: GeoJsonFeature) => {
    if (!canClickRegion(geo.properties.geoDcid)) return;
    redirectAction(geo.properties);
    mouseOutAction(containerElement, geo.properties.geoDcid, [
      HOVER_HIGHLIGHTED_CLASS_NAME,
      HOVER_HIGHLIGHTED_NO_CLICK_CLASS_NAME,
    ]);
    d3.select(containerElement)
      .select(`#${TOOLTIP_ID}`)
      .style("display", "none");
  };

function mouseOutAction(
  containerElement: HTMLDivElement,
  placeDcid: string,
  hoverClassNames: string[]
): void {
  const container = d3.select(containerElement);
  container.classed(HOVER_HIGHLIGHTED_CLASS_NAME, false);
  const pathSelection = container.select(`#${getPlacePathId(placeDcid)}`);
  for (const className of hoverClassNames) {
    pathSelection.classed(className, false);
  }
  // bring original highlighted region back to the top
  container.select("." + HIGHLIGHTED_CLASS_NAME).raise();
}

function mouseHoverAction(
  containerElement: HTMLDivElement,
  placeDcid: string,
  hoverClassName: string
): void {
  const container = d3
    .select(containerElement)
    .classed(HOVER_HIGHLIGHTED_CLASS_NAME, true);
  container
    .select(`#${getPlacePathId(placeDcid)}`)
    .raise()
    .classed(hoverClassName, true);
}

function addTooltip(containerElement: HTMLDivElement): void {
  d3.select(containerElement)
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
 * @param geoJson the geojson data that will be drawn with this projection
 * @param zoomDcid dcid of a region to zoom in on
 */
export function getProjection(
  isUSAPlace: boolean,
  enclosingPlaceDcid: string,
  mapWidth: number,
  mapHeight: number,
  geoJson: GeoJsonData,
  zoomDcid?: string
): d3.GeoProjection {
  let projection = null;
  let isMapFitted = false;
  switch (enclosingPlaceDcid) {
    case EUROPE_NAMED_TYPED_PLACE.dcid:
      // Reference:
      // https://observablehq.com/@toja/five-map-projections-for-europe#_lambertAzimuthalEqualArea
      projection = d3
        .geoAzimuthalEqualArea()
        .rotate([-20.0, -52.0])
        .translate([mapWidth / 2, mapHeight / 2])
        .scale(mapWidth / 1.5)
        .precision(0.1);
      isMapFitted = true;
      break;
    case ASIA_NAMED_TYPED_PLACE.dcid:
      projection = d3
        .geoEquirectangular()
        .rotate([-85, 0])
        .center([0, 35])
        .translate([mapWidth / 2, mapHeight / 2])
        .scale(mapHeight / 1.5)
        .precision(0.1);
      isMapFitted = true;
      break;
    case NORTH_AMERICA_DCID:
      // Reference:
      // https://observablehq.com/@toja/chamberlins-trimetric-projection-of-north-america
      projection = geoChamberlin([-155, 55], [-35, 55], [-92.5, 10]).precision(
        0.1
      );
      break;
    case OCEANIA_DCID:
      // Reference:
      // https://gist.github.com/rveciana/a5349a84e4a9d5a01e55371806021614
      projection = d3.geoEquirectangular().rotate([-100, 0]).precision(0.1);
      break;
    default:
      projection = isUSAPlace
        ? geo.geoAlbersUsaTerritories()
        : d3.geoEquirectangular();
  }
  const geomap = d3.geoPath().projection(projection);
  if (zoomDcid) {
    const geoJsonFeature = geoJson.features.find(
      (feature) => feature.properties.geoDcid === zoomDcid
    );
    if (geoJsonFeature) {
      fitSize(
        mapWidth,
        mapHeight,
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
      mapWidth,
      mapHeight,
      geoJson,
      projection,
      geomap,
      REGULAR_SCALE_AMOUNT
    );
  }
  return projection;
}

function getValue(
  geo: GeoJsonFeature,
  dataValues: {
    [placeDcid: string]: number;
  }
) {
  // returns undefined if there is no value
  if (
    geo.properties.geoDcid in dataValues &&
    dataValues[geo.properties.geoDcid] !== undefined &&
    dataValues[geo.properties.geoDcid] !== null
  ) {
    return dataValues[geo.properties.geoDcid];
  }
  return undefined;
}

// Adds a layer of geojson features to a map and returns that layer
function addGeoJsonLayer(
  containerElement: HTMLDivElement,
  geoJson: GeoJsonData,
  projection: d3.GeoProjection,
  layerClassName?: string,
  layerId?: string
): d3.Selection<SVGPathElement, GeoJsonFeature, SVGGElement, unknown> {
  // Create the new layer
  const mapObjectsLayer = d3
    .select(containerElement)
    .select(`#${MAP_ITEMS_GROUP_ID}`)
    .append("g");
  if (layerClassName) {
    mapObjectsLayer.attr("class", layerClassName);
  }
  if (layerId) {
    mapObjectsLayer.attr("id", layerId);
  }

  // Add the map objects on the layer
  const geomap = d3.geoPath().projection(projection);
  return mapObjectsLayer
    .selectAll("path")
    .data(geoJson.features)
    .enter()
    .append("path")
    .attr("d", geomap);
}

/**
 * Draws the base d3 map
 * @param containerElement div element to draw the choropleth in
 * @param geoJson the geojson data for drawing choropleth
 * @param chartHeight height for the chart
 * @param chartWidth width for the chart
 * @param dataValues data values for plotting
 * @param colorScale the color scale to use for drawing the map and legend
 * @param redirectAction function that runs when region on map is clicked
 * @param getTooltipHtml function to get the html content for the tooltip
 * @param canClickRegion function to determine if a region on the map is clickable
 * @param shouldShowBoundaryLines whether each region should have boundary lines shown
 * @param projection projection to use for the map
 * @param zoomDcid the dcid of the region to zoom in on when drawing the chart
 * @param zoomParams the parameters needed to add zoom functionality for the map
 */
export function drawD3Map(
  containerElement: HTMLDivElement,
  geoJson: GeoJsonData,
  chartHeight: number,
  chartWidth: number,
  dataValues: {
    [placeDcid: string]: number;
  },
  colorScale: d3.ScaleLinear<number | string, number>,
  redirectAction: (geoDcid: GeoJsonFeatureProperties) => void,
  getTooltipHtml: (place: NamedPlace) => string,
  canClickRegion: (placeDcid: string) => boolean,
  shouldShowBoundaryLines: boolean,
  projection: d3.GeoProjection,
  zoomDcid?: string,
  zoomParams?: MapZoomParams
): void {
  const container = d3.select(containerElement);
  container.selectAll("*").remove();
  // Add svg for the map to the div holding the chart.
  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const map = svg.append("g").attr("id", MAP_ITEMS_GROUP_ID);
  // Build the map objects
  const mapObjects = addGeoJsonLayer(
    containerElement,
    geoJson,
    projection,
    "",
    MAP_GEO_REGIONS_ID
  );
  mapObjects
    .attr("class", (geo: GeoJsonFeature) => {
      // highlight the place of the current page
      if (
        geo.properties.geoDcid === geoJson.properties.current_geo ||
        geo.properties.geoDcid === zoomDcid
      ) {
        return HIGHLIGHTED_CLASS_NAME;
      }
      if (getValue(geo, dataValues) === undefined) {
        return "missing-data";
      }
    })
    .attr("fill", (d: GeoJsonFeature) => {
      const value = getValue(d, dataValues);
      if (value) {
        return colorScale(value);
      } else {
        return MISSING_DATA_COLOR;
      }
    })
    .attr("id", (d: GeoJsonFeature) => {
      return getPlacePathId(d.properties.geoDcid);
    })
    .on("mouseover", onMouseOver(canClickRegion, containerElement))
    .on("mouseout", onMouseOut(containerElement))
    .on(
      "mousemove",
      onMouseMove(canClickRegion, containerElement, getTooltipHtml)
    );
  if (shouldShowBoundaryLines) {
    mapObjects
      .attr("stroke-width", STROKE_WIDTH)
      .attr("stroke", GEO_STROKE_COLOR);
  }
  mapObjects.on(
    "click",
    onMapClick(canClickRegion, containerElement, redirectAction)
  );

  // style highlighted region and bring to the front
  d3.select(containerElement)
    .select("." + HIGHLIGHTED_CLASS_NAME)
    .raise()
    .attr("stroke-width", HIGHLIGHTED_STROKE_WIDTH)
    .attr("stroke", HIGHLIGHTED_STROKE_COLOR);
  addTooltip(containerElement);

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
            onMouseMove(canClickRegion, containerElement, getTooltipHtml)
          )
          .on("mouseover", onMouseOver(canClickRegion, containerElement));
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
 * @param containerElement the div element holding the map to add points to
 * @param mapPoints list of MapPoints to add
 * @param mapPointValues data values for the map points
 * @param projection geo projection used by the map
 * @param getPointColor function to get the color for each map point
 * @param getTooltipHtml function to get the html content for the tooltip
 * @param minDotRadius smallest radius to use for the map points
 */
export function addMapPoints(
  containerElement: HTMLDivElement,
  mapPoints: Array<MapPoint>,
  mapPointValues: { [placeDcid: string]: number },
  projection: d3.GeoProjection,
  getPointColor?: (point: MapPoint) => string,
  getTooltipHtml?: (place: NamedPlace) => string,
  minDotRadius?: number
): d3.Selection<SVGCircleElement, MapPoint, SVGGElement, unknown> {
  let minDotSize = minDotRadius;
  // It is an expensive function to read all the lengths of the regions on the
  // d3 map so only calculate minDotSize if it's not passed in as an argument.
  if (!minDotSize) {
    // get the smallest diagonal length of a region on the d3 map.
    let minRegionDiagonal = Number.MAX_VALUE;
    d3.select(containerElement)
      .select(`#${MAP_GEO_REGIONS_ID}`)
      .selectAll("path")
      .each((_, idx, paths) => {
        const pathClientRect = (
          paths[idx] as SVGPathElement
        ).getBoundingClientRect();
        minRegionDiagonal = Math.sqrt(
          Math.pow(pathClientRect.height, 2) + Math.pow(pathClientRect.width, 2)
        );
      });
    minDotSize = Math.max(minRegionDiagonal * 0.02, 1.1);
  }
  const filteredMapPoints = mapPoints.filter((point) => {
    const projectedPoint = projection([point.longitude, point.latitude]);
    return (
      projectedPoint &&
      !_.isNaN(projectedPoint[0]) &&
      !_.isNaN(projectedPoint[1])
    );
  });
  let pointSizeScale = null;
  if (!_.isEmpty(mapPointValues)) {
    pointSizeScale = d3
      .scaleLinear()
      .domain(d3.extent(Object.values(mapPointValues)))
      .range([minDotSize, minDotSize * 3]);
  }
  const mapPointsLayer = d3
    .select(containerElement)
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
      if (_.isEmpty(pointSizeScale) || !mapPointValues[point.placeDcid]) {
        return minDotSize;
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
        showTooltip(containerElement, place, getTooltipHtml);
      })
      .on("mouseout", () => {
        d3.select(containerElement)
          .select(`#${TOOLTIP_ID}`)
          .style("display", "none");
      });
  }
  return mapPointsLayer;
}

/**
 * Adds a layer of polygons on top of a map
 * @param containerElement
 * @param geoJson
 * @param projection
 * @param getRegionColor
 * @param onClick
 */
export function addPolygonLayer(
  containerElement: HTMLDivElement,
  geoJson: GeoJsonData,
  projection: d3.GeoProjection,
  getRegionColor: (geoDcid: string) => string,
  onClick: (geoFeature: GeoJsonFeature) => void
): void {
  // Build the map objects
  const mapObjects = addGeoJsonLayer(
    containerElement,
    geoJson,
    projection,
    MAP_POLYGON_LAYER_CLASS
  );
  mapObjects
    .attr("fill", (d: GeoJsonFeature) => {
      return getRegionColor(d.properties.geoDcid);
    })
    .attr("id", (d: GeoJsonFeature) => {
      return getPlacePathId(d.properties.geoDcid);
    })
    .on("mouseover", (d: GeoJsonFeature) => {
      mouseHoverAction(
        containerElement,
        d.properties.geoDcid,
        MAP_POLYGON_HIGHLIGHT_CLASS
      );
    })
    .on("mouseout", (d: GeoJsonFeature) => {
      mouseOutAction(containerElement, d.properties.geoDcid, [
        MAP_POLYGON_HIGHLIGHT_CLASS,
      ]);
    })
    .on("click", onClick);
}

/**
 * Adds a layer of paths on top of a map
 * @param containerElement
 * @param geoJson
 * @param projection
 * @param getRegionColor
 * @param onClick
 */
export function addPathLayer(
  containerElement: HTMLDivElement,
  geoJson: GeoJsonData,
  projection: d3.GeoProjection,
  getRegionColor: (geoDcid: string) => string,
  onClick: (feature: GeoJsonFeature) => void
): void {
  // Build map objects.
  const mapObjects = addGeoJsonLayer(
    containerElement,
    geoJson,
    projection,
    MAP_PATH_LAYER_CLASS
  );
  mapObjects
    .attr("id", (d: GeoJsonFeature) => {
      return getPlacePathId(d.properties.geoDcid);
    })
    .attr("stroke-width", MAP_PATH_STROKE_WIDTH)
    .attr("stroke", (d: GeoJsonFeature) => {
      return getRegionColor(d.properties.geoDcid);
    })
    .attr("opacity", MAP_PATH_OPACITY)
    .on("mouseover", (d: GeoJsonFeature) => {
      mouseHoverAction(
        containerElement,
        d.properties.geoDcid,
        MAP_PATH_HIGHLIGHT_CLASS
      );
    })
    .on("mouseout", (d: GeoJsonFeature) => {
      mouseOutAction(containerElement, d.properties.geoDcid, [
        MAP_PATH_HIGHLIGHT_CLASS,
      ]);
    })
    .on("click", onClick);
}
