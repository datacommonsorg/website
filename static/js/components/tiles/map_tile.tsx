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

import {
  DataRow,
  dataRowsToCsv,
  ISO_CODE_ATTRIBUTE,
} from "@datacommonsorg/client";
import { ChartEventDetail } from "@datacommonsorg/web-components";
import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { VisType } from "../../apps/visualization/vis_type_configs";
import {
  drawD3Map,
  getProjection,
  getProjectionGeoJson,
  MapZoomParams,
} from "../../chart/draw_d3_map";
import { drawLegendSvg, getTooltipHtmlFn } from "../../chart/draw_map_utils";
import { GeoJsonData } from "../../chart/types";
import { URL_PATH } from "../../constants/app/visualization_constants";
import { CSV_FIELD_DELIMITER } from "../../constants/tile_constants";
import { USA_PLACE_DCID } from "../../shared/constants";
import { useLazyLoad } from "../../shared/hooks";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import {
  DataPointMetadata,
  NamedPlace,
  NamedTypedPlace,
  StatVarSpec,
} from "../../shared/types";
import { getCappedStatVarDate } from "../../shared/util";
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
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { getPointWithin, getSeriesWithin } from "../../utils/data_fetch_utils";
import { getDateRange } from "../../utils/string_utils";
import {
  getDenomInfo,
  getNoDataErrorMsg,
  getStatFormat,
  getStatVarNames,
  ReplacementStrings,
  showError,
  transformCsvHeader,
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
  // Whether or not to allow zoom in and out of the map
  allowZoom?: boolean;
  // The property to use to get place names.
  placeNameProp?: string;
  // The property to use to get geojsons.
  geoJsonProp?: string;
  // Chart subtitle
  subtitle?: string;
  // Function used to get processed stat var names.
  getProcessedSVNameFn?: (name: string) => string;
  // Optional: Override sources for this tile
  sources?: string[];
  // Optional: listen for property value changes with this event name
  subscribe?: string;
  // Optional: Only load this component when it enters the viewport
  lazyLoad?: boolean;
  /**
   * Optional: If lazy loading is enabled, load the component when it is within
   * this margin of the viewport. Default: "0px"
   */
  lazyLoadMargin?: string;
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
  variable: StatVarSpec;
}

// Geojson and metadata for the place of a single layer of the map
export interface MapLayerData {
  // geoJson for border of parent places to plot
  borderGeoJson?: GeoJsonData;
  // color scale to use for data values
  colorScale?: d3.ScaleLinear<number | string, number, never>;
  // child place DCID -> observation value to plot mapping
  dataValues?: { [dcid: string]: number };
  // child place type DCID
  enclosedPlaceType?: string;
  // GeoJson of contained places
  geoJson: GeoJsonData;
  // child place type DCID -> observation's metadata
  metadata?: { [dcid: string]: DataPointMetadata };
  // Parent place to plot
  place?: NamedTypedPlace;
  // Whether to show borderGeoJson
  showMapBoundaries?: boolean;
  // display string of variable's unit of measure
  unit?: string;
  // variable to plot
  variable?: StatVarSpec;
}

export interface MapChartData {
  dateRange: string;
  errorMsg: string;
  // Whether all places to show are contained in the US
  // Determines whether or not to use US-specific projection
  isUsaPlace: boolean;
  // geoJsons and metadata for each layer to draw
  layerData: MapLayerData[];
  // props used when fetching this data
  props: MapTilePropType;
  sources: Set<string>;
  // Set if the component receives a date value from a subscribed event
  dateOverride?: string;
}

