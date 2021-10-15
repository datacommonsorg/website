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
 * Component for retrieving and transforming data into a form ready for drawing
 * and passing the data to a `Chart` component that draws the choropleth.
 */

import axios from "axios";
import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import { GeoJsonData, MapPoint } from "../../chart/types";
import { MAX_DATE } from "../../shared/constants";
import { StatApiResponse } from "../../shared/stat_types";

interface ChartRawData {
  geoJsonData: GeoJsonData;
  statVarData: PlacePointStat;
  populationData: StatApiResponse;
  mapPointValues: PlacePointStat;
  mapPoints: Array<MapPoint>;
}

export interface DataPointMetadata {
  popDate: string;
  popSource: string;
  statVarDate: string;
  statVarSource: string;
  errorMessage?: string;
}
interface ChartData {
  mapValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  breadcrumbDataValues: { [dcid: string]: number };
  sources: Set<string>;
  dates: Set<string>;
  geoJsonData: GeoJsonData;
  unit: string;
  mapPointValues: { [dcid: string]: number };
  mapPoints: Array<MapPoint>;
}

export function ChartLoader(): JSX.Element {
  const { placeInfo, statVar, isLoading } = useContext(Context);
  const [rawData, setRawData] = useState<ChartRawData | undefined>(undefined);
  const [chartData, setChartData] = useState<ChartData | undefined>(undefined);
  useEffect(() => {
    const placesLoaded =
      !_.isEmpty(placeInfo.value.enclosingPlace.dcid) &&
      !_.isEmpty(placeInfo.value.enclosedPlaces) &&
      !_.isNull(placeInfo.value.parentPlaces);
    if (
      placesLoaded &&
      !_.isEmpty(statVar.value.dcid) &&
      !_.isNull(statVar.value.info)
    ) {
      fetchData(placeInfo.value, statVar.value, isLoading, setRawData);
    } else {
      setRawData(undefined);
    }
  }, [placeInfo.value.enclosedPlaces, statVar.value.dcid, statVar.value.info]);
  useEffect(() => {
    if (!_.isEmpty(rawData)) {
      loadChartData(
        rawData,
        statVar.value.perCapita,
        placeInfo.value,
        setChartData
      );
    }
  }, [rawData, statVar.value.perCapita]);
  if (
    _.isEmpty(chartData) ||
    _.isEmpty(chartData.mapValues) ||
    _.isEmpty(chartData.geoJsonData)
  ) {
    return null;
  }
  return (
    <div className="chart-region">
      <Chart
        geoJsonData={chartData.geoJsonData}
        mapDataValues={chartData.mapValues}
        metadata={chartData.metadata}
        breadcrumbDataValues={chartData.breadcrumbDataValues}
        placeInfo={placeInfo.value}
        statVar={statVar.value}
        dates={chartData.dates}
        sources={chartData.sources}
        unit={chartData.unit}
        mapPointValues={chartData.mapPointValues}
        mapPoints={chartData.mapPoints}
      />
    </div>
  );
}

