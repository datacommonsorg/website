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
 * Component for rendering a map type tile.
 */

import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { VisType } from "../../apps/visualization/vis_type_configs";
import {
  addPolygonLayer,
  combineGeoJsons,
  drawD3Map,
  getProjection,
  MapZoomParams,
} from "../../chart/draw_d3_map";
import { generateLegendSvg, getColorScale } from "../../chart/draw_map_utils";
import { GeoJsonData } from "../../chart/types";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { BORDER_STROKE_COLOR } from "../../constants/map_constants";
import { formatNumber } from "../../i18n/i18n";
import { USA_PLACE_DCID } from "../../shared/constants";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import {
  DataPointMetadata,
  NamedPlace,
  NamedTypedPlace,
  StatVarSpec,
} from "../../shared/types";
import {
  getCappedStatVarDate,
  loadSpinner,
  removeSpinner,
} from "../../shared/util";
import {
  getGeoJsonDataFeatures,
  getPlaceChartData,
  MANUAL_GEOJSON_DISTANCES,
  shouldShowBorder,
} from "../../tools/map/util";
import {
  isChildPlaceOf,
  shouldShowMapBoundaries,
} from "../../tools/shared_util";
import {
  getContextStatVar,
  getHash,
} from "../../utils/app/visualization_utils";
import { stringifyFn } from "../../utils/axios";
import { mapDataToCsv } from "../../utils/chart_csv_utils";
import { getPointWithin, getSeriesWithin } from "../../utils/data_fetch_utils";
import { getDateRange } from "../../utils/string_utils";
import {
  getDenomInfo,
  getNoDataErrorMsg,
  getStatFormat,
  ReplacementStrings,
  showError,
} from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { ContainedInPlaceSingleVariableDataSpec } from "./tile_types";
import { useDrawOnResize } from "./use_draw_on_resize";

const ZOOM_IN_BUTTON_ID = "zoom-in-button";
const ZOOM_OUT_BUTTON_ID = "zoom-out-button";

export interface MapTilePropType {
  // API root
  apiRoot?: string;
  // Colors to use
  colors?: string[];
  // Extra classes to add to the container.
  className?: string;
  // Specs of places and stat vars to plot as a layer.
  // If provided, supersedes places, enclosedPlaceType, and statVarSpec.
  // TODO: Make dataSpec required and deprecate places, enclosedPlaceType,
  //       and statVarSpec.
  // TODO: Convert other tiles to using dataSpec.
  // TODO: Expand options of types for DataSpec
  dataSpecs?: ContainedInPlaceSingleVariableDataSpec[];
  // Type of child places to show within the parent place.
  enclosedPlaceType: string;
  // text to show in footer of tile
  footnote?: string;
  id: string;
  // Parent places of the current place showing map for
  parentPlaces?: NamedPlace[];
  // Specific place to show data for
  place: NamedTypedPlace;
  statVarSpec: StatVarSpec;
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  // Title of the chart
  title: string;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  // Whether or not to show a loading spinner when fetching data.
  showLoadingSpinner?: boolean;
  // Whether or not to allow zoom in and out of the map
  allowZoom?: boolean;
  // The property to use to get place names.
  placeNameProp?: string;
  // The property to use to get geojsons.
  geoJsonProp?: string;
  // Chart subtitle
  subtitle?: string;
}

// Api responses associated with a single layer of the map
interface RawData {
  borderGeoJson?: GeoJsonData;
  enclosedPlaceType: string;
  geoJson: GeoJsonData;
  parentPlaces: NamedTypedPlace[];
  place: NamedTypedPlace;
  placeStat: PointApiResponse;
  population: SeriesApiResponse;
}

// Geojson and metadata for the place of a single layer of the map
interface PlaceData {
  borderGeoJson?: GeoJsonData;
  enclosedPlaceType: string;
  geoJson: GeoJsonData;
  place: NamedTypedPlace;
  showMapBoundaries: boolean;
}

