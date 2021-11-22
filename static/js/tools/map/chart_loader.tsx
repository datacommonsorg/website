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

import { GeoJsonData, GeoJsonFeature, MapPoint } from "../../chart/types";
import {
  EUROPE_NAMED_TYPED_PLACE,
  IPCC_PLACE_50_TYPE_DCID,
} from "../../shared/constants";
import { StatApiResponse } from "../../shared/stat_types";
import { getCappedStatVarDate } from "../../shared/util";
import {
  getPopulationDate,
  GetStatSetResponse,
  getUnit,
  PlacePointStatData,
  StatMetadata,
} from "../shared_util";
import { Chart } from "./chart";
import { Context, IsLoadingWrapper, PlaceInfo, StatVar } from "./context";
import { PlaceDetails } from "./place_details";
import { ENCLOSED_PLACE_TYPE_NAMES } from "./util";

const MANUAL_GEOJSON_DISTANCES = {
  [IPCC_PLACE_50_TYPE_DCID]: 0.5,
};

interface ChartRawData {
  geoJsonData: GeoJsonData;
  placeStatData: Record<string, PlacePointStatData>;
  metadataMap: Record<string, StatMetadata>;
  populationData: StatApiResponse;
  mapPointStatData: Record<string, PlacePointStatData>;
  mapPointsPromise: Promise<Array<MapPoint>>;
  europeanCountries: Array<string>;
}

export interface DataPointMetadata {
  popDate: string;
  popSource: string;
  placeStatDate: string;
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
  mapPointsPromise: Promise<Array<MapPoint>>;
  europeanCountries: Array<string>;
}

export function ChartLoader(): JSX.Element {
  const { placeInfo, statVar, isLoading, display } = useContext(Context);
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
  }, [
    placeInfo.value.enclosedPlaces,
    statVar.value.dcid,
    statVar.value.info,
    statVar.value.denom,
  ]);
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
  if (chartData === undefined) {
    return null;
  } else if (
    _.isEmpty(chartData) ||
    _.isEmpty(chartData.mapValues) ||
    _.isEmpty(chartData.geoJsonData)
  ) {
    return (
      <div className="p-5">
        {`Sorry, the selected variable ${
          statVar.value.info.title || statVar.value.dcid
        } is not available for places in ${
          placeInfo.value.selectedPlace.name
        } of type ${
          ENCLOSED_PLACE_TYPE_NAMES[placeInfo.value.enclosedPlaceType] ||
          placeInfo.value.enclosedPlaceType
        }. Please try a different variable or different place options.`}
      </div>
    );
  }
  return (
    <div className="chart-region">
      <Chart
        geoJsonData={chartData.geoJsonData}
        mapDataValues={chartData.mapValues}
        metadata={chartData.metadata}
        breadcrumbDataValues={chartData.breadcrumbDataValues}
        placeInfo={placeInfo.value}
        statVar={statVar}
        dates={chartData.dates}
        sources={chartData.sources}
        unit={chartData.unit}
        mapPointValues={chartData.mapPointValues}
        display={display}
        mapPointsPromise={chartData.mapPointsPromise}
        europeanCountries={chartData.europeanCountries}
      />
      <PlaceDetails
        breadcrumbDataValues={chartData.breadcrumbDataValues}
        mapDataValues={chartData.mapValues}
        placeInfo={placeInfo.value}
        metadata={chartData.metadata}
        unit={chartData.unit}
        statVar={statVar.value}
        geoJsonFeatures={chartData.geoJsonData.features}
        displayOptions={display.value}
        europeanCountries={chartData.europeanCountries}
      />
    </div>
  );
}

