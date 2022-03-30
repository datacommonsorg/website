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
import { CustomInput } from "reactstrap";

import { GeoJsonData, GeoJsonFeature, MapPoint } from "../../chart/types";
import {
  EUROPE_NAMED_TYPED_PLACE,
  IPCC_PLACE_50_TYPE_DCID,
} from "../../shared/constants";
import { StatApiResponse } from "../../shared/stat_types";
import { StatVarSummary } from "../../shared/types";
import { getCappedStatVarDate } from "../../shared/util";
import {
  GetPlaceStatDateWithinPlaceResponse,
  GetStatSetAllResponse,
  GetStatSetResponse,
  getUnit,
  PlacePointStat,
  PlacePointStatAll,
  StatMetadata,
} from "../shared_util";
import { Chart } from "./chart";
import { Context, DisplayOptionsWrapper, IsLoadingWrapper, PlaceInfo, StatVar, StatVarWrapper } from "./context";
import { PlaceDetails } from "./place_details";
import {
  DataPointMetadata,
  ENCLOSED_PLACE_TYPE_NAMES,
  getLegendBounds,
  getMetaText,
  getPlaceChartData,
  getSampleDates,
} from "./util";

const MANUAL_GEOJSON_DISTANCES = {
  [IPCC_PLACE_50_TYPE_DCID]: 0.5,
};

interface ChartRawData {
  geoJsonData: GeoJsonData;
  placeStat: PlacePointStat;
  allPlaceStat: Record<string, PlacePointStat>;
  metadataMap: Record<string, StatMetadata>;
  population: StatApiResponse;
  breadcrumbPlaceStat: PlacePointStat;
  mapPointStat: PlacePointStat;
  mapPointsPromise: Promise<Array<MapPoint>>;
  europeanCountries: Array<string>;
  dataDate: string;
  sampleDates: Record<string, Array<string>>;
  legendBounds: Record<string, [number, number, number]>;
}

interface ChartData {
  mapValues: { [dcid: string]: number };
  metadata: { [dcid: string]: DataPointMetadata };
  breadcrumbValues: { [dcid: string]: number };
  sources: Set<string>;
  dates: Set<string>;
  geoJsonData: GeoJsonData;
  unit: string;
  mapPointValues: { [dcid: string]: number };
  mapPointsPromise: Promise<Array<MapPoint>>;
  europeanCountries: Array<string>;
  rankingLink: string;
  sampleDates: Array<string>;
  metahash: string;
}