export interface MapChartData {
  dataValues: { [dcid: string]: number };
  dateRange: string;
  errorMsg: string;
  // Whether all places to show are contained in the US
  // Determines whether or not to use US-specific projection
  isUsaPlace: boolean;
  metadata: { [dcid: string]: DataPointMetadata };
  // geoJsons and metadata for each layer to draw
  placeData: PlaceData[];
  // props used when fetching this data
  props: MapTilePropType;
  sources: Set<string>;
  // statVarDcid -> unit display string
  units: { [dcid: string]: string };
}

export function MapTile(props: MapTilePropType): JSX.Element {
  const svgContainer = useRef<HTMLDivElement>(null);
  const errorMsgContainer = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const legendContainer = useRef<HTMLDivElement>(null);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );
  const [svgHeight, setSvgHeight] = useState(null);
  const zoomParams = props.allowZoom
    ? {
        zoomInButtonId: `${ZOOM_IN_BUTTON_ID}-${props.id}`,
        zoomOutButtonId: `${ZOOM_OUT_BUTTON_ID}-${props.id}`,
      }
    : null;
  const showZoomButtons =
    !!zoomParams && !!mapChartData && _.isEqual(mapChartData.props, props);

  useEffect(() => {
    if (_.isEmpty(mapChartData) || !_.isEqual(mapChartData.props, props)) {
      loadSpinner(props.id);
      (async () => {
        const data = await fetchData(props);
        if (data && props && _.isEqual(data.props, props)) {
          setMapChartData(data);
        }
      })();
    } else if (!!mapChartData && _.isEqual(mapChartData.props, props)) {
      draw(
        mapChartData,
        props,
        svgContainer.current,
        legendContainer.current,
        mapContainer.current,
        errorMsgContainer.current
      );
      removeSpinner(props.id);
    }
  }, [mapChartData, props, svgContainer, legendContainer, mapContainer]);

  useEffect(() => {
    let svgHeight = props.svgChartHeight;
    if (svgContainer.current) {
      svgHeight = Math.max(
        svgContainer.current.offsetHeight,
        props.svgChartHeight
      );
    }
    setSvgHeight(svgHeight);
  }, [props]);

  const drawFn = useCallback(() => {
    if (_.isEmpty(mapChartData) || !_.isEqual(mapChartData.props, props)) {
      return;
    }
    draw(
      mapChartData,
      props,
      svgContainer.current,
      legendContainer.current,
      mapContainer.current,
      errorMsgContainer.current,
      null,
      zoomParams
    );
  }, [props, mapChartData, svgContainer, legendContainer, mapContainer]);
  useDrawOnResize(drawFn, svgContainer.current);

  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      subtitle={props.subtitle}
      sources={mapChartData && mapChartData.sources}
      replacementStrings={
        mapChartData && getReplacementStrings(props, mapChartData)
      }
      className={`${props.className} map-chart`}
      allowEmbed={true}
      getDataCsv={
        mapChartData
          ? () =>
              mapDataToCsv(
                mapChartData.placeData.map((place) => place.geoJson),
                mapChartData.dataValues
              )
          : null
      }
      isInitialLoading={_.isNull(mapChartData)}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
      hasErrorMsg={!_.isEmpty(mapChartData) && !!mapChartData.errorMsg}
      footnote={props.footnote}
    >
      {showZoomButtons && !mapChartData.errorMsg && (
        <div className="map-zoom-button-section">
          <div id={zoomParams.zoomInButtonId} className="map-zoom-button">
            <i className="material-icons">add</i>
          </div>
          <div id={zoomParams.zoomOutButtonId} className="map-zoom-button">
            <i className="material-icons">remove</i>
          </div>
        </div>
      )}
      <div
        id={props.id}
        className="svg-container"
        ref={svgContainer}
        style={{ minHeight: svgHeight }}
      >
        <div className="error-msg" ref={errorMsgContainer}></div>
        <div className="map" ref={mapContainer}></div>
        <div
          className="legend"
          {...{ part: "legend" }}
          ref={legendContainer}
        ></div>
        {props.showLoadingSpinner && (
          <div className="screen">
            <div id="spinner"></div>
          </div>
        )}
      </div>
    </ChartTileContainer>
  );
}

// Get the ReplacementStrings object used for formatting the title
export function getReplacementStrings(
  props: MapTilePropType,
  chartData: MapChartData
): ReplacementStrings {
  const placeName = !props.dataSpecs
    ? props.place.name
    : chartData.placeData.map((placeData) => placeData.place.name).join(", ");
  return {
    placeName,
    date: chartData && chartData.dateRange,
  };
}

