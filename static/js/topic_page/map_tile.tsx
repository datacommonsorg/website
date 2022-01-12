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
import { StatApiResponse } from "../shared/stat_types";
import { NamedPlace } from "../shared/types";
import { getCappedStatVarDate } from "../shared/util";
import {
  DataPointMetadata,
  getPlaceChartData,
  getTitle,
} from "../tools/map/util";
import {
  GetStatSetResponse,
  PlacePointStat,
  StatMetadata,
} from "../tools/shared_util";
import { StatVarMetadata } from "../types/stat_var";
import { ChartTileContainer } from "./chart_tile";
import { CHART_HEIGHT } from "./constants";

interface MapTilePropType {
  id: string;
  title: string;
  placeDcid: string;
  enclosedPlaceType: string;
  isUsaPlace: boolean;
  statVarMetadata: StatVarMetadata;
}

interface RawData {
  geoJson: GeoJsonData;
  placeStat: PlacePointStat;
  metadataMap: Record<string, StatMetadata>;
  population: StatApiResponse;
}

interface MapChartData {
  dataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  sources: Set<string>;
  geoJson: GeoJsonData;
  chartTitle: string;
}

export function MapTile(props: MapTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const [rawData, setRawData] = useState<RawData | undefined>(null);
  const [mapChartData, setMapChartData] = useState<MapChartData | undefined>(
    null
  );

  useEffect(() => {
    fetchData(
      props.placeDcid,
      props.enclosedPlaceType,
      props.statVarMetadata.statVars[0].main,
      props.statVarMetadata.statVars[0].denom,
      setRawData
    );
  }, [
    props.placeDcid,
    props.enclosedPlaceType,
    props.statVarMetadata.statVars,
  ]);

  useEffect(() => {
    if (rawData) {
      processData(
        rawData,
        !_.isEmpty(props.statVarMetadata.statVars[0].denom),
        props.title,
        props.statVarMetadata.scaling,
        setMapChartData
      );
    }
  }, [rawData, props.statVarMetadata, props.title]);

  useEffect(() => {
    if (mapChartData) {
      draw(mapChartData, props, svgContainer);
    }
  }, [mapChartData, props]);

  if (!mapChartData) {
    return null;
  }
  return (
    <ChartTileContainer
      title={mapChartData.chartTitle}
      sources={mapChartData.sources}
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
  const geoJsonDataPromise = axios
    .get(
      `/api/choropleth/geojson?placeDcid=${placeDcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  const dataDate = getCappedStatVarDate(mainStatVar);
  const dateParam = dataDate ? `&date=${dataDate}` : "";
  const enclosedPlaceDataPromise: Promise<GetStatSetResponse> = axios
    .get(
      `/api/stats/within-place?parent_place=${placeDcid}&child_type=${enclosedPlaceType}&stat_vars=${mainStatVar}${dateParam}`
    )
    .then((resp) => resp.data);
  const populationPromise: Promise<StatApiResponse> = denomStatVar
    ? axios
        .get(
          `/api/stats/set/series/within-place?parent_place=${placeDcid}&child_type=${enclosedPlaceType}&stat_vars=${denomStatVar}`
        )
        .then((resp) => resp.data)
    : Promise.resolve({});
  Promise.all([geoJsonDataPromise, enclosedPlaceDataPromise, populationPromise])
    .then(([geoJson, placeStatData, population]) => {
      setRawData({
        geoJson,
        placeStat: placeStatData.data[mainStatVar],
        metadataMap: placeStatData.metadata,
        population,
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
  chartTitle: string,
  scaling: number,
  setChartData: (data: MapChartData) => void
): void {
  const dataValues = {};
  const metadata = {};
  const sources: Set<string> = new Set();
  const dates: Set<string> = new Set();
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
    chartTitle: getTitle(Array.from(dates), chartTitle, false),
    geoJson: rawData.geoJson,
  });
}

function draw(
  chartData: MapChartData,
  props: MapTilePropType,
  svgContainer: React.RefObject<HTMLElement>
): void {
  const mainStatVar = props.statVarMetadata.statVars[0].main;
  const width = svgContainer.current.offsetWidth;
  const colorScale = getColorScale(mainStatVar, chartData.dataValues);
  const getTooltipHtml = (place: NamedPlace) => {
    let value = "Data Missing";
    if (place.dcid in chartData.dataValues) {
      value = formatNumber(
        Math.round((chartData.dataValues[place.dcid] + Number.EPSILON) * 100) /
          100,
        props.statVarMetadata.unit
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
    props.statVarMetadata.unit,
    colorScale,
    _.noop,
    getTooltipHtml,
    () => false,
    true,
    true,
    props.isUsaPlace,
    props.placeDcid
  );
}
