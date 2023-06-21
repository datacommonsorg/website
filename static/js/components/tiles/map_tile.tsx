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
import React, { useEffect, useRef, useState } from "react";

import {
  addPolygonLayer,
  drawD3Map,
  getProjection,
} from "../../chart/draw_d3_map";
import { generateLegendSvg, getColorScale } from "../../chart/draw_map_utils";
import { GeoJsonData } from "../../chart/types";
import { BORDER_STROKE_COLOR } from "../../constants/map_constants";
import { DATA_CSS_CLASS } from "../../constants/tile_constants";
import { formatNumber } from "../../i18n/i18n";
import { USA_PLACE_DCID } from "../../shared/constants";
import { PointApiResponse, SeriesApiResponse } from "../../shared/stat_types";
import {
  DataPointMetadata,
  NamedPlace,
  NamedTypedPlace,
  StatVarSpec,
} from "../../shared/types";
import { getCappedStatVarDate } from "../../shared/util";
import { getPlaceChartData, shouldShowBorder } from "../../tools/map/util";
import {
  isChildPlaceOf,
  shouldShowMapBoundaries,
} from "../../tools/shared_util";
import { stringifyFn } from "../../utils/axios";
import { mapDataToCsv } from "../../utils/chart_csv_utils";
import { getDateRange } from "../../utils/string_utils";
import { getMergedSvg, ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";

export interface MapTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  statVarSpec: StatVarSpec;
  // Height, in px, for the SVG chart.
  svgChartHeight: number;
  // Extra classes to add to the container.
  className?: string;
  // Whether or not to render the data version of this tile
  isDataTile?: boolean;
  // API root
  apiRoot?: string;
  // Parent places of the current place showing map for
  parentPlaces?: NamedPlace[];
}

interface RawData {
  geoJson: GeoJsonData;
  placeStat: PointApiResponse;
  population: SeriesApiResponse;
  parentPlaces: NamedTypedPlace[];
  borderGeoJson?: GeoJsonData;
}

interface MapChartData {
  dataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  sources: Set<string>;
  geoJson: GeoJsonData;
  dateRange: string;
  isUsaPlace: boolean;
  showMapBoundaries: boolean;
  unit: string;
  borderGeoJson?: GeoJsonData;
}

export function MapTile(props: MapTilePropType): JSX.Element {
  const svgContainer = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const legendContainer = useRef<HTMLDivElement>(null);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );
  const [svgHeight, setSvgHeight] = useState(null);

  function addSvgDataAttribute(): void {
    const { svgXml } = getMergedSvg(svgContainer.current);
    const dataDiv = svgContainer.current.getElementsByClassName(DATA_CSS_CLASS);
    if (_.isEmpty(dataDiv)) {
      return;
    }
    dataDiv[0].setAttribute("data-svg", svgXml);
  }

  useEffect(() => {
    if (!mapChartData) {
      (async () => {
        const data = await fetchData(props);
        setMapChartData(data);
      })();
    } else {
      draw(
        mapChartData,
        props,
        svgContainer.current,
        legendContainer.current,
        mapContainer.current
      );
      if (props.isDataTile) {
        addSvgDataAttribute();
      }
    }
  }, [mapChartData, props]);

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

  return (
    <ChartTileContainer
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
    >
      <div
        className="svg-container"
        ref={svgContainer}
        style={{ minHeight: svgHeight }}
      >
        {props.isDataTile && mapChartData && (
          <div
            className={DATA_CSS_CLASS}
            data-csv={mapDataToCsv(
              mapChartData.geoJson,
              mapChartData.dataValues
            )}
          />
        )}
        <div className="map" ref={mapContainer}></div>
        <div className="legend" ref={legendContainer}></div>
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
  const dataDate = getCappedStatVarDate(props.statVarSpec.statVar);
  const placeStatPromise: Promise<PointApiResponse> = axios
    .get(`${props.apiRoot || ""}/api/observations/point/within`, {
      params: {
        childType: props.enclosedPlaceType,
        date: dataDate,
        parentEntity: props.place.dcid,
        variables: [props.statVarSpec.statVar],
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => resp.data);
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
        .get(`${props.apiRoot || ""}/api/place/parent/${props.place.dcid}`)
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
      props.enclosedPlaceType
    );
  } catch (error) {
    return null;
  }
};

function rawToChart(
  rawData: RawData,
  statVarSpec: StatVarSpec,
  place: NamedTypedPlace,
  enclosedPlaceType: string
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
  };
}

export function draw(
  chartData: MapChartData,
  props: MapTilePropType,
  svgContainer: HTMLDivElement,
  legendContainer: HTMLDivElement,
  mapContainer: HTMLDivElement,
  svgWidth?: number
): void {
  const mainStatVar = props.statVarSpec.statVar;
  let height = props.svgChartHeight;
  if (svgContainer) {
    height = Math.max(props.svgChartHeight, svgContainer.offsetHeight);
  }
  const dataValues = Object.values(chartData.dataValues);
  const colorScale = getColorScale(
    mainStatVar,
    d3.min(dataValues),
    d3.mean(dataValues),
    d3.max(dataValues)
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
    0,
    formatNumber
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
    projection
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