export function MapTile(props: MapTilePropType): JSX.Element {
  const svgContainer = useRef<HTMLDivElement>(null);
  const errorMsgContainer = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const legendContainer = useRef<HTMLDivElement>(null);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [svgHeight, setSvgHeight] = useState(null);
  const [dateOverride, setDateOverride] = useState(null);
  const { shouldLoad, containerRef } = useLazyLoad(props.lazyLoadMargin);
  const zoomParams = props.allowZoom
    ? {
        zoomInButtonId: `${ZOOM_IN_BUTTON_ID}-${props.id}`,
        zoomOutButtonId: `${ZOOM_OUT_BUTTON_ID}-${props.id}`,
      }
    : null;
  const showZoomButtons =
    !!zoomParams && !!mapChartData && _.isEqual(mapChartData.props, props);
  const dataCommonsClient = getDataCommonsClient(props.apiRoot);

  useEffect(() => {
    if (props.lazyLoad && !shouldLoad) {
      return;
    }
    if (
      _.isEmpty(mapChartData) ||
      !_.isEqual(mapChartData.props, props) ||
      !_.isEqual(mapChartData.dateOverride, dateOverride)
    ) {
      (async () => {
        try {
          setIsLoading(true);
          const data = await fetchData(props, dateOverride);
          if (
            data &&
            props &&
            _.isEqual(data.props, props) &&
            _.isEqual(data.dateOverride, dateOverride)
          ) {
            setMapChartData(data);
          }
        } finally {
          setIsLoading(false);
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
    }
  }, [
    mapChartData,
    props,
    svgContainer,
    legendContainer,
    mapContainer,
    dateOverride,
    shouldLoad,
  ]);

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
  useEffect(() => {
    if (props.subscribe) {
      self.addEventListener(
        props.subscribe,
        (e: CustomEvent<ChartEventDetail>) => {
          if (e.detail.property === "date") {
            setDateOverride(e.detail.value);
          }
        }
      );
    }
  }, []);

  return (
    <ChartTileContainer
      id={props.id}
      isLoading={isLoading}
      title={props.title}
      subtitle={props.subtitle}
      apiRoot={props.apiRoot}
      sources={props.sources || (mapChartData && mapChartData.sources)}
      forwardRef={containerRef}
      replacementStrings={
        mapChartData && getReplacementStrings(props, mapChartData)
      }
      className={`${props.className} map-chart`}
      allowEmbed={true}
      getDataCsv={async () => {
        const layers = getDataSpec(props);
        const rows: DataRow[] = [];
        for (const layer of layers) {
          const parentEntity = layer.parentPlace;
          const childType = layer.enclosedPlaceType;
          const date = getCappedStatVarDate(
            props.statVarSpec.statVar,
            dateOverride || props.statVarSpec.date
          );
          const entityProps = props.placeNameProp
            ? [props.placeNameProp, ISO_CODE_ATTRIBUTE]
            : undefined;

          rows.push(
            ...(await dataCommonsClient.getDataRows({
              childType,
              date,
              entityProps,
              parentEntity,
              perCapitaVariables: props.statVarSpec.denom
                ? [props.statVarSpec.statVar]
                : undefined,
              variables: [layer.variable.statVar],
            }))
          );
        }
        return dataRowsToCsv(rows, CSV_FIELD_DELIMITER, transformCsvHeader);
      }}
      isInitialLoading={_.isNull(mapChartData)}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
      hasErrorMsg={!_.isEmpty(mapChartData) && !!mapChartData.errorMsg}
      footnote={props.footnote}
      statVarSpecs={
        !_.isEmpty(props.dataSpecs)
          ? [props.dataSpecs[0].variable]
          : [props.statVarSpec]
      }
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
    : chartData.layerData.map((placeData) => placeData.place.name).join(", ");
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
  props: MapTilePropType,
  dateOverride?: string
): Promise<MapChartData> => {
  const layers = getDataSpec(props);
  if (_.isEmpty(layers)) {
    return null;
  }
  const rawDataArray = [];
  for (const layer of layers) {
    // TODO: Currently we make one set of data fetches per layer.
    //       We should switch to concurrent/batch calls across all layers.
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
    const dataDate = getCappedStatVarDate(
      layer.variable.statVar,
      dateOverride || layer.variable.date
    );
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
      // Get human-readable name of variable to display as label
      const statVarDcidToName = await getStatVarNames(
        [layer.variable],
        props.apiRoot,
        props.getProcessedSVNameFn
      );
      layer.variable.name =
        layer.variable.name || statVarDcidToName[layer.variable.statVar];
      // Only draw borders for containing places without 'wall to wall' coverage
      const borderGeoJson = shouldShowBorder(layer.enclosedPlaceType)
        ? borderGeoJsonData
        : undefined;
      const rawData: RawData = {
        borderGeoJson,
        enclosedPlaceType: layer.enclosedPlaceType,
        geoJson,
        parentPlaces,
        place,
        placeStat,
        population,
        variable: layer.variable,
      };
      rawDataArray.push(rawData);
    } catch (error) {
      return null;
    }
  }
  const mapChartData = rawToChart(rawDataArray, props, dateOverride);
  return mapChartData;
};

function rawToChart(
  rawDataArray: RawData[],
  props: MapTilePropType,
  dateOverride?: string
): MapChartData {
  const allDataValues = [];
  const dates: Set<string> = new Set();
  const layerData = [];
  const sources: Set<string> = new Set();
  let isUsaPlace = true; // whether all layers are about USA places

  for (const rawData of rawDataArray) {
    if (_.isEmpty(rawData.geoJson)) {
      continue;
    }
    const metadataMap = rawData.placeStat.facets || {};
    const placeStat = rawData.placeStat.data[rawData.variable.statVar] || {};
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

    // isUsaPlace will only remain true if all places provided are
    // within the United States
    if (
      !isChildPlaceOf(rawData.place.dcid, USA_PLACE_DCID, rawData.parentPlaces)
    ) {
      isUsaPlace = false;
    }

    const { unit, scaling } = getStatFormat(
      rawData.variable,
      rawData.placeStat
    );
    const dataValues = {};
    const metadata = {};
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
      if (rawData.variable.denom) {
        const denomInfo = getDenomInfo(
          rawData.variable,
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
      allDataValues.push(value);
    }
    layerData.push({
      borderGeoJson: rawData.borderGeoJson,
      dataValues,
      enclosedPlaceType: rawData.enclosedPlaceType,
      geoJson,
      metadata,
      place: rawData.place,
      showMapBoundaries: shouldShowMapBoundaries(
        rawData.place,
        rawData.enclosedPlaceType
      ),
      unit,
      variable: rawData.variable,
    });
  }
  // check for empty data values
  const errorMsg = layerData.every((layer) => _.isEmpty(layer.dataValues))
    ? getNoDataErrorMsg(layerData.map((layer) => layer.variable))
    : "";
  return {
    dateRange: getDateRange(Array.from(dates)),
    errorMsg,
    isUsaPlace,
    layerData,
    props,
    sources,
    dateOverride,
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

  // use props.colors if there's a single layer
  const customColors: { [variable: string]: string[] } = {};
  if (
    chartData.layerData.length == 1 &&
    chartData.layerData[0].variable &&
    props.colors
  ) {
    customColors[chartData.layerData[0].variable.statVar] = props.colors;
  }
  // add legend and calculate color scales
  const [legendWidth, colorScales] = drawLegendSvg(
    chartData,
    props.svgChartHeight,
    legendContainer,
    customColors
  );

  // add color scale to layer info
  for (const layer of chartData.layerData) {
    layer.colorScale = colorScales[layer.variable.statVar];
  }

  const chartWidth = (svgWidth || svgContainer.offsetWidth) - legendWidth;

  // Calculate projection to use using all geojsons to plot.
  const projectionData = getProjectionGeoJson(chartData);
  const enclosingPlace =
    chartData.layerData.length == 1 ? chartData.layerData[0].place.dcid : "";
  const projection = getProjection(
    chartData.isUsaPlace,
    enclosingPlace,
    chartWidth,
    props.svgChartHeight,
    projectionData
  );

  const getTooltipHtml = getTooltipHtmlFn(chartData);

  drawD3Map(
    mapContainer,
    chartData.layerData,
    props.svgChartHeight,
    chartWidth,
    _.noop,
    getTooltipHtml,
    () => false,
    projection,
    undefined,
    zoomParams,
    undefined
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
