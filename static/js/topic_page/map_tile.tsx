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
import React, { useEffect, useState } from "react";

import { drawChoropleth, getColorScale } from "../chart/draw_choropleth";
import { GeoJsonData } from "../chart/types";
import { formatNumber } from "../i18n/i18n";
import { StatApiResponse } from "../shared/stat_types";
import { NamedPlace } from "../shared/types";
import { getCappedStatVarDate, urlToDomain } from "../shared/util";
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

const CHART_HEIGHT = 400;
const SVG_CONTAINER_ELEMENT: React.RefObject<HTMLDivElement> = React.createRef();

interface MapTilePropType {
  tileId: string;
  placeDcid: string;
  enclosedPlaceType: string;
  statVarDcid: string;
  chartTitle: string;
  isUsaPlace: boolean;
  denomDcid?: string;
  unit?: string;
  scaling?: number;
}

interface RawData {
  geoJson: GeoJsonData;
  placeStat: PlacePointStat;
  metadataMap: Record<string, StatMetadata>;
  population: StatApiResponse;
}

interface ChartData {
  dataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  sources: Set<string>;
  geoJson: GeoJsonData;
  chartTitle: string;
}

export function MapTile(props: MapTilePropType): JSX.Element {
  const [rawData, setRawData] = useState<RawData | undefined>(null);
  const [chartData, setChartData] = useState<ChartData | undefined>(null);
  const sourcesJsx = chartData ? getSourcesJsx(chartData.sources) : [];

  useEffect(() => {
    fetchData(
      props.placeDcid,
      props.enclosedPlaceType,
      props.statVarDcid,
      setRawData,
      props.denomDcid
    );
  }, []);

  useEffect(() => {
    if (rawData) {
      processData(
        rawData,
        !_.isEmpty(props.denomDcid),
        props.chartTitle,
        setChartData,
        props.scaling
      );
    }
  }, [rawData]);

  useEffect(() => {
    if (chartData) {
      drawMap(chartData, props);
    }
  }, [chartData]);

  return (
    <div className="chart-container">
      {chartData && (
        <>
          <div className="map-title">
            <h4>{chartData.chartTitle}</h4>
          </div>
          <div
            id={props.tileId}
            className="svg-container"
            ref={SVG_CONTAINER_ELEMENT}
          ></div>
          <div className="map-footer">
            <div className="sources">Data from {sourcesJsx}</div>
          </div>
        </>
      )}
    </div>
  );
}

function fetchData(
  placeDcid: string,
  enclosedPlaceType: string,
  statVarDcid: string,
  setRawData: (data: RawData) => void,
  denomDcid?: string
): void {
  const geoJsonDataPromise = axios
    .get(
      `/api/choropleth/geojson?placeDcid=${placeDcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  const dataDate = getCappedStatVarDate(statVarDcid);
  const dateParam = dataDate ? `&date=${dataDate}` : "";
  const enclosedPlaceDataPromise: Promise<GetStatSetResponse> = axios
    .get(
      `/api/stats/within-place?parent_place=${placeDcid}&child_type=${enclosedPlaceType}&stat_vars=${statVarDcid}${dateParam}`
    )
    .then((resp) => resp.data);
  const populationPromise: Promise<StatApiResponse> = denomDcid
    ? axios
        .get(
          `/api/stats/set/series/within-place?parent_place=${placeDcid}&child_type=${enclosedPlaceType}&stat_vars=${denomDcid}`
        )
        .then((resp) => resp.data)
    : Promise.resolve({});
  Promise.all([geoJsonDataPromise, enclosedPlaceDataPromise, populationPromise])
    .then(([geoJson, placeStatData, population]) => {
      setRawData({
        geoJson,
        placeStat: placeStatData.data[statVarDcid],
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
  setChartData: (data: ChartData) => void,
  scaling?: number
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

function drawMap(chartData: ChartData, props: MapTilePropType): void {
  const width = SVG_CONTAINER_ELEMENT.current.offsetWidth;
  const colorScale = getColorScale(props.statVarDcid, chartData.dataValues);
  const getTooltipHtml = (place: NamedPlace) => {
    let value = "Data Missing";
    if (place.dcid in chartData.dataValues) {
      value = formatNumber(
        Math.round((chartData.dataValues[place.dcid] + Number.EPSILON) * 100) /
          100,
        props.unit
      );
    }
    return place.name + ": " + value;
  };
  drawChoropleth(
    props.tileId,
    chartData.geoJson,
    CHART_HEIGHT,
    width,
    chartData.dataValues,
    props.unit,
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

function getSourcesJsx(sources: Set<string>): JSX.Element[] {
  const sourceList: string[] = Array.from(sources);
  const seenSourceDomains = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    const domain = urlToDomain(source);
    if (seenSourceDomains.has(domain)) {
      return null;
    }
    seenSourceDomains.add(domain);
    return (
      <span key={source}>
        {index > 0 ? ", " : ""}
        <a href={source}>{domain}</a>
      </span>
    );
  });
  return sourcesJsx;
}
