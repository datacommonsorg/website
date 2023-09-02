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
  getPlaceChartData,
  MAP_URL_PATH,
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
import { getPointWithin } from "../../utils/data_fetch_utils";
import { getDateRange } from "../../utils/string_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
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
  enclosedPlaceType: string;
  id: string;
  // Parent places of the current place showing map for
  parentPlaces?: NamedPlace[];
  // Specific date to show data for
  place: NamedTypedPlace;
  statVarSpec: StatVarSpec;
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  title: string;
  // Whether or not to show the explore more button.
  showExploreMore?: boolean;
  // Whether or not to show a loading spinner when fetching data.
  showLoadingSpinner?: boolean;
  // Whether or not to allow zoom in and out of the map
  allowZoom?: boolean;
}

interface RawData {
  geoJson: GeoJsonData;
  placeStat: PointApiResponse;
  population: SeriesApiResponse;
  parentPlaces: NamedTypedPlace[];
  borderGeoJson?: GeoJsonData;
}

export interface MapChartData {
  dataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  sources: Set<string>;
  geoJson: GeoJsonData;
  dateRange: string;
  isUsaPlace: boolean;
  showMapBoundaries: boolean;
  unit: string;
  borderGeoJson?: GeoJsonData;
  // props used when fetching this data
  props: MapTilePropType;
}

export function MapTile(props: MapTilePropType): JSX.Element {
  const svgContainer = useRef<HTMLDivElement>(null);
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
    if (!mapChartData || !_.isEqual(mapChartData.props, props)) {
      loadSpinner(props.id);
      (async () => {
        const data = await fetchData(props);
        if (data && props && _.isEqual(data.props, props)) {
          setMapChartData(data);
        }
      })();
    } else if (_.isEqual(mapChartData.props, props)) {
      draw(
        mapChartData,
        props,
        svgContainer.current,
        legendContainer.current,
        mapContainer.current
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
      null,
      zoomParams
    );
  }, [props, mapChartData, svgContainer, legendContainer, mapContainer]);
  useDrawOnResize(drawFn, svgContainer.current);

  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      sources={mapChartData && mapChartData.sources}
      replacementStrings={getReplacementStrings(props, mapChartData)}
      className={`${props.className} map-chart`}
      allowEmbed={true}
      getDataCsv={
        mapChartData
          ? () => mapDataToCsv(mapChartData.geoJson, mapChartData.dataValues)
          : null
      }
      isInitialLoading={_.isNull(mapChartData)}
      exploreLink={props.showExploreMore ? getExploreLink(props) : null}
    >
      {showZoomButtons && (
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
  return {
    placeName: props.place.name,
    date: chartData && chartData.dateRange,
  };
}

export const fetchData = async (
  props: MapTilePropType
): Promise<MapChartData> => {
  const geoJsonPromise = axios
    .get(`${props.apiRoot || ""}/api/choropleth/geojson`, {
      params: {
        placeDcid: props.place.dcid,
        placeType: props.enclosedPlaceType,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => resp.data);
  const borderGeoJsonPromise = axios
    .post(`${props.apiRoot || ""}/api/choropleth/node-geojson`, {
      geoJsonProp: "geoJsonCoordinates",
      nodes: [props.place.dcid],
    })
    .then((resp) => resp.data);
  const dataDate =
    props.statVarSpec.date || getCappedStatVarDate(props.statVarSpec.statVar);
  const placeStatPromise: Promise<PointApiResponse> = getPointWithin(
    props.apiRoot,
    props.enclosedPlaceType,
    props.place.dcid,
    [props.statVarSpec.statVar],
    dataDate
  );
  const populationPromise: Promise<SeriesApiResponse> = props.statVarSpec.denom
    ? axios
        .get(`${props.apiRoot || ""}/api/observations/series/within`, {
          params: {
            childType: props.enclosedPlaceType,
            parentEntity: props.place.dcid,
            variables: [props.statVarSpec.denom],
          },
          paramsSerializer: stringifyFn,
        })
        .then((resp) => resp.data)
    : Promise.resolve({});
  const parentPlacesPromise = props.parentPlaces
    ? Promise.resolve(props.parentPlaces)
    : axios
        .get(`${props.apiRoot || ""}/api/place/parent?dcid=${props.place.dcid}`)
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
    const borderGeoJson = shouldShowBorder(props.enclosedPlaceType)
      ? borderGeoJsonData
      : undefined;
    const rawData = {
      geoJson,
      placeStat,
      population,
      parentPlaces,
      borderGeoJson,
    };
    return rawToChart(
      rawData,
      props.statVarSpec,
      props.place,
      props.enclosedPlaceType,
      props
    );
  } catch (error) {
    removeSpinner(props.id);
    return null;
  }
};

function rawToChart(
  rawData: RawData,
  statVarSpec: StatVarSpec,
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  props: MapTilePropType
): MapChartData {
  const metadataMap = rawData.placeStat.facets || {};
  if (!_.isEmpty(rawData.population.facets)) {
    Object.assign(metadataMap, rawData.population.facets);
  }
  let population = {};
  if (
    !_.isEmpty(rawData.population.data) &&
    !_.isEmpty(statVarSpec.denom) &&
    statVarSpec.denom in rawData.population.data
  ) {
    population = rawData.population.data[statVarSpec.denom];
  }
  const placeStat = rawData.placeStat.data[statVarSpec.statVar] || {};

  const dataValues = {};
  const metadata = {};
  const sources: Set<string> = new Set();
  const dates: Set<string> = new Set();
  if (_.isEmpty(rawData.geoJson)) {
    return;
  }
  const isPerCapita = !_.isEmpty(statVarSpec.denom);
  let unit = statVarSpec.unit;
  for (const geoFeature of rawData.geoJson.features) {
    const placeDcid = geoFeature.properties.geoDcid;
    const placeChartData = getPlaceChartData(
      placeStat,
      placeDcid,
      isPerCapita,
      population,
      metadataMap
    );
    if (_.isEmpty(placeChartData)) {
      continue;
    }
    let value = placeChartData.value;
    if (statVarSpec.scaling !== null && statVarSpec.scaling !== undefined) {
      value = value * statVarSpec.scaling;
    }
    dataValues[placeDcid] = value;
    metadata[placeDcid] = placeChartData.metadata;
    dates.add(placeChartData.date);
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sources.add(source);
      }
    });
    unit = unit || placeChartData.unit;
  }
  // check for empty data values
  if (_.isEmpty(dataValues)) {
    return;
  }
  return {
    dataValues,
    metadata,
    sources,
    dateRange: getDateRange(Array.from(dates)),
    geoJson: rawData.geoJson,
    isUsaPlace: isChildPlaceOf(
      place.dcid,
      USA_PLACE_DCID,
      rawData.parentPlaces
    ),
    showMapBoundaries: shouldShowMapBoundaries(place, enclosedPlaceType),
    unit: statVarSpec.unit || unit,
    borderGeoJson: rawData.borderGeoJson,
    props,
  };
}