/**
 * Get DataSpec formatted object if not provided in props
 * @param props map tile props
 */
function getDataSpec(
  props: MapTilePropType
): ContainedInPlaceSingleVariableDataSpec[] {
  if (!_.isEmpty(props.dataSpecs)) {
    return props.dataSpecs;
  }

  return [
    {
      enclosedPlaceType: props.enclosedPlaceType,
      parentPlace: props.place.dcid,
      variable: props.statVarSpec,
    },
  ];
}

export const fetchData = async (
  props: MapTilePropType
): Promise<MapChartData> => {
  const layers = getDataSpec(props);
  if (_.isEmpty(layers)) {
    removeSpinner(props.id);
    return null;
  }
  const rawDataArray = [];
  for (const layer of layers) {
    const place = props.dataSpecs
      ? { name: "", dcid: layer.parentPlace, types: [] }
      : props.place;
    const geoJsonParams = {
      placeDcid: layer.parentPlace,
      placeType: layer.enclosedPlaceType,
    };
    if (props.placeNameProp) {
      geoJsonParams["placeNameProp"] = props.placeNameProp;
    }
    if (props.geoJsonProp) {
      geoJsonParams["geoJsonProp"] = props.geoJsonProp;
    }
    const geoJsonPromise = axios
      .get(`${props.apiRoot || ""}/api/choropleth/geojson`, {
        params: geoJsonParams,
        paramsSerializer: stringifyFn,
      })
      .then((resp) => resp.data);
    const borderGeoJsonPromise = axios
      .post(`${props.apiRoot || ""}/api/choropleth/node-geojson`, {
        geoJsonProp: "geoJsonCoordinates",
        nodes: [layer.parentPlace],
      })
      .then((resp) => resp.data);
    const dataDate =
      layer.variable.date || getCappedStatVarDate(layer.variable.statVar);
    const facetIds = layer.variable.facetId ? [layer.variable.facetId] : null;
    const placeStatPromise: Promise<PointApiResponse> = getPointWithin(
      props.apiRoot,
      layer.enclosedPlaceType,
      layer.parentPlace,
      [layer.variable.statVar],
      dataDate,
      [],
      facetIds
    );
    const populationPromise: Promise<SeriesApiResponse> = layer.variable.denom
      ? getSeriesWithin(
          props.apiRoot,
          layer.parentPlace,
          layer.enclosedPlaceType,
          [layer.variable.denom]
        )
      : Promise.resolve(null);
    const parentPlacesPromise = props.parentPlaces
      ? Promise.resolve(props.parentPlaces)
      : axios
          .get(
            `${props.apiRoot || ""}/api/place/parent?dcid=${layer.parentPlace}`
          )
          .then((resp) => resp.data);
    try {
      const [geoJson, placeStat, population, parentPlaces, borderGeoJsonData] =
        await Promise.all([
          geoJsonPromise,
          placeStatPromise,
          populationPromise,
          parentPlacesPromise,
          borderGeoJsonPromise,
        ]);
      // Only draw borders for containing places without 'wall to wall' coverage
      const borderGeoJson = shouldShowBorder(layer.enclosedPlaceType)
        ? borderGeoJsonData
        : undefined;
      const rawData = {
        borderGeoJson,
        enclosedPlaceType: layer.enclosedPlaceType,
        geoJson,
        parentPlaces,
        place,
        placeStat,
        population,
      };
      rawDataArray.push(rawData);
    } catch (error) {
      removeSpinner(props.id);
      return null;
    }
  }
  // For now, all layers will use variable from first layer
  // TODO: Expand to mulitple variables
  return rawToChart(rawDataArray, layers[0].variable, props);
};