// Fetches the data needed for the charts.
function fetchData(
  placeInfo: PlaceInfo,
  statVar: StatVar,
  isLoading: IsLoadingWrapper,
  setRawData: (data: ChartRawData) => void
): void {
  isLoading.setIsDataLoading(true);
  if (!statVar.dcid) {
    return;
  }
  const populationStatVar = "Count_Person";
  const breadcrumbPlaceDcids = placeInfo.parentPlaces.map(
    (namedPlace) => namedPlace.dcid
  );
  breadcrumbPlaceDcids.push(placeInfo.selectedPlace.dcid);
  const enclosedPlaceDcids = placeInfo.enclosedPlaces.map(
    (namedPlace) => namedPlace.dcid
  );
  const populationPromise: Promise<StatApiResponse> = axios
    .post(`/api/stats`, {
      statVars: [populationStatVar],
      places: enclosedPlaceDcids.concat(breadcrumbPlaceDcids),
    })
    .then((resp) => resp.data);
  const geoJsonPromise = axios
    .get(
      `/api/choropleth/geojson?placeDcid=${placeInfo.enclosingPlace.dcid}&placeType=${placeInfo.enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  let statVarDataUrl = `/api/stats/within-place?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.enclosedPlaceType}&stat_vars=${statVar.dcid}`;
  // Only cut the data for prediction data that extends to 2099
  if (shouldCapStatVarDate(statVar.dcid)) {
    statVarDataUrl += `&date=${MAX_DATE}`;
  }
  const statVarDataPromise: Promise<PlacePointStat> = axios
    .get(statVarDataUrl)
    .then((resp) => resp.data[statVar.dcid]);
  const breadcrumbDataPromise: Promise<PlacePointStat> = axios
    .post("/api/stats/set", {
      places: breadcrumbPlaceDcids,
      stat_vars: [statVar.dcid],
    })
    .then((resp) => (resp.data.data ? resp.data.data[statVar.dcid] : null));
  const mapPointValuesPromise: Promise<PlacePointStat> = placeInfo.mapPointsPlaceType
    ? axios
        .get(
          `/api/stats/within-place?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.mapPointsPlaceType}&stat_vars=${statVar.dcid}`
        )
        .then((resp) => resp.data[statVar.dcid])
    : Promise.resolve({});
  const mapPointsPromise: Promise<Array<
    MapPoint
  >> = placeInfo.mapPointsPlaceType
    ? axios
        .get(
          `/api/choropleth/map-points?placeDcid=${placeInfo.enclosingPlace.dcid}&placeType=${placeInfo.mapPointsPlaceType}`
        )
        .then((resp) => resp.data)
    : Promise.resolve({});
  Promise.all([
    populationPromise,
    geoJsonPromise,
    statVarDataPromise,
    breadcrumbDataPromise,
    mapPointValuesPromise,
    mapPointsPromise,
  ])
    .then(
      ([
        populationData,
        geoJsonData,
        mapStatVarData,
        breadcrumbData,
        mapPointValues,
        mapPoints,
      ]) => {
        let statVarDataMetadata = mapStatVarData ? mapStatVarData.metadata : {};
        let statVarDataStat = mapStatVarData ? mapStatVarData.stat : {};
        if (breadcrumbData) {
          statVarDataMetadata = Object.assign(
            statVarDataMetadata,
            breadcrumbData.metadata
          );
          statVarDataStat = Object.assign(statVarDataStat, breadcrumbData.stat);
        }
        const statVarData = {
          metadata: statVarDataMetadata,
          stat: statVarDataStat,
        };
        isLoading.setIsDataLoading(false);
        setRawData({
          geoJsonData,
          mapPointValues,
          mapPoints,
          populationData,
          statVarData,
        });
      }
    )
    .catch(() => {
      alert("Error fetching data.");
      isLoading.setIsDataLoading(false);
    });
}

interface PlaceChartData {
  metadata: DataPointMetadata;
  sources: Array<string>;
  date: string;
  value: number;
}

function getPlaceChartData(
  statVarData: PlacePointStat,
  placeDcid: string,
  isPerCapita: boolean,
  populationData: StatApiResponse
): PlaceChartData {
  if (_.isEmpty(statVarData.stat[placeDcid])) {
    return null;
  }
  let metadata = null;
  const sources = [];
  const statVarDate = statVarData.stat[placeDcid].date;
  const importName = statVarData.stat[placeDcid].metadata.importName;
  const statVarSource = statVarData.metadata[importName].provenanceUrl;
  let value = statVarData.stat[placeDcid].value;
  let popDate = "";
  let popSource = "";
  if (isPerCapita) {
    if (placeDcid in populationData) {
      const popSeries = Object.values(populationData[placeDcid].data)[0];
      popDate = getPopulationDate(popSeries, statVarData.stat[placeDcid]);
      const popValue = popSeries.val[popDate];
      popSource = popSeries.metadata.provenanceUrl;
      if (popValue === 0) {
        metadata = {
          popDate,
          popSource,
          statVarDate,
          statVarSource,
          errorMessage: "Invalid Data",
        };
        return;
      }
      value = value / popValue;
      sources.push(popSource);
    } else {
      metadata[placeDcid] = {
        popDate,
        popSource,
        statVarDate,
        statVarSource,
        errorMessage: "Population Data Missing",
      };
      return;
    }
  }
  metadata = {
    popDate,
    popSource,
    statVarDate,
    statVarSource,
  };
  sources.push(statVarSource);
  return { metadata, sources, date: statVarDate, value };
}

// Takes fetched data and processes it to be in a form that can be used for
// rendering the chart component
function loadChartData(
  rawData: ChartRawData,
  isPerCapita: boolean,
  placeInfo: PlaceInfo,
  setChartData: (data: ChartData) => void
): void {
  const mapValues = {};
  const metadata = {};
  const breadcrumbDataValues = {};
  const sourceSet: Set<string> = new Set();
  const statVarDates: Set<string> = new Set();
  if (_.isNull(rawData.statVarData)) {
    return;
  }
  for (const placeDcid in rawData.statVarData.stat) {
    const placeChartData = getPlaceChartData(
      rawData.statVarData,
      placeDcid,
      isPerCapita,
      rawData.populationData
    );
    if (_.isEmpty(placeChartData)) {
      continue;
    }
    if (
      placeInfo.parentPlaces.find((place) => place.dcid === placeDcid) ||
      placeDcid === placeInfo.selectedPlace.dcid
    ) {
      breadcrumbDataValues[placeDcid] = placeChartData.value;
    } else {
      mapValues[placeDcid] = placeChartData.value;
      statVarDates.add(placeChartData.date);
    }
    if (
      placeDcid === placeInfo.selectedPlace.dcid &&
      placeInfo.selectedPlace.dcid !== placeInfo.enclosingPlace.dcid
    ) {
      mapValues[placeDcid] = placeChartData.value;
      statVarDates.add(placeChartData.date);
    }
    if (!_.isEmpty(placeChartData.metadata)) {
      metadata[placeDcid] = placeChartData.metadata;
    }
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sourceSet.add(source);
      }
    });
  }
  const mapPointValues = {};
  if (!_.isEmpty(rawData.mapPointValues)) {
    for (const placeDcid in rawData.mapPointValues.stat) {
      const placeChartData = getPlaceChartData(
        rawData.mapPointValues,
        placeDcid,
        false,
        {}
      );
      if (_.isNull(placeChartData)) {
        continue;
      }
      mapPointValues[placeDcid] = placeChartData.value;
      statVarDates.add(placeChartData.date);
      if (!_.isEmpty(placeChartData.metadata)) {
        metadata[placeDcid] = placeChartData.metadata;
      }
      placeChartData.sources.forEach((source) => {
        if (!_.isEmpty(source)) {
          sourceSet.add(source);
        }
      });
    }
  }
  const unit = getUnit(rawData.statVarData);
  setChartData({
    breadcrumbDataValues,
    dates: statVarDates,
    geoJsonData: rawData.geoJsonData,
    mapPoints: rawData.mapPoints,
    mapPointValues,
    mapValues,
    metadata,
    sources: sourceSet,
    unit,
  });
}
