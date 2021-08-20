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

import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import { GeoJsonData } from "../../chart/types";
import { getPopulationDate, getUnit, PlacePointStat } from "../shared_util";
import { Context, IsLoadingWrapper, PlaceInfo, StatVar } from "./context";
import { Chart } from "./chart";
import axios from "axios";
import { StatApiResponse } from "../../shared/data_fetcher";

interface ChartRawData {
  geoJsonData: GeoJsonData;
  statVarData: PlacePointStat;
  populationData: StatApiResponse;
}

export interface DataPointMetadata {
  popDate: string;
  popSource: string;
  statVarDate: string;
  statVarSource: string;
  errorMessage?: string;
}
interface ChartData {
  mapDataValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  breadcrumbDataValues: { [dcid: string]: number };
  sources: Set<string>;
  dates: Set<string>;
  geoJsonData: GeoJsonData;
  unit: string;
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
        rawData.statVarData[statVar.value.dcid],
        rawData.populationData,
        statVar.value.perCapita,
        rawData.geoJsonData,
        placeInfo.value,
        setChartData
      );
    }
  }, [rawData, statVar.value.perCapita]);
  if (
    _.isEmpty(chartData) ||
    _.isEmpty(chartData.mapDataValues) ||
    _.isEmpty(chartData.geoJsonData)
  ) {
    return null;
  }
  return (
    <div className="chart-region">
      <Chart
        geoJsonData={chartData.geoJsonData}
        mapDataValues={chartData.mapDataValues}
        metadata={chartData.metadata}
        breadcrumbDataValues={chartData.breadcrumbDataValues}
        placeInfo={placeInfo.value}
        statVar={statVar.value}
        dates={chartData.dates}
        sources={chartData.sources}
        unit={chartData.unit}
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
  const statVarDataPromise: Promise<PlacePointStat> = axios
    .get(
      `/api/stats/within-place?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.enclosedPlaceType}&stat_vars=${statVar.dcid}`
    )
    .then((resp) => resp.data[statVar.dcid]);
  Promise.all([populationPromise, geoJsonPromise, statVarDataPromise])
    .then(([populationData, geoJsonData, statVarData]) => {
      isLoading.setIsDataLoading(false);
      setRawData({
        geoJsonData,
        populationData,
        statVarData,
      });
    })
    .catch(() => {
      alert("Error fetching data.");
      isLoading.setIsDataLoading(false);
    });
}

// Takes fetched data and processes it to be in a form that can be used for
// rendering the chart component
function loadChartData(
  statVarData: PlacePointStat,
  populationData: StatApiResponse,
  isPerCapita: boolean,
  geoJsonData: GeoJsonData,
  placeInfo: PlaceInfo,
  setChartData: (data: ChartData) => void
): void {
  const mapDataValues = {};
  const metadata = {};
  const breadcrumbDataValues = {};
  const sourceSet: Set<string> = new Set();
  const statVarDates: Set<string> = new Set();
  if (_.isEmpty(statVarData)) {
    return;
  }
  for (const placeDcid in statVarData.stat) {
    if (_.isEmpty(statVarData.stat[placeDcid])) {
      continue;
    }
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
          metadata[placeDcid] = {
            popDate,
            popSource,
            statVarDate,
            statVarSource,
            errorMessage: "Invalid Data",
          };
          continue;
        }
        value = value / popValue;
        sourceSet.add(popSource);
      } else {
        metadata[placeDcid] = {
          popDate,
          popSource,
          statVarDate,
          statVarSource,
          errorMessage: "Population Data Missing",
        };
        continue;
      }
    }
    if (
      placeInfo.parentPlaces.find((place) => place.dcid === placeDcid) ||
      placeDcid === placeInfo.selectedPlace.dcid
    ) {
      breadcrumbDataValues[placeDcid] = value;
    } else {
      mapDataValues[placeDcid] = value;
      statVarDates.add(statVarDate);
    }
    if (
      placeDcid === placeInfo.selectedPlace.dcid &&
      placeInfo.selectedPlace.dcid !== placeInfo.enclosingPlace.dcid
    ) {
      mapDataValues[placeDcid] = value;
      statVarDates.add(statVarDate);
    }
    metadata[placeDcid] = {
      popDate,
      popSource,
      statVarDate,
      statVarSource,
    };
    sourceSet.add(statVarSource);
  }
  const unit = getUnit(statVarData);
  setChartData({
    breadcrumbDataValues,
    dates: statVarDates,
    geoJsonData,
    mapDataValues,
    metadata,
    sources: sourceSet,
    unit,
  });
}