function rawToChart(
  rawDataArray: RawData[],
  statVarSpec: StatVarSpec,
  props: MapTilePropType
): MapChartData {
  const dataValues = {};
  const dates: Set<string> = new Set();
  const metadata = {};
  const placeData = [];
  const sources: Set<string> = new Set();
  const units = {};
  let isUsaPlace = true; // whether all layers are about USA places

  for (const rawData of rawDataArray) {
    if (_.isEmpty(rawData.geoJson)) {
      continue;
    }

    const metadataMap = rawData.placeStat.facets || {};
    const placeStat = rawData.placeStat.data[statVarSpec.statVar] || {};
    // Get the list of child places from either the geojson data or the
    // placeStat data
    const childPlaces = !_.isEmpty(rawData.geoJson.features)
      ? rawData.geoJson.features.map((feature) => feature.properties.geoDcid)
      : Object.keys(placeStat);
    let geoJson = rawData.geoJson;
    if (
      rawData.enclosedPlaceType in MANUAL_GEOJSON_DISTANCES &&
      _.isEmpty(rawData.geoJson.features)
    ) {
      geoJson = {
        features: getGeoJsonDataFeatures(
          childPlaces,
          rawData.enclosedPlaceType
        ),
        properties: { currentGeo: rawData.place.dcid },
        type: "FeatureCollection",
      };
    }
    placeData.push({
      borderGeoJson: rawData.borderGeoJson,
      enclosedPlaceType: rawData.enclosedPlaceType,
      geoJson,
      place: rawData.place,
      showMapBoundaries: shouldShowMapBoundaries(
        rawData.place,
        rawData.enclosedPlaceType
      ),
    });

    // isUsaPlace will only remain true if all places provided are
    // within the United States
    if (
      !isChildPlaceOf(rawData.place.dcid, USA_PLACE_DCID, rawData.parentPlaces)
    ) {
      isUsaPlace = false;
    }

    const { unit, scaling } = getStatFormat(statVarSpec, rawData.placeStat);
    units[statVarSpec.statVar] = unit;
    for (const placeDcid of childPlaces) {
      const placeChartData = getPlaceChartData(
        placeStat,
        placeDcid,
        false /* set isPerCapita as false here so that we can calculate per capita the same way as all the tiles */,
        {},
        metadataMap
      );
      if (_.isEmpty(placeChartData)) {
        continue;
      }
      let value = placeChartData.value;
      placeChartData.sources.forEach((source) => {
        if (!_.isEmpty(source)) {
          sources.add(source);
        }
      });
      if (statVarSpec.denom) {
        const denomInfo = getDenomInfo(
          statVarSpec,
          rawData.population,
          placeDcid,
          placeChartData.date
        );
        if (_.isEmpty(denomInfo)) {
          // skip this data point because missing denom data.
          continue;
        }
        value /= denomInfo.value;
        placeChartData.metadata.popSource = denomInfo.source;
        placeChartData.metadata.popDate = denomInfo.date;
        sources.add(denomInfo.source);
      }
      if (scaling) {
        value = value * scaling;
      }
      dataValues[placeDcid] = value;
      metadata[placeDcid] = placeChartData.metadata;
      dates.add(placeChartData.date);
    }
  }
  // check for empty data values
  const errorMsg = _.isEmpty(dataValues)
    ? getNoDataErrorMsg([props.statVarSpec])
    : "";
  return {
    dataValues,
    dateRange: getDateRange(Array.from(dates)),
    errorMsg,
    isUsaPlace,
    metadata,
    placeData,
    props,
    sources,
    units,
  };
}

