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
 * Utility functions shared across different components of map explorer.
 */

import _ from "lodash";

import { GeoJsonFeature } from "../../chart/types";
import { NO_FULL_COVERAGE_PLACE_TYPES } from "../../constants/map_constants";
import {
  BANGLADESH_PLACE_DCID,
  CHINA_PLACE_DCID,
  DEFAULT_POPULATION_DCID,
  EUROPE_NAMED_TYPED_PLACE,
  INDIA_PLACE_DCID,
  IPCC_PLACE_50_TYPE_DCID,
  NEPAL_PLACE_DCID,
  PAKISTAN_PLACE_DCID,
  USA_PLACE_DCID,
} from "../../shared/constants";
import {
  EntityObservation,
  EntitySeries,
  ObservationDate,
  StatMetadata,
} from "../../shared/stat_types";
import {
  DataPointMetadata,
  NamedPlace,
  NamedTypedPlace,
  ProvenanceSummary,
  SampleDates,
} from "../../shared/types";
import { getCappedStatVarDate } from "../../shared/util";
import { getUnit } from "../../utils/stat_metadata_utils";
import { getDateRange } from "../../utils/string_utils";
import { getMatchingObservation } from "../shared_util";
import { DisplayOptions, PlaceInfo, StatVar } from "./context";

const URL_PARAM_DOMAIN_SEPARATOR = ":";
export const URL_PARAM_KEYS = {
  SELECTED_PLACE_DCID: "pd",
  ENCLOSED_PLACE_TYPE: "ept",
  MAP_POINTS_PLACE_TYPE: "ppt",
  PER_CAPITA: "pc",
  STAT_VAR_DCID: "sv",
  DATE: "dt",
  COLOR: "color",
  DOMAIN: "domain",
  DENOM: "denom",
  MAP_POINTS: "mp",
  MAP_POINTS_SV: "mapsv",
  SV_METAHASH: "src",
  TIME_SLIDER: "ts",
};
const SV_REGEX_INSTALLATION_MAPPING = {
  Emissions: "EpaReportingFacility",
  AirPollutant: "AirQualitySite",
};

const NUM_SAMPLE_DATES = 10;

const ALL_PLACE_CHILD_TYPES = {
  Planet: ["Country"],
  Continent: ["Country", IPCC_PLACE_50_TYPE_DCID],
  Country: [IPCC_PLACE_50_TYPE_DCID],
};

const USA_CHILD_PLACE_TYPES = {
  Country: ["State", "County"],
  State: ["County", "City", "CensusTract", "CensusZipCodeTabulationArea"],
  County: ["County", "City", "CensusTract", "CensusZipCodeTabulationArea"],
  CensusRegion: ["State", "County"],
  CensusDivision: ["State", "County"],
};

const AA1_AA2_CHILD_PLACE_TYPES = {
  Country: ["AdministrativeArea1", "AdministrativeArea2"],
  AdministrativeArea1: ["AdministrativeArea2"],
  State: ["AdministrativeArea2"],
  AdministrativeArea2: ["AdministrativeArea2"],
};

const AA1_AA3_CHILD_PLACE_TYPES = {
  AdministrativeArea1: ["AdministrativeArea3"],
  AdministrativeArea2: ["AdministrativeArea3"],
  Country: ["AdministrativeArea1", "AdministrativeArea3"],
  State: ["AdministrativeArea3"],
};