function getGeoJsonDataFeatures(
  placeDcids: string[],
  enclosedPlaceType: string
): GeoJsonFeature[] {
  const distance = MANUAL_GEOJSON_DISTANCES[enclosedPlaceType];
  if (!distance) {
    return [];
  }
  const geoJsonFeatures = [];
  for (const placeDcid of placeDcids) {
    const dcidPrefixSuffix = placeDcid.split("/");
    if (dcidPrefixSuffix.length < 2) {
      continue;
    }
    const latlon = dcidPrefixSuffix[1].split("_");
    if (latlon.length < 2) {
      continue;
    }
    const neLat = Number(latlon[0]) + distance / 2;
    const neLon = Number(latlon[1]) + distance / 2;
    const placeName = `${latlon[0]}, ${latlon[1]} (${distance} arc degree)`;
    // TODO: handle cases of overflowing 180 near the international date line
    // becasuse not sure if drawing libraries can handle this
    geoJsonFeatures.push({
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [neLon, neLat],
              [neLon, neLat - distance],
              [neLon - distance, neLat - distance],
              [neLon - distance, neLat],
              [neLon, neLat],
            ],
          ],
        ],
      },
      id: placeDcid,
      properties: { geoDcid: placeDcid, name: placeName },
      type: "Feature",
    });
  }
  return geoJsonFeatures;
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
  const breadcrumbPlaceDcids = placeInfo.parentPlaces.map(
    (namedPlace) => namedPlace.dcid
  );
  breadcrumbPlaceDcids.push(placeInfo.selectedPlace.dcid);
  const breadcrumbPopPromise: Promise<StatApiResponse> = axios
    .post(`/api/stats`, {
      statVars: [statVar.denom],
      places: breadcrumbPlaceDcids,
    })
    .then((resp) => resp.data);
  const enclosedPlacesPopPromise: Promise<StatApiResponse> = axios
    .get(
      "/api/stats/set/series/within-place" +
        `?parent_place=${placeInfo.enclosingPlace.dcid}` +
        `&child_type=${placeInfo.enclosedPlaceType}` +
        `&stat_vars=${statVar.denom}`
    )
    .then((resp) => resp.data);
  const geoJsonPromise = axios
    .get(
      `/api/choropleth/geojson?placeDcid=${placeInfo.enclosingPlace.dcid}&placeType=${placeInfo.enclosedPlaceType}`
    )
    .then((resp) => resp.data);

  let dataDate = "";
  const cappedDate = getCappedStatVarDate(statVar.dcid);
  // If there is a specified date, get the data for that date. If no specified
  // date, still need to cut data for prediction data that extends to 2099
  if (statVar.date) {
    dataDate = statVar.date;
  } else if (cappedDate) {
    dataDate = cappedDate;
  }
  const dateParam = dataDate ? `&date=${dataDate}` : "";
  const enclosedPlaceStatPromise: Promise<GetStatSetResponse> = axios
    .get(
      `/api/stats/within-place?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.enclosedPlaceType}&stat_vars=${statVar.dcid}${dateParam}`
    )
    .then((resp) => resp.data);
  const breadcrumbPlaceStatPromise: Promise<GetStatSetResponse> = axios
    .post("/api/stats/set", {
      places: breadcrumbPlaceDcids,
      stat_vars: [statVar.dcid],
      date: dataDate,
    })
    .then((resp) => {
      return resp.data;
    });

  const mapPointStatPromise: Promise<GetStatSetResponse> = placeInfo.mapPointPlaceType
    ? axios
        .get(
          `/api/stats/within-place?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.mapPointPlaceType}&stat_vars=${statVar.dcid}${dateParam}`
        )
        .then((resp) => {
          return resp.data;
        })
    : Promise.resolve(null);
  const mapPointsPromise: Promise<Array<MapPoint>> = placeInfo.mapPointPlaceType
    ? axios
        .get(
          `/api/choropleth/map-points?placeDcid=${placeInfo.enclosingPlace.dcid}&placeType=${placeInfo.mapPointPlaceType}`
        )
        .then((resp) => {
          return resp.data;
        })
    : Promise.resolve({});
  const europeanCountriesPromise: Promise<Array<string>> = axios
    .get(
      `/api/place/places-in?dcid=${EUROPE_NAMED_TYPED_PLACE.dcid}&placeType=Country`
    )
    .then((resp) => resp.data[EUROPE_NAMED_TYPED_PLACE.dcid]);
  Promise.all([
    breadcrumbPopPromise,
    enclosedPlacesPopPromise,
    geoJsonPromise,
    enclosedPlaceStatPromise,
    breadcrumbPlaceStatPromise,
    mapPointStatPromise,
    europeanCountriesPromise,
  ])
    .then(
      ([
        breadcrumbPopData,
        enclosedPlacesPopData,
        geoJsonData,
        enclosedPlaceStat,
        breadcrumbPlaceStat,
        mapPointStat,
        europeanCountries,
      ]) => {
        let metadataMap = enclosedPlaceStat.metadata;
        let placeStatData: Record<string, PlacePointStatData> =
          enclosedPlaceStat.data[statVar.dcid].stat;
        if (breadcrumbPlaceStat) {
          metadataMap = Object.assign(
            metadataMap,
            breadcrumbPlaceStat.metadata
          );
          placeStatData = Object.assign(
            placeStatData,
            breadcrumbPlaceStat.data[statVar.dcid].stat
          );
        }
        if (
          _.isEmpty(geoJsonData.features) &&
          placeInfo.enclosedPlaceType in MANUAL_GEOJSON_DISTANCES
        ) {
          const geoJsonFeatures = getGeoJsonDataFeatures(
            Object.keys(enclosedPlaceStat.data[statVar.dcid]),
            placeInfo.enclosedPlaceType
          );
          geoJsonData = {
            type: "FeatureCollection",
            properties: { current_geo: placeInfo.enclosingPlace.dcid },
            features: geoJsonFeatures,
          };
        }
        isLoading.setIsDataLoading(false);
        setRawData({
          geoJsonData,
          placeStatData,
          metadataMap,
          populationData: { ...enclosedPlacesPopData, ...breadcrumbPopData },
          mapPointStatData: mapPointStat
            ? mapPointStat.data[statVar.dcid].stat
            : {},
          mapPointsPromise,
          europeanCountries,
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
  placeStatData: Record<string, PlacePointStatData>,
  placeDcid: string,
  isPerCapita: boolean,
  populationData: StatApiResponse,
  metadataMap: Record<string, StatMetadata>
): PlaceChartData {
  if (_.isEmpty(placeStatData[placeDcid])) {
    return null;
  }
  let metadata = null;
  const sources = [];
  const placeStatDate = placeStatData[placeDcid].date;
  const metaHash = placeStatData[placeDcid].metaHash;
  const statVarSource = metadataMap[metaHash].provenanceUrl;
  let value =
    placeStatData[placeDcid].value === undefined
      ? 0
      : placeStatData[placeDcid].value;
  let popDate = "";
  let popSource = "";
  if (isPerCapita) {
    const popSeries =
      placeDcid in populationData
        ? Object.values(populationData[placeDcid].data)[0]
        : {};
    if (!_.isEmpty(popSeries)) {
      popDate = getPopulationDate(popSeries, placeStatData[placeDcid]);
      const popValue = popSeries.val[popDate];
      popSource = popSeries.metadata.provenanceUrl;
      if (popValue === 0) {
        metadata = {
          popDate,
          popSource,
          placeStatDate,
          statVarSource,
          errorMessage: "Invalid Data",
        };
        return { metadata, sources, date: placeStatDate, value };
      }
      value = value / popValue;
      sources.push(popSource);
    } else {
      metadata = {
        popDate,
        popSource,
        placeStatDate,
        statVarSource,
        errorMessage: "Population Data Missing",
      };
      return { metadata, sources, date: placeStatDate, value };
    }
  }
  metadata = {
    popDate,
    popSource,
    placeStatDate,
    statVarSource,
  };
  sources.push(statVarSource);
  return { metadata, sources, date: placeStatDate, value };
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
  if (_.isNull(rawData.placeStatData)) {
    return;
  }
  // populate mapValues with data value for each geo that we have geoJson data for.
  for (const geoFeature of rawData.geoJsonData.features) {
    const placeDcid = geoFeature.properties.geoDcid;
    const placeChartData = getPlaceChartData(
      rawData.placeStatData,
      placeDcid,
      isPerCapita,
      rawData.populationData,
      rawData.metadataMap
    );
    if (_.isEmpty(placeChartData)) {
      continue;
    }
    mapValues[placeDcid] = placeChartData.value;
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
  // populate breadcrumbDataValues with data value for selected place and each parent place.
  for (const place of placeInfo.parentPlaces.concat([
    placeInfo.selectedPlace,
  ])) {
    const placeChartData = getPlaceChartData(
      rawData.placeStatData,
      place.dcid,
      isPerCapita,
      rawData.populationData,
      rawData.metadataMap
    );
    if (_.isEmpty(placeChartData)) {
      continue;
    }
    breadcrumbDataValues[place.dcid] = placeChartData.value;
    if (!_.isEmpty(placeChartData.metadata)) {
      metadata[place.dcid] = placeChartData.metadata;
    }
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sourceSet.add(source);
      }
    });
  }
  const mapPointValues = {};
  if (!_.isEmpty(rawData.mapPointStatData)) {
    for (const placeDcid in rawData.mapPointStatData) {
      const placeChartData = getPlaceChartData(
        rawData.mapPointStatData,
        placeDcid,
        false,
        {},
        rawData.metadataMap
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
  const unit = getUnit(rawData.placeStatData, rawData.metadataMap);
  setChartData({
    breadcrumbDataValues,
    dates: statVarDates,
    geoJsonData: rawData.geoJsonData,
    mapPointsPromise: rawData.mapPointsPromise,
    mapPointValues,
    mapValues,
    metadata,
    sources: sourceSet,
    unit,
    europeanCountries: rawData.europeanCountries,
  });
}