export function draw(
  chartData: MapChartData,
  props: MapTilePropType,
  svgContainer: HTMLDivElement,
  legendContainer: HTMLDivElement,
  mapContainer: HTMLDivElement,
  svgWidth?: number,
  zoomParams?: MapZoomParams
): void {
  const mainStatVar = props.statVarSpec.statVar;
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
    if (place.dcid in chartData.dataValues) {
      // shows upto 2 precision digits for very low values
      if (
        Math.abs(chartData.dataValues[place.dcid]) < 1 &&
        Math.abs(chartData.dataValues[place.dcid]) > 0
      ) {
        const chartDatavalue = chartData.dataValues[place.dcid];
        value = formatNumber(
          Number(chartDatavalue.toPrecision(2)),
          chartData.unit
        );
      } else {
        value = formatNumber(
          Math.round(
            (chartData.dataValues[place.dcid] + Number.EPSILON) * 100
          ) / 100,
          chartData.unit
        );
      }
    }
    return place.name + ": " + value;
  };
  const legendWidth = generateLegendSvg(
    legendContainer,
    height,
    colorScale,
    chartData.unit,
    0
  );
  const chartWidth = (svgWidth || svgContainer.offsetWidth) - legendWidth;
  const shouldUseBorderData =
    props.enclosedPlaceType &&
    shouldShowBorder(props.enclosedPlaceType) &&
    !_.isEmpty(chartData.borderGeoJson);
  // Use border data to calculate projection if using borders.
  // This prevents borders from being cutoff when enclosed places don't
  // provide wall to wall coverage.
  const projectionData = shouldUseBorderData
    ? chartData.borderGeoJson
    : chartData.geoJson;
  const projection = getProjection(
    chartData.isUsaPlace,
    props.place.dcid,
    chartWidth,
    height,
    projectionData
  );

  drawD3Map(
    mapContainer,
    chartData.geoJson,
    height,
    chartWidth,
    chartData.dataValues,
    colorScale,
    _.noop,
    getTooltipHtml,
    () => false,
    chartData.showMapBoundaries,
    projection,
    undefined,
    zoomParams
  );
  if (shouldUseBorderData) {
    addPolygonLayer(
      mapContainer,
      chartData.borderGeoJson,
      projection,
      () => "none",
      () => BORDER_STROKE_COLOR,
      () => null,
      false
    );
  }
}

function getExploreLink(props: MapTilePropType): {
  displayText: string;
  url: string;
} {
  const hash = getHash(
    VisType.MAP,
    [props.place.dcid],
    props.enclosedPlaceType,
    [getContextStatVar(props.statVarSpec)],
    {}
  );
  return {
    displayText: "Map Tool",
    url: `${props.apiRoot || ""}${URL_PATH}#${hash}`,
  };
}
