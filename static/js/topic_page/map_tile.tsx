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
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { drawChoropleth, getColorScale } from "../chart/draw_choropleth";
import { GeoJsonData } from "../chart/types";
import { formatNumber } from "../i18n/i18n";
import { USA_PLACE_DCID } from "../shared/constants";
import {
  Obs,
  PointApiResponse,
  Series,
  SeriesApiResponse,
  StatMetadata,
} from "../shared/stat_types";
import { NamedPlace, NamedTypedPlace, StatVarSpec } from "../shared/types";
import { getCappedStatVarDate } from "../shared/util";
import { DataPointMetadata, getPlaceChartData } from "../tools/map/util";
import { isChildPlaceOf, shouldShowMapBoundaries } from "../tools/shared_util";
import { getDateRange } from "../utils/string_utils";
import { ChartTileContainer } from "./chart_tile";
import { CHART_HEIGHT } from "./constants";
import { ReplacementStrings } from "./string_utils";

interface MapTilePropType {
  id: string;
  title: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  statVarSpec: StatVarSpec;
}

interface RawData {
  geoJson: GeoJsonData;
  placeStat: Record<string, Obs>;
  metadataMap: Record<string, StatMetadata>;
  population: Record<string, Series>;
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
}

export function MapTile(props: MapTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const [rawData, setRawData] = useState<RawData | undefined>(null);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );

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
        !_.isEmpty(props.statVarSpec.denom),
        props.place,
        props.statVarSpec.scaling,
        props.enclosedPlaceType,
        setMapChartData
      );
    }
  }, [rawData, props]);

  useEffect(() => {
    if (mapChartData) {
      draw(mapChartData, props, svgContainer);
    }
  }, [mapChartData, props]);

  if (!mapChartData) {
    return null;
  }
  const rs: ReplacementStrings = {
    place: props.place.name,
    date: mapChartData.dateRange,
  };
  return (
    <ChartTileContainer
      title={props.title}
      sources={mapChartData.sources}
      replacementStrings={rs}
      className="map-chart"
    >
      <div id={props.id} className="svg-container" ref={svgContainer}></div>
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
    .post("/api/observations/point/within", {
      parent_entity: placeDcid,
      child_type: enclosedPlaceType,
      variables: [mainStatVar],
      date: dataDate,
    })
    .then((resp) => resp.data);
  const populationPromise: Promise<SeriesApiResponse> = denomStatVar
    ? axios
        .post("/api/observations/series/within", {
          parent_entity: placeDcid,
          child_type: enclosedPlaceType,
          variables: [denomStatVar],
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
    .then(([geoJson, placeStat, population, parentPlaces]) => {
      setRawData({
        geoJson,
        placeStat: placeStat.data[mainStatVar],
        metadataMap: {
          ...placeStat.facets,
          ...population.facets,
        },
        population: population.data[denomStatVar],
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
  isPerCapita: boolean,
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
  });
}

function draw(
  chartData: MapChartData,
  props: MapTilePropType,
  svgContainer: React.RefObject<HTMLElement>
): void {
  const mainStatVar = props.statVarSpec.statVar;
  const width = svgContainer.current.offsetWidth;
  const colorScale = getColorScale(mainStatVar, chartData.dataValues);
  const getTooltipHtml = (place: NamedPlace) => {
    let value = "Data Missing";
    if (place.dcid in chartData.dataValues) {
      value = formatNumber(
        Math.round((chartData.dataValues[place.dcid] + Number.EPSILON) * 100) /
          100,
        props.statVarSpec.unit
      );
    }
    return place.name + ": " + value;
  };
  drawChoropleth(
    props.id,
    chartData.geoJson,
    CHART_HEIGHT,
    width,
    chartData.dataValues,
    props.statVarSpec.unit,
    colorScale,
    _.noop,
    getTooltipHtml,
    () => false,
    true,
    chartData.showMapBoundaries,
    chartData.isUsaPlace,
    props.place.dcid
  );
}
