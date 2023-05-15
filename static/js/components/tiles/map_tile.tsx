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

import { drawD3Map, getProjection } from "../../chart/draw_d3_map";
import { generateLegendSvg, getColorScale } from "../../chart/draw_map_utils";
import { GeoJsonData } from "../../chart/types";
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
import { getPlaceChartData } from "../../tools/map/util";
import {
  isChildPlaceOf,
  shouldShowMapBoundaries,
} from "../../tools/shared_util";
import { stringifyFn } from "../../utils/axios";
import { mapDataToCsv } from "../../utils/chart_csv_utils";
import { getDateRange } from "../../utils/string_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";

interface MapTilePropType {
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
}

interface RawData {
  geoJson: GeoJsonData;
  placeStat: PointApiResponse;
  population: SeriesApiResponse;
  parentPlaces: NamedTypedPlace[];
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
}

export function MapTile(props: MapTilePropType): JSX.Element {
  const svgContainer = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const legendContainer = useRef<HTMLDivElement>(null);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );
  const [svgHeight, setSvgHeight] = useState(null);

  useEffect(() => {
    if (!mapChartData) {
      (async () => {
        const data = await fetchData(
          props.place,
          props.enclosedPlaceType,
          props.statVarSpec
        );
        setMapChartData(data);
      })();
    } else {
      draw(mapChartData, props, svgContainer, legendContainer, mapContainer);
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

  const rs: ReplacementStrings = {
    placeName: props.place.name,
    date: mapChartData && mapChartData.dateRange,
  };
  return (
    <ChartTileContainer
      title={props.title}
      sources={mapChartData && mapChartData.sources}
      replacementStrings={rs}
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

export const fetchData = async (
  place: NamedTypedPlace,
  enclosedPlaceType: string,
  statVarSpec: StatVarSpec
): Promise<MapChartData> => {
  const geoJsonPromise = axios
    .get(
      `/api/choropleth/geojson?placeDcid=${place.dcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  const dataDate = getCappedStatVarDate(statVarSpec.statVar);
  const placeStatPromise: Promise<PointApiResponse> = axios
    .get("/api/observations/point/within", {
      params: {
        childType: enclosedPlaceType,
        date: dataDate,
        parentEntity: place.dcid,
        variables: [statVarSpec.statVar],
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => resp.data);
  const populationPromise: Promise<SeriesApiResponse> = statVarSpec.denom
    ? axios
        .get("/api/observations/series/within", {
          params: {
            childType: enclosedPlaceType,
            parentEntity: place.dcid,
            variables: [statVarSpec.denom],
          },
          paramsSerializer: stringifyFn,
        })
        .then((resp) => resp.data)
    : Promise.resolve({});
  const parentPlacesPromise = axios
    .get(`/api/place/parent/${place.dcid}`)
    .then((resp) => resp.data);
  try {
    const [geoJson, placeStat, population, parentPlaces] = await Promise.all([
      geoJsonPromise,
      placeStatPromise,
      populationPromise,
      parentPlacesPromise,
    ]);
    const rawData = { geoJson, placeStat, population, parentPlaces };
    return rawToChart(rawData, statVarSpec, place, enclosedPlaceType);
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
  };
}

function draw(
  chartData: MapChartData,
  props: MapTilePropType,
  svgContainer: React.RefObject<HTMLDivElement>,
  legendContainer: React.RefObject<HTMLDivElement>,
  mapContainer: React.RefObject<HTMLDivElement>
): void {
  const mainStatVar = props.statVarSpec.statVar;
  const height = svgContainer.current.offsetHeight;
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
    legendContainer.current,
    height,
    colorScale,
    chartData.unit,
    0,
    formatNumber
  );
  const chartWidth = svgContainer.current.offsetWidth - legendWidth;
  const projection = getProjection(
    chartData.isUsaPlace,
    props.place.dcid,
    chartWidth,
    height,
    chartData.geoJson
  );
  drawD3Map(
    mapContainer.current,
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
}