export function draw(
  chartData: MapChartData,
  props: MapTilePropType,
  svgContainer: HTMLDivElement,
  legendContainer: HTMLDivElement,
  mapContainer: HTMLDivElement,
  errorMsgContainer: HTMLDivElement,
  svgWidth?: number,
  zoomParams?: MapZoomParams
): void {
  if (chartData.errorMsg && errorMsgContainer) {
    // clear the map and legend before adding error message
    mapContainer.innerHTML = "";
    legendContainer.innerHTML = "";
    showError(chartData.errorMsg, errorMsgContainer);
    return;
  }
  // clear the error message before drawing the map and legend
  if (errorMsgContainer) {
    errorMsgContainer.innerHTML = "";
  }
  // If multiple StatVars are provided, use the first
  // TODO: Support multiple stat-vars
  const mainStatVar = !_.isEmpty(props.dataSpecs)
    ? props.dataSpecs[0].variable.statVar
    : props.statVarSpec.statVar;
  const unit = chartData.units[mainStatVar];
  const height = props.svgChartHeight;
  const dataValues = Object.values(chartData.dataValues);
  const colorScale = getColorScale(
    mainStatVar,
    d3.min(dataValues),
    d3.mean(dataValues),
    d3.max(dataValues),
    undefined,
    undefined,
    props.colors
  );
  const getTooltipHtml = (place: NamedPlace) => {
    let value = "Data Unavailable";
    let date = "";
    if (place.dcid in chartData.dataValues) {
      // shows upto 2 precision digits for very low values
      if (
        Math.abs(chartData.dataValues[place.dcid]) < 1 &&
        Math.abs(chartData.dataValues[place.dcid]) > 0
      ) {
        const chartDatavalue = chartData.dataValues[place.dcid];
        value = formatNumber(Number(chartDatavalue.toPrecision(2)), unit);
      } else {
        value = formatNumber(
          Math.round(
            (chartData.dataValues[place.dcid] + Number.EPSILON) * 100
          ) / 100,
          unit
        );
      }
      date = ` (${chartData.metadata[place.dcid].placeStatDate})`;
    }
    return place.name + ": " + value + date;
  };

  const legendWidth = generateLegendSvg(
    legendContainer,
    height,
    colorScale,
    unit,
    0
  );
  const chartWidth = (svgWidth || svgContainer.offsetWidth) - legendWidth;

  // Create combined geojson to use to calculate projection.
  const projectionGeoJsons = [];
  const bordersToDraw = [];
  for (const placeData of chartData.placeData) {
    // Use border data to calculate projection if using borders.
    // This prevents borders from being cutoff when enclosed places don't
    // provide wall to wall coverage.
    const shouldUseBorderData =
      placeData.enclosedPlaceType &&
      shouldShowBorder(placeData.enclosedPlaceType) &&
      !_.isEmpty(placeData.borderGeoJson);
    projectionGeoJsons.push(
      shouldUseBorderData ? placeData.borderGeoJson : placeData.geoJson
    );
    if (shouldUseBorderData) {
      bordersToDraw.push(placeData.borderGeoJson);
    }
  }

  const projectionData = combineGeoJsons(projectionGeoJsons);
  const enclosingPlace =
    chartData.placeData.length == 1 ? chartData.placeData[0].place.dcid : "";
  const projection = getProjection(
    chartData.isUsaPlace,
    enclosingPlace,
    chartWidth,
    height,
    projectionData
  );
  const geoJsons: {
    [dcid: string]: { geoJson: GeoJsonData; shouldShowBoundaryLines: boolean };
  } = {};
  for (const placeData of chartData.placeData) {
    geoJsons[placeData.place.dcid] = {
      geoJson: placeData.geoJson,
      shouldShowBoundaryLines: placeData.showMapBoundaries,
    };
  }

  drawD3Map(
    mapContainer,
    geoJsons,
    height,
    chartWidth,
    chartData.dataValues,
    colorScale,
    _.noop,
    getTooltipHtml,
    () => false,
    projection,
    undefined,
    zoomParams
  );
  for (const borderGeoJson of bordersToDraw)
    addPolygonLayer(
      mapContainer,
      borderGeoJson,
      projection,
      () => "none",
      () => BORDER_STROKE_COLOR,
      () => null,
      false
    );
}

function getExploreLink(props: MapTilePropType): {
  displayText: string;
  url: string;
} {
  // If dataSpec is provided, will only provide link of first layer
  // TODO: Update the link after the visualization tools support multi-place
  const parentPlaceDcid = !_.isEmpty(props.dataSpecs)
    ? props.dataSpecs[0].parentPlace
    : props.place.dcid;
  const enclosedPlaceType = !_.isEmpty(props.dataSpecs)
    ? props.dataSpecs[0].enclosedPlaceType
    : props.enclosedPlaceType;
  const statVarSpec = !_.isEmpty(props.dataSpecs)
    ? props.dataSpecs[0].variable
    : props.statVarSpec;
  const hash = getHash(
    VisType.MAP,
    [parentPlaceDcid],
    enclosedPlaceType,
    [getContextStatVar(statVarSpec)],
    {}
  );
  return {
    displayText: "Map Tool",
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
