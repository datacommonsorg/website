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
  PlacePointStat,
  SourceSeries,
} from "../shared_util";
import { Context, IsLoadingWrapper, PlaceInfo, StatVarInfo } from "./context";
import { Chart } from "./chart";
import axios from "axios";

interface MapRawData {
  geoJsonData: GeoJsonData;
  statVarData: PlacePointStat;
  populationData: { [dcid: string]: SourceSeries };
}

interface ChartData {
  dataValues: { [dcid: string]: number };
  sources: Set<string>;
  statVarDates: { [dcid: string]: string };
  geoJsonData: GeoJsonData;
}

export function ChartLoader(): JSX.Element {
  const { placeInfo, statVarInfo, isLoading } = useContext(Context);
  const [data, setData] = useState<MapRawData | undefined>(undefined);
  const [chartData, setChartData] = useState<ChartData | undefined>(undefined);
  useEffect(() => {
    const placesLoaded =
      !_.isEmpty(placeInfo.value.enclosingPlace.dcid) &&
      !_.isEmpty(placeInfo.value.enclosedPlaces);
    if (placesLoaded && !_.isEmpty(statVarInfo.value.statVar)) {
      loadData(placeInfo.value, statVarInfo.value, isLoading, setData);
    } else {
      setData(undefined);
    }
  }, [placeInfo.value, statVarInfo.value.statVar]);
  useEffect(() => {
    if (!_.isEmpty(data)) {
      loadChartData(
        data.statVarData[_.findKey(statVarInfo.value.statVar)],
        data.populationData,
        statVarInfo.value.perCapita,
        data.geoJsonData,
        setChartData
      );
    }
  }, [data, statVarInfo.value.perCapita]);
  if (
    _.isEmpty(chartData) ||
    _.isEmpty(chartData.dataValues) ||
    _.isEmpty(chartData.geoJsonData)
  ) {
    return null;
  }
  return (
    <div className="chart-region">
      <Chart
        geoJsonData={chartData.geoJsonData}
        dataValues={chartData.dataValues}
        placeInfo={placeInfo.value}
        statVarInfo={statVarInfo.value}
        statVarDates={chartData.statVarDates}
        sources={chartData.sources}
      />
    </div>
  );
}

function loadData(
  placeInfo: PlaceInfo,
  statVarInfo: StatVarInfo,
  isLoading: IsLoadingWrapper,
  setData: (data: MapRawData) => void
): void {
  isLoading.setIsDataLoading(true);
  const statVarDcid = _.findKey(statVarInfo.statVar);
  const denomStatVars = Object.values(statVarInfo.statVar)[0].denominators;
  const populationStatVar = _.isEmpty(denomStatVars)
    ? "Count_Person"
    : denomStatVars[0];
  const enclosingPlaceDcid = placeInfo.enclosingPlace.dcid;
  const enclosedPlaceType = placeInfo.enclosedPlaceType;
  const statVarDataPromise = axios
    .get(
      `/api/stats/within-place?parent_place=${enclosingPlaceDcid}&child_type=${enclosedPlaceType}&stat_vars=${statVarDcid}`
    )
    .then((resp) => resp.data);
  const populationPromise = axios
    .post(`/api/stats/${populationStatVar}`, {
      dcid: placeInfo.enclosedPlaces,
    })
    .then((resp) => resp.data);
  const geoJsonPromise = axios
    .get(
      `/api/choropleth/geo2?placeDcid=${enclosingPlaceDcid}&placeType=${enclosedPlaceType}`
    )
    .then((resp) => resp.data);
  Promise.all([statVarDataPromise, populationPromise, geoJsonPromise])
    .then(([statVarData, populationData, geoJsonData]) => {
      isLoading.setIsDataLoading(false);
      setData({
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

function loadChartData(
  statVarData: PlacePointStat,
  populationData: { [dcid: string]: SourceSeries },
  isPerCapita: boolean,
  geoJsonData: GeoJsonData,
  setChartData: (data: ChartData) => void
): void {
  const dataValues = {};
  const sources: Set<string> = new Set();
  const statVarDates = {};
  for (const dcid in statVarData.stat) {
    if (_.isEmpty(statVarData.stat[dcid])) {
      continue;
    }
    const statVarValue = statVarData.stat[dcid].value;
    const importName = statVarData.stat[dcid].metadata.importName;
    sources.add(statVarData.metadata[importName].provenanceUrl);
    statVarDates[dcid] = statVarData.stat[dcid].date;
    if (isPerCapita && dcid in populationData) {
      const popDate = getPopulationDate(
        populationData[dcid],
        statVarData.stat[dcid]
      );
      dataValues[dcid] = statVarValue / populationData[dcid].data[popDate];
      sources.add(populationData[dcid].provenanceUrl);
    } else if (!isPerCapita) {
      dataValues[dcid] = statVarValue;
    }
  }
  setChartData({ dataValues, sources, statVarDates, geoJsonData });
}