const EUROPE_CHILD_PLACE_TYPES = {
  Continent: ["EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  Country: ["EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS1: ["EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS2: ["EurostatNUTS3"],
  EurostatNUTS3: ["EurostatNUTS3"],
};

const AA1_AA2_PLACES = new Set([
  INDIA_PLACE_DCID,
  BANGLADESH_PLACE_DCID,
  NEPAL_PLACE_DCID,
  CHINA_PLACE_DCID,
]);

const CHILD_PLACE_TYPE_MAPPING = {
  [USA_PLACE_DCID]: USA_CHILD_PLACE_TYPES,
  [PAKISTAN_PLACE_DCID]: AA1_AA3_CHILD_PLACE_TYPES,
  [EUROPE_NAMED_TYPED_PLACE.dcid]: EUROPE_CHILD_PLACE_TYPES,
};

export const CHART_LOADER_SCREEN = "chart-loader-screen";

export const ALLOW_LEAFLET_URL_ARG = "leaflet";
export const DEFAULT_DISPLAY_OPTIONS = {
  color: "",
  domain: null,
  showMapPoints: false,
  showTimeSlider: false,
  allowLeaflet: false,
};

export const ALL_MAP_PLACE_TYPES = {
  Planet: "",
  Continent: "",
  Country: "",
  State: "",
  County: "",
  AdministrativeArea1: "",
  AdministrativeArea2: "",
  EurostatNUTS1: "",
  EurostatNUTS2: "",
  EurostatNUTS3: "",
};

export const MANUAL_GEOJSON_DISTANCES = {
  [IPCC_PLACE_50_TYPE_DCID]: 0.5,
};

// list of place types in the US in the order of high to low granularity.
export const USA_PLACE_HIERARCHY = ["Country", "State", "County"];
export const MAP_URL_PATH = "/tools/map";

/**
 * Parses the hash and get the date.
 * @param params the params in the hash
 */
export function applyHashDate(params: URLSearchParams): string {
  return params.get(URL_PARAM_KEYS.DATE) || "";
}

/**
 * Parses the hash and produces a StatVar
 * @param params the params in the hash
 */
export function applyHashStatVar(params: URLSearchParams): StatVar {
  const dcid = params.get(URL_PARAM_KEYS.STAT_VAR_DCID);
  const denom = params.get(URL_PARAM_KEYS.DENOM);
  const mapPointSv = params.get(URL_PARAM_KEYS.MAP_POINTS_SV);
  const metahash = params.get(URL_PARAM_KEYS.SV_METAHASH);
  if (!dcid) {
    return {
      dcid: "",
      perCapita: false,
      info: null,
      denom: "",
      mapPointSv: "",
      metahash: "",
    };
  }
  const perCapita = params.get(URL_PARAM_KEYS.PER_CAPITA);
  return {
    dcid,
    perCapita: perCapita && perCapita === "1" ? true : false,
    info: null,
    denom: denom ? denom : DEFAULT_POPULATION_DCID,
    mapPointSv: mapPointSv ? mapPointSv : "",
    metahash: metahash ? metahash : "",
  };
}

/**
 * Parses the hash and produces a PlaceInfo
 * @param params the params in the hash
 */
export function applyHashPlaceInfo(params: URLSearchParams): PlaceInfo {
  const selectedPlaceDcid = params.get(URL_PARAM_KEYS.SELECTED_PLACE_DCID);
  const enclosedPlaceType = params.get(URL_PARAM_KEYS.ENCLOSED_PLACE_TYPE);
  const mapPointPlaceType = params.get(URL_PARAM_KEYS.MAP_POINTS_PLACE_TYPE);
  return {
    selectedPlace: {
      dcid: selectedPlaceDcid ? selectedPlaceDcid : "",
      name: "",
      types: null,
    },
    enclosingPlace: {
      dcid: "",
      name: "",
    },
    enclosedPlaceType: enclosedPlaceType ? enclosedPlaceType : "",
    parentPlaces: null,
    mapPointPlaceType: mapPointPlaceType ? mapPointPlaceType : "",
  };
}

/**
 * Parses the hash and produces a DisplayOptions
 * @param params the params in the hash
 */
export function applyHashDisplay(params: URLSearchParams): DisplayOptions {
  const color = params.get(URL_PARAM_KEYS.COLOR);
  const domainParamValue = params.get(URL_PARAM_KEYS.DOMAIN);
  const domain = domainParamValue
    ? domainParamValue
        .split(URL_PARAM_DOMAIN_SEPARATOR)
        .map((val) => Number(val))
    : [];
  const showMapPoints = params.get(URL_PARAM_KEYS.MAP_POINTS);
  const showTimeSlider = params.get(URL_PARAM_KEYS.TIME_SLIDER);
  // the allow leaflet param is in the search query instead of the url hash
  const allowLeaflet = new URLSearchParams(location.search).get(
    ALLOW_LEAFLET_URL_ARG
  );
  return {
    color,
    domain: domain.length === 3 ? (domain as [number, number, number]) : null,
    showMapPoints: showMapPoints && showMapPoints === "1" ? true : false,
    showTimeSlider: showTimeSlider && showTimeSlider === "1" ? true : false,
    allowLeaflet: allowLeaflet && allowLeaflet === "1" ? true : false,
  };
}

/**
 * Updates the hash based on date and returns the new hash
 * @param hash the current hash
 * @param date the date to update the hash with
 */
export function updateHashDate(hash: string, date: string): string {
  const dateParam = date ? `&${URL_PARAM_KEYS.DATE}=${date}` : "";
  return hash + dateParam;
}

/**
 * Updates the hash based on a StatVar and returns the new hash
 * @param hash the current hash
 * @param statVar the StatVar to update the hash with
 */
export function updateHashStatVar(hash: string, statVar: StatVar): string {
  if (_.isEmpty(statVar.dcid)) {
    return hash;
  }
  const perCapita = statVar.perCapita ? "1" : "0";
  const mapPointParam = statVar.mapPointSv
    ? `&${URL_PARAM_KEYS.MAP_POINTS_SV}=${statVar.mapPointSv}`
    : "";
  const metahashParam = statVar.metahash
    ? `&${URL_PARAM_KEYS.SV_METAHASH}=${statVar.metahash}`
    : "";
  const denomParam = statVar.denom
    ? `&${URL_PARAM_KEYS.DENOM}=${statVar.denom}`
    : "";
  const params =
    `&${URL_PARAM_KEYS.STAT_VAR_DCID}=${statVar.dcid}` +
    `&${URL_PARAM_KEYS.PER_CAPITA}=${perCapita}` +
    denomParam +
    metahashParam +
    mapPointParam;
  return hash + params;
}

/**
 * Updates the hash based on a PlaceInfo and returns the new hash
 * @param hash the current hash
 * @param placeInfo the PlaceInfo to update the hash with
 */
export function updateHashPlaceInfo(
  hash: string,
  placeInfo: PlaceInfo
): string {
  if (_.isEmpty(placeInfo.selectedPlace.dcid)) {
    return hash;
  }
  let params = `&${URL_PARAM_KEYS.SELECTED_PLACE_DCID}=${placeInfo.selectedPlace.dcid}`;
  if (!_.isEmpty(placeInfo.enclosedPlaceType)) {
    params = `${params}&${URL_PARAM_KEYS.ENCLOSED_PLACE_TYPE}=${placeInfo.enclosedPlaceType}`;
  }
  if (!_.isEmpty(placeInfo.mapPointPlaceType)) {
    params = `${params}&${URL_PARAM_KEYS.MAP_POINTS_PLACE_TYPE}=${placeInfo.mapPointPlaceType}`;
  }
  return hash + params;
}

/**
 * Updates the hash based on DisplayOptions and returns the new hash
 * @param hash the current hash
 * @param placeInfo the DisplayOptions to update the hash with
 */
export function updateHashDisplay(
  hash: string,
  display: DisplayOptions
): string {
  let params = "";
  if (display.showMapPoints) {
    params = `${params}&${URL_PARAM_KEYS.MAP_POINTS}=${
      display.showMapPoints ? "1" : "0"
    }`;
  }
  if (display.showTimeSlider) {
    params = `${params}&${URL_PARAM_KEYS.TIME_SLIDER}=${
      display.showTimeSlider ? "1" : "0"
    }`;
  }
  if (display.color) {
    params = `${params}&${URL_PARAM_KEYS.COLOR}=${display.color}`;
  }
  if (display.domain) {
    params = `${params}&${URL_PARAM_KEYS.DOMAIN}=${display.domain.join(
      URL_PARAM_DOMAIN_SEPARATOR
    )}`;
  }
  return hash + params;
}

/**
 * Get the link to the map explorer page for a given place and stat var
 * @param statVar the stat var of the map page to redirect to
 * @param selectedPlace the place of the map page to redirect to
 * @param parentPlaces the parent places of the place we are redirecting to
 * @param mapPointsPlaceType the map points place type of the map page to redirect to
 */
export function getRedirectLink(
  statVar: StatVar,
  selectedPlace: NamedTypedPlace,
  parentPlaces: NamedPlace[],
  mapPointPlaceType: string,
  displayOptions: DisplayOptions
): string {
  // When url formation is updated here, make sure to also update the updateHash
  // function in ./app.tsx
  let hash = updateHashStatVar("", statVar);
  hash = updateHashDisplay(hash, displayOptions);
  const enclosedPlaceTypes = getAllChildPlaceTypes(selectedPlace, parentPlaces);
  hash = updateHashPlaceInfo(hash, {
    enclosedPlaceType:
      enclosedPlaceTypes.length == 1 ? enclosedPlaceTypes[0] : "",
    enclosingPlace: { dcid: "", name: "" },
    mapPointPlaceType,
    parentPlaces: [],
    selectedPlace,
  });
  let args = "";
  if (displayOptions.allowLeaflet) {
    args += `?${ALLOW_LEAFLET_URL_ARG}=1`;
  }
  return `${MAP_URL_PATH}${args}#${encodeURIComponent(hash)}`;
}

/**
 * Given a stat var, get the place type for plotting map points
 * @param svDcid dcid of the stat var to plot map points for
 */
export function getMapPointPlaceType(svDcid: string): string {
  for (const svRegex in SV_REGEX_INSTALLATION_MAPPING) {
    if (svDcid.match(svRegex)) {
      return SV_REGEX_INSTALLATION_MAPPING[svRegex];
    }
  }
  return "";
}

/**
 * For a place, get its list of child place types that a map can be drawn for
 * @param place place to get the child place types for
 * @param parentPlaces parent places of the place of interest
 */
export function getAllChildPlaceTypes(
  place: NamedTypedPlace,
  parentPlaces: NamedPlace[]
): string[] {
  let mapTypeChildTypes = {};
  if (place.types.indexOf("Eurostat") === 0) {
    // If place is a Eurostat place, use the europe child place types
    mapTypeChildTypes = EUROPE_CHILD_PLACE_TYPES;
  } else {
    // Iterate through parent places (including the current place) to figure out
    // which child place type mapping to use.
    for (const parentPlace of [place, ...parentPlaces]) {
      if (parentPlace.dcid in CHILD_PLACE_TYPE_MAPPING) {
        mapTypeChildTypes = CHILD_PLACE_TYPE_MAPPING[parentPlace.dcid];
        break;
      }
      if (AA1_AA2_PLACES.has(parentPlace.dcid)) {
        mapTypeChildTypes = AA1_AA2_CHILD_PLACE_TYPES;
        break;
      }
    }
  }
  const childPlaceTypes = [];
  for (const type of place.types) {
    if (type in mapTypeChildTypes) {
      childPlaceTypes.push(...mapTypeChildTypes[type]);
      break;
    }
  }
  for (const type in ALL_PLACE_CHILD_TYPES) {
    if (place.types.indexOf(type) > -1) {
      childPlaceTypes.push(...ALL_PLACE_CHILD_TYPES[type]);
    }
  }
  return childPlaceTypes.filter(
    (type, idx) => childPlaceTypes.indexOf(type) === idx
  );
}

/**
 * For a place and related parent place list (this related parent place list can
 * be the parent place list for the selected place or a child or parent of the
 * selected place) get the parent place list for the selected place
 * @param place place to get parent place list for
 * @param enclosingPlace parent of selected place
 * @param parentPlaces related parent place list
 */
export function getParentPlaces(
  place: NamedPlace,
  enclosingPlace: NamedPlace,
  parentPlaces: NamedPlace[]
): NamedPlace[] {
  const parentPlacesList = _.cloneDeep(parentPlaces);
  const idxInParentPlaces = parentPlaces.findIndex(
    (parentPlace) => parentPlace.dcid === place.dcid
  );
  if (idxInParentPlaces > -1) {
    parentPlacesList.splice(0, idxInParentPlaces + 1);
  } else {
    if (
      !parentPlacesList.find(
        (parentPlace) => parentPlace.dcid === enclosingPlace.dcid
      )
    ) {
      parentPlacesList.unshift(enclosingPlace);
    }
  }
  return parentPlacesList;
}

interface PlaceChartData {
  metadata: DataPointMetadata;
  sources: Array<string>;
  date: string;
  value: number;
  unit?: string;
}

/**
 * For a place, extract the chart data for that place
 * @param placeStatData values for each statistical variable for each place
 * @param placeDcid place to extract the chart data for
 * @param calculateRatio whether to compute ratio
 * @param populationData population (for ratio calculation) data for each
 * @param metadataMap map of metahash to stat metadata
 */
export function getPlaceChartData(
  placeStatData: EntityObservation,
  placeDcid: string,
  calculateRatio: boolean,
  populationData: EntitySeries,
  metadataMap: Record<string, StatMetadata>
): PlaceChartData {
  const stat = placeDcid in placeStatData ? placeStatData[placeDcid] : null;
  if (_.isEmpty(stat)) {
    return null;
  }
  const sources = [];
  const placeStatDate = stat.date;
  const facetId = stat.facet;
  const statVarSource = metadataMap[facetId].provenanceUrl;
  let value = stat.value === undefined ? 0 : stat.value;
  const metadata: DataPointMetadata = {
    popDate: "",
    popSource: "",
    placeStatDate,
    statVarSource,
  };
  if (calculateRatio) {
    const placePopData =
      placeDcid in populationData ? populationData[placeDcid] : null;
    if (_.isNull(placePopData) || _.isEmpty(placePopData.series)) {
      metadata.errorMessage = "Population Data Unavailable";
      return { metadata, sources, date: placeStatDate, value };
    }
    const popFacetId = placePopData.facet;
    const popSeries = placePopData.series;
    const popSource = metadataMap[popFacetId].provenanceUrl;
    metadata.popSource = popSource;
    const popObs = getMatchingObservation(popSeries, stat.date);
    if (!popObs) {
      metadata.errorMessage = "Population Data Unavailable";
      return { metadata, sources, date: placeStatDate, value };
    }
    metadata.popDate = popObs.date;
    if (popObs.value === 0) {
      metadata.errorMessage = "Population data is 0";
      return { metadata, sources, date: placeStatDate, value };
    }
    value = value / popObs.value;
    sources.push(popSource);
  }
  sources.push(statVarSource);
  const unit = getUnit(metadataMap[facetId]);
  return { metadata, sources, date: placeStatDate, value, unit };
}

/**
 * Get the chart title
 * @param statVarDates set of all dates of data values in the chart
 * @param statVarName name of the stat var
 * @param isPerCapita whether the chart is a per capita chart
 */
export function getTitle(
  statVarDates: string[],
  statVarName: string,
  isPerCapita
): string {
  const dateRange = `(${getDateRange(statVarDates)})`;
  const perCapitaString = isPerCapita ? " Per Capita" : "";
  return `${statVarName}${perCapitaString} ${dateRange}`;
}

/**
 * Builds metatext from StatMetadata used for the source selector.
 * @param metadata
 */
export function getMetaText(metadata: StatMetadata): string {
  let result = `[${metadata.importName}]`;
  let first = true;
  for (const text of [
    metadata.measurementMethod,
    metadata.observationPeriod,
    metadata.scalingFactor,
    metadata.unit,
  ]) {
    if (text) {
      if (!first) {
        result += ", ";
      }
      result += text;
      first = false;
    }
  }
  return result;
}

/**
 * Return a map of metahash to metatext.
 * @param metadataMap
 */
export function getMetahashMap(
  metadataMap: Record<string, StatMetadata>
): Record<string, string> {
  const metahashMap: Record<string, string> = {};
  for (const metahash in metadataMap) {
    const metatext = getMetaText(metadataMap[metahash]);
    metahashMap[metatext] = metahash;
  }
  return metahashMap;
}

/**
 * Return a map of sources to sample dates to display on the time slider.
 * @param observationDates
 */
export function getTimeSliderDates(
  observationDates: Array<ObservationDate>
): SampleDates {
  const facetEntityCount: Record<string, { date: string; count: number }[]> =
    {};
  for (const observationDate of observationDates) {
    const date = observationDate.date;
    for (const entityCount of observationDate.entityCount) {
      const facet = entityCount.facet;
      const count = entityCount.count;
      if (!(facet in facetEntityCount)) {
        facetEntityCount[facet] = [];
      }
      facetEntityCount[facet].push({ date, count });
    }
  }
  const latestFacets = observationDates[
    observationDates.length - 1
  ].entityCount.map((x) => x.facet);

  const sampleDates: Record<string, Array<string>> = {};
  const facetWeight: Record<string, number> = {};
  for (const facet in facetEntityCount) {
    const entityCount = facetEntityCount[facet];
    const increment = Math.max(
      1,
      Math.ceil(entityCount.length / NUM_SAMPLE_DATES)
    );
    const selectedDates: Array<string> = [];
    let weight = 0;
    for (let i = 0; i < entityCount.length - 1; i += increment) {
      selectedDates.push(entityCount[i].date);
      weight += entityCount[i].count;
    }
    // Include most recent date
    selectedDates.push(entityCount[entityCount.length - 1].date);
    weight += entityCount[entityCount.length - 1].count;
    sampleDates[facet] = selectedDates;
    facetWeight[facet] = weight;
  }
  let bestWeight = 0;
  let bestAvailable = "";
  for (const facet of latestFacets) {
    if (facetWeight[facet] > bestWeight) {
      bestWeight = facetWeight[facet];
      bestAvailable = facet;
    }
  }
  return {
    facetDates: sampleDates,
    bestFacet: bestAvailable,
  };
}

/**
 * Return a map of sources to legend bounds.
 * @param metadataMap
 * @param provenanceSummary
 * @param placeType
 * @param bestAvailableHash
 */
export function getLegendBounds(
  metadataMap: Record<string, StatMetadata>,
  provenanceSummary: ProvenanceSummary,
  placeType: string,
  bestAvailableHash: string
): Record<string, [number, number, number]> {
  const metahashMap: Record<string, string> = getMetahashMap(metadataMap);
  const legendBounds: Record<string, [number, number, number]> = {};
  for (const provId in provenanceSummary) {
    const provenance = provenanceSummary[provId];
    for (const series of provenance.seriesSummary) {
      if (!(placeType in series.placeTypeSummary)) {
        continue;
      }
      const metatext = getMetaText({
        ...series.seriesKey,
        importName: provenance.importName,
      });
      if (!(metatext in metahashMap)) {
        continue;
      }
      const minValue = series.placeTypeSummary[placeType].minValue || 0;
      const maxValue = series.placeTypeSummary[placeType].maxValue;
      legendBounds[metahashMap[metatext]] = [
        minValue,
        (minValue + maxValue) / 2,
        maxValue,
      ];
      if (metahashMap[metatext] === bestAvailableHash) {
        // TODO: Time slider sample dates is from one particular facet,
        // so it should always set metahash, which is not done right now.
        // This is using the bound from one particular facet for data from
        // mixed facets.
        legendBounds[""] = [minValue, (minValue + maxValue) / 2, maxValue];
      }
    }
  }
  return legendBounds;
}

export function getDate(statVar: string, date: string): string {
  let res = "";
  const cappedDate = getCappedStatVarDate(statVar);
  // If there is a specified date, get the data for that date. If no specified
  // date, still need to cut data for prediction data that extends to 2099
  if (date) {
    res = date;
  } else if (cappedDate) {
    res = cappedDate;
  }
  return res;
}

export function getGeoJsonDataFeatures(
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

export function ifShowChart(statVar: StatVar, placeInfo: PlaceInfo): boolean {
  return (
    !_.isNull(statVar.info) &&
    !_.isEmpty(placeInfo.enclosingPlace.dcid) &&
    !_.isEmpty(placeInfo.enclosedPlaceType)
  );
}

export function getRankingLink(
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

/**
 * Determine whether to show a border around enclosed places.
 * Only draw border if enclosed place type does not have 'wall-to-wall'
 * coverage of the enclosing place.
 * @param enclosedPlaceType the type (city, county, etc) of the enclosed places
 */
export function shouldShowBorder(enclosedPlaceType: string): boolean {
  return NO_FULL_COVERAGE_PLACE_TYPES.includes(enclosedPlaceType);
}
