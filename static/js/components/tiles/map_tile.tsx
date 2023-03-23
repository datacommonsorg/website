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
import { formatNumber } from "../../i18n/i18n";
import { USA_PLACE_DCID } from "../../shared/constants";
import {
  EntityObservation,
  EntitySeries,
  PointApiResponse,
  SeriesApiResponse,
  StatMetadata,
} from "../../shared/stat_types";
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
import { getUnit } from "../../tools/shared_util";
import { stringifyFn } from "../../utils/axios";
import { mapDataToCsv } from "../../utils/chart_csv_utils";
import { getDateRange } from "../../utils/string_utils";
import { getUnitString, ReplacementStrings } from "../../utils/tile_utils";
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
}

interface RawData {
  geoJson: GeoJsonData;
  placeStat: EntityObservation;
  metadataMap: Record<string, StatMetadata>;
  population: EntitySeries;
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
  const [rawData, setRawData] = useState<RawData | undefined>(null);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );
  const [svgHeight, setSvgHeight] = useState(null);

  useEffect(() => {
    fetchData(
      props.place.dcid,
      props.enclosedPlaceType,
      props.statVarSpec.statVar,
      props.statVarSpec.denom,
      setRawData
    );
  }, [props.place, props.enclosedPlaceType, props.statVarSpec]);

  useEffect(() => {
    if (rawData) {
      processData(
        rawData,
        props.statVarSpec,
        props.place,
        props.statVarSpec.scaling,
        props.enclosedPlaceType,
        setMapChartData
      );
    }
  }, [rawData, props]);

  useEffect(() => {
    if (mapChartData) {
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
        <div className="map" ref={mapContainer}></div>
        <div className="legend" ref={legendContainer}></div>
      </div>
    </ChartTileContainer>
  );
}

function fetchData(
  placeDcid: string,
  enclosedPlaceType: string,
  mainStatVar: string,
  denomStatVar: string,
  setRawData: (data: RawData) => void
): void {
  const geoJsonPromise = axios
    .get(
      `/api/choropleth/geojson?placeDcid=${placeDcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  const dataDate = getCappedStatVarDate(mainStatVar);
  const placeStatPromise: Promise<PointApiResponse> = axios
    .get("/api/observations/point/within", {
      params: {
        parent_entity: placeDcid,
        child_type: enclosedPlaceType,
        variables: [mainStatVar],
        date: dataDate,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => resp.data);
  const populationPromise: Promise<SeriesApiResponse> = denomStatVar
    ? axios
        .get("/api/observations/series/within", {
          params: {
            parent_entity: placeDcid,
            child_type: enclosedPlaceType,
            variables: [denomStatVar],
          },
          paramsSerializer: stringifyFn,
        })
        .then((resp) => resp.data)
    : Promise.resolve({});
  const parentPlacesPromise = axios
    .get(`/api/place/parent/${placeDcid}`)
    .then((resp) => resp.data);
  Promise.all([
    geoJsonPromise,
    placeStatPromise,
    populationPromise,
    parentPlacesPromise,
  ])
    .then(([geoJson, placeStat, populationData, parentPlaces]) => {
      const metadataMap = placeStat.facets;
      if (!_.isEmpty(populationData.facets)) {
        Object.assign(metadataMap, populationData.facets);
      }
      let population = {};
      if (
        !_.isEmpty(populationData.data) &&
        !_.isEmpty(denomStatVar) &&
        denomStatVar in populationData.data
      ) {
        population = populationData.data[denomStatVar];
      }
      setRawData({
        geoJson,
        placeStat: placeStat.data[mainStatVar],
        metadataMap,
        population,
        parentPlaces,
      });
    })
    .catch(() => {
      // TODO: add error message
      setRawData(null);
    });
}

function processData(
  rawData: RawData,
  statVarSpec: StatVarSpec,
  place: NamedTypedPlace,
  scaling: number,
  enclosedPlaceType: string,
  setChartData: (data: MapChartData) => void
): void {
  const dataValues = {};
  const metadata = {};
  const sources: Set<string> = new Set();
  const dates: Set<string> = new Set();
  if (_.isEmpty(rawData.geoJson)) {
    return;
  }
  const isPerCapita = !_.isEmpty(statVarSpec.denom);
  for (const geoFeature of rawData.geoJson.features) {
    const placeDcid = geoFeature.properties.geoDcid;
    const placeChartData = getPlaceChartData(
      rawData.placeStat,
      placeDcid,
      isPerCapita,
      rawData.population,
      rawData.metadataMap
    );
    if (_.isEmpty(placeChartData)) {
      continue;
    }
    let value = placeChartData.value;
    if (scaling !== null && scaling !== undefined) {
      value = value * scaling;
    }
    dataValues[placeDcid] = value;
    metadata[placeDcid] = placeChartData.metadata;
    dates.add(placeChartData.date);
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sources.add(source);
      }
    });
  }
  // check for empty data values
  if (_.isEmpty(dataValues)) {
    return;
  }
  const statUnit = getUnit(
    Object.values(rawData.placeStat),
    rawData.metadataMap
  );
  const unit = getUnitString(statUnit, statVarSpec.denom);
  setChartData({
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
  });
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
