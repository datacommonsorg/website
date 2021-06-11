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
import {
  getPopulationDate,
  getUnit,
  PlacePointStat,
  SourceSeries,
} from "../shared_util";
import { Context, IsLoadingWrapper, PlaceInfo, StatVarInfo } from "./context";
import { Chart } from "./chart";
import axios from "axios";

interface ChartRawData {
  geoJsonData: GeoJsonData;
  statVarData: PlacePointStat;
  populationData: { [dcid: string]: SourceSeries };
}

interface ChartData {
  mapDataValues: { [dcid: string]: number };
  breadcrumbDataValues: { [dcid: string]: number };
  sources: Set<string>;
  statVarDates: { [dcid: string]: string };
  geoJsonData: GeoJsonData;
  unit: string;
}

export function ChartLoader(): JSX.Element {
  const { placeInfo, statVarInfo, isLoading } = useContext(Context);
  const [rawData, setRawData] = useState<ChartRawData | undefined>(undefined);
  const [chartData, setChartData] = useState<ChartData | undefined>(undefined);
  useEffect(() => {
    const placesLoaded =
      !_.isEmpty(placeInfo.value.enclosingPlace.dcid) &&
      !_.isEmpty(placeInfo.value.enclosedPlaces) &&
      !_.isNull(placeInfo.value.parentPlaces);
    if (placesLoaded && !_.isEmpty(statVarInfo.value.statVar)) {
      fetchData(placeInfo.value, statVarInfo.value, isLoading, setRawData);
    } else {
      setRawData(undefined);
    }
  }, [placeInfo.value, statVarInfo.value.statVar]);
  useEffect(() => {
    if (!_.isEmpty(rawData)) {
      loadChartData(
        rawData.statVarData[_.findKey(statVarInfo.value.statVar)],
        rawData.populationData,
        statVarInfo.value.perCapita,
        rawData.geoJsonData,
        placeInfo.value,
        setChartData
      );
    }
  }, [rawData, statVarInfo.value.perCapita]);
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
        breadcrumbDataValues={chartData.breadcrumbDataValues}
        placeInfo={placeInfo.value}
        statVarInfo={statVarInfo.value}
        statVarDates={chartData.statVarDates}
        sources={chartData.sources}
        unit={chartData.unit}
      />
    </div>
  );
}

// Fetches the data needed for the charts.
function fetchData(
  placeInfo: PlaceInfo,
  statVarInfo: StatVarInfo,
  isLoading: IsLoadingWrapper,
  setRawData: (data: ChartRawData) => void
): void {
  isLoading.setIsDataLoading(true);
  const statVarDcid = _.findKey(statVarInfo.statVar);
  if (!statVarDcid) {
    return;
  }
  const denomStatVars = Object.values(statVarInfo.statVar)[0].denominators;
  const populationStatVar = _.isEmpty(denomStatVars)
    ? "Count_Person"
    : denomStatVars[0];
  const enclosingPlaceDcid = placeInfo.enclosingPlace.dcid;
  const enclosedPlaceType = placeInfo.enclosedPlaceType;
  const breadcrumbPlaceDcids = placeInfo.parentPlaces.map(
    (namedPlace) => namedPlace.dcid
  );
  breadcrumbPlaceDcids.push(enclosingPlaceDcid);
  const populationPromise = axios
    .post(`/api/stats/${populationStatVar}`, {
      dcid: placeInfo.enclosedPlaces.concat(breadcrumbPlaceDcids),
    })
    .then((resp) => resp.data);
  const geoJsonPromise = axios
    .get(
      `/api/choropleth/geo2?placeDcid=${enclosingPlaceDcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  const statVarDataPromise = axios
    .post("/api/stats/set", {
      places: placeInfo.enclosedPlaces.concat(breadcrumbPlaceDcids),
      stat_vars: statVarDcid,
    })
    .then((resp) => resp.data);
  Promise.all([populationPromise, geoJsonPromise, statVarDataPromise])
    .then(([populationData, geoJsonData, statVarData]) => {
      isLoading.setIsDataLoading(false);
      setRawData({
        geoJsonData,
        populationData,
        statVarData: statVarData.data,
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
  populationData: { [dcid: string]: SourceSeries },
  isPerCapita: boolean,
  geoJsonData: GeoJsonData,
  placeInfo: PlaceInfo,
  setChartData: (data: ChartData) => void
): void {
  const mapDataValues = {};
  const breadcrumbDataValues = {};
  const sources: Set<string> = new Set();
  const statVarDates = {};
  for (const dcid in statVarData.stat) {
    if (_.isEmpty(statVarData.stat[dcid])) {
      continue;
    }
    let statVarValue = statVarData.stat[dcid].value;
    if (isPerCapita) {
      if (dcid in populationData) {
        const popDate = getPopulationDate(
          populationData[dcid],
          statVarData.stat[dcid]
        );
        const popValue = populationData[dcid].data[popDate];
        statVarValue =
          popValue === 0
            ? statVarValue
            : statVarValue / populationData[dcid].data[popDate];
        sources.add(populationData[dcid].provenanceUrl);
      } else {
        continue;
      }
    }
    if (
      placeInfo.parentPlaces.find((place) => place.dcid === dcid) ||
      dcid === placeInfo.enclosingPlace.dcid
    ) {
      breadcrumbDataValues[dcid] = statVarValue;
    } else {
      mapDataValues[dcid] = statVarValue;
    }
    const importName = statVarData.stat[dcid].metadata.importName;
    sources.add(statVarData.metadata[importName].provenanceUrl);
    statVarDates[dcid] = statVarData.stat[dcid].date;
  }
  const unit = getUnit(statVarData);
  setChartData({
    breadcrumbDataValues,
    geoJsonData,
    mapDataValues,
    sources,
    statVarDates,
    unit,
  });
}