export function ChartLoader(): JSX.Element {
  const { placeInfo, statVar, isLoading, display } = useContext(Context);
  const [rawData, setRawData] = useState<ChartRawData | undefined>(undefined);
  const [chartData, setChartData] = useState<ChartData | undefined>(undefined);
  const [sampleDatesChartData, setSampleDatesChartData] = useState<
    Record<string, Record<string, ChartRawData>>
  >({});
  const [onPlayCallback, setOnPlayCallback] = useState<() => void>(undefined);

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
    statVar.value.mapPointSv,
  ]);

  useEffect(() => {
    if (!_.isEmpty(rawData)) {
      loadChartData(rawData, placeInfo.value, statVar.value, setChartData, display);
      if (statVar.value.perCapita) {
        setLegendBoundsPerCapita(rawData, statVar, display);
      }
    }
  }, [rawData, statVar.value.perCapita]);

  useEffect(() => {
    if (onPlayCallback) {
      onPlayCallback();
    }
  }, [sampleDatesChartData]);

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
  const sourceList = getMetaList(
    Object.keys(rawData.allPlaceStat),
    rawData.metadataMap
  );

  const onPlay = async (metahash: string, callback: () => void) => {
    setOnPlayCallback(() => callback);
    if (metahash in sampleDatesChartData) {
      callback();
      return;
    }
    fetchData(
      placeInfo.value,
      statVar.value,
      isLoading,
      setRawData,
      metahash,
      rawData.sampleDates[metahash],
      sampleDatesChartData,
      setSampleDatesChartData
    );
  };

  const updateDate = (metahash: string, date: string) => {
    // Check if any data is fetched at all for the date
    let placeStatData = false;
    for (const place in sampleDatesChartData[metahash][date].placeStat.stat) {
      if (sampleDatesChartData[metahash][date].placeStat.stat[place].value) {
        placeStatData = true;
        break;
      }
    }

    // Skip update if date has no data
    if (
      placeStatData ||
      (metahash != "Best Available" &&
        sampleDatesChartData[metahash][date].allPlaceStat[metahash].stat)
    ) {
      loadChartData(
        sampleDatesChartData[metahash][date],
        placeInfo.value,
        statVar.value,
        setChartData,
        display,
        metahash == "BestAvailable" ? "" : metahash,
      );
    }
  };

  return (
    <div className="chart-region">
      <Chart
        geoJsonData={chartData.geoJsonData}
        mapDataValues={chartData.mapValues}
        metadata={chartData.metadata}
        breadcrumbDataValues={chartData.breadcrumbValues}
        placeInfo={placeInfo.value}
        statVar={statVar}
        dates={chartData.dates}
        sources={chartData.sources}
        unit={chartData.unit}
        mapPointValues={chartData.mapPointValues}
        display={display}
        mapPointsPromise={chartData.mapPointsPromise}
        europeanCountries={chartData.europeanCountries}
        rankingLink={chartData.rankingLink}
        sampleDates={chartData.sampleDates}
        metahash={chartData.metahash}
        onPlay={onPlay}
        updateDate={updateDate}
      />
      <div id="source-picker">
        <span>Pick Source</span>
        <CustomInput
          id="source-select"
          type="select"
          defaultValue="Best Available"
          onChange={(e) => {
            loadChartData(
              rawData,
              placeInfo.value,
              statVar.value,
              setChartData,
              display,
              e.target.value,
            );
          }}
        >
          <option value="Best Available">Best Available</option>
          {sourceList.map((source) => (
            <option value={source.metaHash} key={source.metaHash}>
              {source.text}
            </option>
          ))}
        </CustomInput>
      </div>
      <PlaceDetails
        breadcrumbDataValues={chartData.breadcrumbValues}
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

function getMetaList(
  metaHashList: string[],
  metadataMap: Record<string, StatMetadata>
): { metaHash: string; text: string }[] {
  const result = metaHashList.map((m) => {
    return {
      metaHash: m,
      text: getMetaText(metadataMap[m]),
    };
  });
  result.sort((a, b) => (a.text > b.text ? 1 : -1));
  return result;
}

// Fetches the data needed for the charts.
function fetchData(
  placeInfo: PlaceInfo,
  statVar: StatVar,
  isLoading: IsLoadingWrapper,
  setRawData: (data: ChartRawData) => void,
  metahash?: string,
  currentSampleDates?: Array<string>,
  sampleDatesChartData?: Record<string, Record<string, ChartRawData>>,
  setSampleDatesChartData?: (
    data: Record<string, Record<string, ChartRawData>>
  ) => void
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
  const geoJsonDataPromise = axios
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
  const enclosedPlaceDataPromise: Promise<GetStatSetResponse> = axios
    .get(
      `/api/stats/within-place?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.enclosedPlaceType}&stat_vars=${statVar.dcid}${dateParam}`
    )
    .then((resp) => resp.data);
  const allEnclosedPlaceDataPromise: Promise<GetStatSetAllResponse> = axios
    .get(
      `/api/stats/within-place/all?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.enclosedPlaceType}&stat_vars=${statVar.dcid}${dateParam}`
    )
    .then((resp) => resp.data);
  const breadcrumbPlaceDataPromise: Promise<GetStatSetResponse> = axios
    .post("/api/stats/set", {
      places: breadcrumbPlaceDcids,
      stat_vars: [statVar.dcid],
      date: dataDate,
    })
    .then((resp) => {
      return resp.data;
    });

  // Optionally compute for each sample date
  const enclosedPlaceDatesList: Array<Promise<GetStatSetResponse>> = [];
  const allEnclosedPlaceDatesList: Array<Promise<GetStatSetAllResponse>> = [];
  const breadcrumbPlaceDatesList: Array<Promise<GetStatSetResponse>> = [];
  if (metahash && currentSampleDates) {
    for (const i in currentSampleDates) {
      enclosedPlaceDatesList.push(
        axios
          .get(
            `/api/stats/within-place?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.enclosedPlaceType}&stat_vars=${statVar.dcid}&date=${currentSampleDates[i]}`
          )
          .then((resp) => resp.data)
      );
      allEnclosedPlaceDatesList.push(
        axios
          .get(
            `/api/stats/within-place/all?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.enclosedPlaceType}&stat_vars=${statVar.dcid}&date=${currentSampleDates[i]}`
          )
          .then((resp) => resp.data)
      );
      breadcrumbPlaceDatesList.push(
        axios
          .post("/api/stats/set", {
            places: breadcrumbPlaceDcids,
            stat_vars: [statVar.dcid],
            date: currentSampleDates[i],
          })
          .then((resp) => {
            return resp.data;
          })
      );
    }
  }
  const enclosedPlaceDatesPromise = Promise.all(enclosedPlaceDatesList);
  const allEnclosedPlaceDatesPromise = Promise.all(allEnclosedPlaceDatesList);
  const breadcrumbPlaceDatesPromise = Promise.all(breadcrumbPlaceDatesList);

  const mapPointSv = statVar.mapPointSv || statVar.dcid;
  const mapPointDataPromise: Promise<GetStatSetResponse> = placeInfo.mapPointPlaceType
    ? axios
        .get(
          `/api/stats/within-place?parent_place=${placeInfo.enclosingPlace.dcid}&child_type=${placeInfo.mapPointPlaceType}&stat_vars=${mapPointSv}`
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
  const statVarSummaryPromise: Promise<StatVarSummary> = axios
    .post("/api/stats/stat-var-summary", { statVars: [statVar.dcid] })
    .then((resp) => resp.data);
  const placeStatDateWithinPlacePromise: Promise<GetPlaceStatDateWithinPlaceResponse> = axios
    .get(
      `/api/stat/date/within-place?ancestor_place=${placeInfo.enclosingPlace.dcid}&childPlaceType=${placeInfo.enclosedPlaceType}&stat_vars=${statVar.dcid}`
    )
    .then((resp) => resp.data);
  Promise.all([
    geoJsonDataPromise,
    breadcrumbPopPromise,
    breadcrumbPlaceDataPromise,
    enclosedPlacesPopPromise,
    enclosedPlaceDataPromise,
    allEnclosedPlaceDataPromise,
    mapPointDataPromise,
    europeanCountriesPromise,
    statVarSummaryPromise,
    placeStatDateWithinPlacePromise,
    enclosedPlaceDatesPromise,
    allEnclosedPlaceDatesPromise,
    breadcrumbPlaceDatesPromise,
  ])
    .then(
      ([
        geoJsonData,
        breadcrumbPlacePop,
        breadcrumbPlaceData,
        enclosedPlacesPop,
        enclosedPlaceData,
        allEnclosedPlaceData,
        mapPointData,
        europeanCountries,
        statVarSummary,
        placeStatDateWithinPlace,
        enclosedPlaceDatesData,
        allEnclosedPlaceDatesData,
        breadcrumbPlaceDatesData,
      ]) => {
        // Stat data
        const enclosedPlaceStat: PlacePointStat =
          enclosedPlaceData.data[statVar.dcid];
        // Parent place data
        const breadcrumbPlaceStat: PlacePointStat =
          breadcrumbPlaceData.data[statVar.dcid];
        // All stat data
        const allEnclosedPlaceStat: PlacePointStatAll =
          allEnclosedPlaceData.data[statVar.dcid];
        const allPlaceStat: Record<string, PlacePointStat> = {};
        if (!_.isEmpty(allEnclosedPlaceStat)) {
          for (const stat of allEnclosedPlaceStat.statList) {
            if (stat.metaHash) {
              allPlaceStat[stat.metaHash] = stat;
            }
          }
        }
        // Metadata map
        let metadataMap = enclosedPlaceData.metadata || {};
        metadataMap = Object.assign(metadataMap, allEnclosedPlaceData.metadata);
        if (breadcrumbPlaceData.metadata) {
          metadataMap = Object.assign(
            metadataMap,
            breadcrumbPlaceData.metadata
          );
        }
        if (mapPointData && mapPointData.metadata) {
          Object.assign(metadataMap, mapPointData.metadata);
        }
        if (
          _.isEmpty(geoJsonData.features) &&
          placeInfo.enclosedPlaceType in MANUAL_GEOJSON_DISTANCES
        ) {
          const geoJsonFeatures = getGeoJsonDataFeatures(
            Object.keys(enclosedPlaceStat.stat),
            placeInfo.enclosedPlaceType
          );
          geoJsonData = {
            type: "FeatureCollection",
            properties: { current_geo: placeInfo.enclosingPlace.dcid },
            features: geoJsonFeatures,
          };
        }
        const sampleDates: Record<string, Array<string>> = getSampleDates(
          metadataMap,
          placeStatDateWithinPlace.data[statVar.dcid].statDate,
        );
        const bestAvailableHash = sampleDates["Best Available"][0];
        sampleDates["Best Available"] = sampleDates[sampleDates["Best Available"][0]];
        const legendBounds: Record<string, [number, number, number]> = getLegendBounds(metadataMap, statVarSummary[statVar.dcid].provenanceSummary, placeInfo.enclosedPlaceType, bestAvailableHash);
        isLoading.setIsDataLoading(false);
        if (metahash && currentSampleDates) {
          const currentSampleDatesData: Record<string, ChartRawData> = {};
          for (const i in currentSampleDates) {
            const enclosedPlaceStatSample: PlacePointStat =
              enclosedPlaceDatesData[i].data[statVar.dcid];
            const breadcrumbPlaceStatSample: PlacePointStat =
              breadcrumbPlaceDatesData[i].data[statVar.dcid];
            const allEnclosedPlaceStatSample: PlacePointStatAll =
              allEnclosedPlaceDatesData[i].data[statVar.dcid];
            const allPlaceStatSample: Record<string, PlacePointStat> = {};
            if (!_.isEmpty(allEnclosedPlaceStatSample)) {
              for (const stat of allEnclosedPlaceStatSample.statList) {
                if (stat.metaHash) {
                  allPlaceStatSample[stat.metaHash] = stat;
                }
              }
            }
            currentSampleDatesData[currentSampleDates[i]] = {
              geoJsonData,
              placeStat: enclosedPlaceStatSample,
              allPlaceStat: allPlaceStatSample,
              breadcrumbPlaceStat: breadcrumbPlaceStatSample,
              metadataMap,
              population: { ...enclosedPlacesPop, ...breadcrumbPlacePop },
              mapPointStat: mapPointData ? mapPointData.data[mapPointSv] : null,
              mapPointsPromise,
              europeanCountries,
              dataDate,
              sampleDates,
              legendBounds,
            };
          }
          let newSampleDatesChartData: Record<
            string,
            Record<string, ChartRawData>
          > = {};
          if (Object.entries(sampleDatesChartData).length > 0) {
            newSampleDatesChartData = Object.assign(
              newSampleDatesChartData,
              sampleDatesChartData
            );
          }
          newSampleDatesChartData[metahash] = currentSampleDatesData;
          setSampleDatesChartData(newSampleDatesChartData);
        } else {
          setRawData({
            geoJsonData,
            placeStat: enclosedPlaceStat,
            allPlaceStat,
            breadcrumbPlaceStat,
            metadataMap,
            population: { ...enclosedPlacesPop, ...breadcrumbPlacePop },
            mapPointStat: mapPointData ? mapPointData.data[mapPointSv] : null,
            mapPointsPromise,
            europeanCountries,
            dataDate,
            sampleDates,
            legendBounds,
          });
        }
      }
    )
    .catch(() => {
      alert("Error fetching data.");
      isLoading.setIsDataLoading(false);
    });
}

function getRankingLink(
  statVar: StatVar,
  placeDcid: string,
  placeType: string,
  date: string,
  unit: string
): string {
  let params = "";
  params += statVar.perCapita ? "&pc=1" : "";
  params += unit ? `&unit=${unit}` : "";
  params += date ? `&date=${date}` : "";
  return `/ranking/${statVar.dcid}/${placeType}/${placeDcid}?${params}`;
}

// Takes fetched data and processes it to be in a form that can be used for
// rendering the chart component
function loadChartData(
  rawData: ChartRawData,
  placeInfo: PlaceInfo,
  statVar: StatVar,
  setChartData: (data: ChartData) => void,
  display: DisplayOptionsWrapper,
  metaHash?: string,
): void {
  const mapValues = {};
  const metadata = {};
  const breadcrumbValues = {};
  const sourceSet: Set<string> = new Set();
  const statVarDates: Set<string> = new Set();
  if (_.isNull(rawData.placeStat)) {
    return;
  }
  // populate mapValues with data value for each geo that we have geoJson data for.
  for (const geoFeature of rawData.geoJsonData.features) {
    const placeDcid = geoFeature.properties.geoDcid;
    const placeChartData = getPlaceChartData(
      metaHash &&
        metaHash in rawData.allPlaceStat &&
        rawData.allPlaceStat[metaHash].stat
        ? rawData.allPlaceStat[metaHash]
        : rawData.placeStat,
      placeDcid,
      statVar.perCapita,
      rawData.population,
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
      rawData.breadcrumbPlaceStat,
      place.dcid,
      statVar.perCapita,
      rawData.population,
      rawData.metadataMap
    );
    if (_.isEmpty(placeChartData)) {
      continue;
    }
    breadcrumbValues[place.dcid] = placeChartData.value;
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
  if (!_.isEmpty(rawData.mapPointStat)) {
    for (const placeDcid in rawData.mapPointStat.stat) {
      const placeChartData = getPlaceChartData(
        rawData.mapPointStat,
        placeDcid,
        false,
        {},
        rawData.metadataMap
      );
      if (_.isNull(placeChartData)) {
        continue;
      }
      mapPointValues[placeDcid] = placeChartData.value;
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
  const unit = getUnit(rawData.placeStat, rawData.metadataMap);
  const sampleDates = metaHash
    ? rawData.sampleDates[metaHash]
    : rawData.sampleDates["Best Available"];
  if (!statVar.perCapita) {
    display.set({
      ...display.value,
      domain: metaHash
      ? rawData.legendBounds[metaHash]
      : rawData.legendBounds["Best Available"],
    });
  }
  setChartData({
    breadcrumbValues,
    dates: statVarDates,
    geoJsonData: rawData.geoJsonData,
    mapPointsPromise: rawData.mapPointsPromise,
    mapPointValues,
    mapValues,
    metadata,
    sources: sourceSet,
    unit,
    europeanCountries: rawData.europeanCountries,
    rankingLink: getRankingLink(
      statVar,
      placeInfo.selectedPlace.dcid,
      placeInfo.enclosedPlaceType,
      rawData.dataDate,
      unit
    ),
    sampleDates,
    metahash: metaHash || "Best Available",
  });
}

/**
 * Set legend bounds when per capita is selected. This will use an estimate based on
 * Best Available instead of the min/max from the StatVarSummary.
 * @param rawData
 * @param display
 */
 export function setLegendBoundsPerCapita(rawData: ChartRawData, statVar: StatVarWrapper, display: DisplayOptionsWrapper): void {
  const stat = rawData.placeStat.stat;
  let minValue: number = Number.MAX_SAFE_INTEGER,
    maxValue = 0;
  for (const place in stat) {
    if (!stat[place].value) {
      continue;
    }
    let value = stat[place].value;
    const populationData = rawData.population[place].data;
    const date = stat[place].date;
    if (
      statVar.value.denom in populationData &&
      populationData[statVar.value.denom].val &&
      date in populationData[statVar.value.denom].val
    ) {
      value /= populationData[statVar.value.denom].val[date];
    } else {
      continue;
    }
    if (value < minValue) {
      minValue = value;
    }
    if (value > maxValue) {
      maxValue = value;
    }
  }

  // Using Best Available data as estimate - give some padding for other dates
  minValue = minValue > 0 ? minValue * 0.9 : minValue * 1.1;
  maxValue = maxValue > 0 ? maxValue * 1.1 : maxValue * 0.9;
  display.set({
    ...display.value,
    domain: [minValue, (minValue + maxValue) / 2, maxValue],
  });
}