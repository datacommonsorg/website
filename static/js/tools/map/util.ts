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

import {
  BANGLADESH_PLACE_DCID,
  EUROPE_NAMED_TYPED_PLACE,
  INDIA_PLACE_DCID,
  IPCC_PLACE_50_TYPE_DCID,
  NEPAL_PLACE_DCID,
  PAKISTAN_PLACE_DCID,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { StatApiResponse } from "../../shared/stat_types";
import {
  NamedPlace,
  NamedTypedPlace,
  ProvenanceSummary,
} from "../../shared/types";
import { getDateRange } from "../../utils/string_utils";
import {
  getPopulationDate,
  isChildPlaceOf,
  PlacePointStat,
  StatMetadata,
} from "../shared_util";
import { DisplayOptions, PlaceInfo, StatVar } from "./context";

const URL_PARAM_DOMAIN_SEPARATOR = ":";
const URL_PARAM_KEYS = {
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
};
const SV_REGEX_INSTALLATION_MAPPING = {
  Emissions: "EpaReportingFacility",
  AirPollutant: "AirQualitySite",
};

export const DEFAULT_DENOM = "Count_Person";
export const DEFAULT_DISPLAY_OPTIONS = {
  color: "",
  domain: null,
  showMapPoints: false,
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

export const ALL_PLACE_CHILD_TYPES = {
  Planet: ["Country"],
  Continent: ["Country", IPCC_PLACE_50_TYPE_DCID],
  Country: [IPCC_PLACE_50_TYPE_DCID],
};

export const USA_CHILD_PLACE_TYPES = {
  Country: ["State", "County"],
  State: ["County"],
  County: ["County"],
};

export const AA1_AA2_CHILD_PLACE_TYPES = {
  Country: ["AdministrativeArea1", "AdministrativeArea2"],
  AdministrativeArea1: ["AdministrativeArea2"],
  State: ["AdministrativeArea2"],
  AdministrativeArea2: ["AdministrativeArea2"],
};

export const AA1_AA3_CHILD_PLACE_TYPES = {
  AdministrativeArea1: ["AdministrativeArea3"],
  AdministrativeArea2: ["AdministrativeArea3"],
  Country: ["AdministrativeArea1", "AdministrativeArea3"],
  State: ["AdministrativeArea3"],
};

export const EUROPE_CHILD_PLACE_TYPES = {
  Continent: ["EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  Country: ["EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS1: ["EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS2: ["EurostatNUTS3"],
  EurostatNUTS3: ["EurostatNUTS3"],
};

export const CHILD_PLACE_TYPE_MAPPING = {
  [USA_PLACE_DCID]: USA_CHILD_PLACE_TYPES,
  [INDIA_PLACE_DCID]: AA1_AA2_CHILD_PLACE_TYPES,
  [BANGLADESH_PLACE_DCID]: AA1_AA2_CHILD_PLACE_TYPES,
  [NEPAL_PLACE_DCID]: AA1_AA2_CHILD_PLACE_TYPES,
  [PAKISTAN_PLACE_DCID]: AA1_AA3_CHILD_PLACE_TYPES,
  [EUROPE_NAMED_TYPED_PLACE.dcid]: EUROPE_CHILD_PLACE_TYPES,
};

export const ENCLOSED_PLACE_TYPE_NAMES = {
  [IPCC_PLACE_50_TYPE_DCID]: "0.5 Arc Degree",
};

// list of place types in the US in the order of high to low granularity.
export const USA_PLACE_HIERARCHY = ["Country", "State", "County"];
export const MAP_REDIRECT_PREFIX = "/tools/map";

// metadata associated with a single data point in the map charts
export interface DataPointMetadata {
  popDate: string;
  popSource: string;
  placeStatDate: string;
  statVarSource: string;
  errorMessage?: string;
}
/**
 * Parses the hash and produces a StatVar
 * @param params the params in the hash
 */
export function applyHashStatVar(params: URLSearchParams): StatVar {
  const dcid = params.get(URL_PARAM_KEYS.STAT_VAR_DCID);
  const date = params.get(URL_PARAM_KEYS.DATE);
  const denom = params.get(URL_PARAM_KEYS.DENOM);
  const mapPointSv = params.get(URL_PARAM_KEYS.MAP_POINTS_SV);
  if (!dcid) {
    return {
      dcid: "",
      perCapita: false,
      info: null,
      date: "",
      denom: "",
      mapPointSv: "",
    };
  }
  const perCapita = params.get(URL_PARAM_KEYS.PER_CAPITA);
  return {
    dcid,
    perCapita: perCapita && perCapita === "1" ? true : false,
    info: null,
    date: date ? date : "",
    denom: denom ? denom : DEFAULT_DENOM,
    mapPointSv: mapPointSv ? mapPointSv : "",
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
    enclosedPlaces: [],
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
  return {
    color,
    domain: domain.length === 3 ? (domain as [number, number, number]) : null,
    showMapPoints: showMapPoints && showMapPoints === "1" ? true : false,
  };
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
  const dateParam = statVar.date
    ? `&${URL_PARAM_KEYS.DATE}=${statVar.date}`
    : "";
  const mapPointParam = statVar.mapPointSv
    ? `&${URL_PARAM_KEYS.MAP_POINTS_SV}=${statVar.mapPointSv}`
    : "";
  const params =
    `&${URL_PARAM_KEYS.STAT_VAR_DCID}=${statVar.dcid}` +
    `&${URL_PARAM_KEYS.PER_CAPITA}=${perCapita}` +
    `&${URL_PARAM_KEYS.DENOM}=${statVar.denom}` +
    dateParam +
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
  let hash = updateHashStatVar("", statVar);
  hash = updateHashDisplay(hash, displayOptions);
  const enclosedPlaceTypes = getAllChildPlaceTypes(selectedPlace, parentPlaces);
  hash = updateHashPlaceInfo(hash, {
    enclosedPlaces: [],
    enclosedPlaceType:
      enclosedPlaceTypes.length == 1 ? enclosedPlaceTypes[0] : "",
    enclosingPlace: { dcid: "", name: "" },
    mapPointPlaceType,
    parentPlaces: [],
    selectedPlace,
  });
  return `${MAP_REDIRECT_PREFIX}#${encodeURIComponent(hash)}`;
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
  let mapType = "";
  if (place.dcid in CHILD_PLACE_TYPE_MAPPING) {
    mapType = place.dcid;
  } else {
    for (const mapPlaceDcid in CHILD_PLACE_TYPE_MAPPING) {
      if (
        mapPlaceDcid === EUROPE_NAMED_TYPED_PLACE.dcid &&
        place.types.indexOf("Eurostat") === 0
      ) {
        mapType = mapPlaceDcid;
        break;
      }
      if (isChildPlaceOf(place.dcid, mapPlaceDcid, parentPlaces)) {
        mapType = mapPlaceDcid;
        break;
      }
    }
  }
  const childPlaceTypes = [];
  const mapTypeChildTypes = CHILD_PLACE_TYPE_MAPPING[mapType] || {};
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
  return childPlaceTypes;
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
}

/**
 * For a place, extract the chart data for that place
 * @param placeStatData values for each statistical variable for each place
 * @param placeDcid place to extract the chart data for
 * @param isPerCapita whether the chart is a per capita chart
 * @param populationData population (for per capita calculation) data for each
 *                       place
 * @param metadataMap map of metahash to stat metadata
 */
export function getPlaceChartData(
  placeStatData: PlacePointStat,
  placeDcid: string,
  isPerCapita: boolean,
  populationData: StatApiResponse,
  metadataMap: Record<string, StatMetadata>
): PlaceChartData {
  const stat = placeStatData.stat[placeDcid];
  let metadata = null;
  if (_.isEmpty(stat)) {
    return null;
  }
  const sources = [];
  const placeStatDate = stat.date;
  const metaHash = placeStatData.metaHash || stat.metaHash;
  const statVarSource = metadataMap[metaHash].provenanceUrl;
  let value = stat.value === undefined ? 0 : stat.value;
  let popDate = "";
  let popSource = "";
  if (isPerCapita) {
    const popSeries =
      placeDcid in populationData
        ? Object.values(populationData[placeDcid].data)[0]
        : {};
    if (!_.isEmpty(popSeries)) {
      popDate = getPopulationDate(popSeries, stat);
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

/**
 * Get the chart title
 * @param statVarDates set of all dates of data values in the chart
 * @param statVarName name of the stat var
 * @param isPerCapita whether the chart is a per capita chart
 */
export function getTitle(
  statVarDates: string[],
  statVarName: string,
  isPerCapita: boolean
): string {
  const dateRange = `(${getDateRange(statVarDates)})`;
  return isPerCapita
    ? `${statVarName} Per Capita ${dateRange}`
    : `${statVarName} ${dateRange}`;
}

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
 * Given a stat var ProvenanceSummary and place type, return a map of sources
 * to sample dates to display on the time slider.
 * @param provenanceSummary
 * @param placeType
 */
export function getSampleDates(
  provenanceSummary: ProvenanceSummary,
  placeType: string,
  metadataMap: Record<string, StatMetadata>
): Record<string, Array<string>> {
  // Generate map of metatext to metahash
  const metahashMap: Record<string, string> = {};
  for (const metahash in metadataMap) {
    const metatext = getMetaText(metadataMap[metahash]);
    metahashMap[metatext] = metahash;
  }

  const sampleDates: Record<string, Array<string>> = {};
  let bestAvailable: Array<string> = [];
  for (const provId in provenanceSummary) {
    const provenance = provenanceSummary[provId];
    for (const i in provenance.seriesSummary) {
      const series = provenance.seriesSummary[i];
      if (!(placeType in series.placeTypeSummary)) {
        continue;
      }
      const dates: Array<string> = [];
      const earliestYear = parseInt(series.earliestDate.slice(0, 4));
      const monthAndDay = series.earliestDate.slice(
        4,
        series.earliestDate.length
      );
      const latestYear = parseInt(series.latestDate.slice(0, 4));

      // Get observation period years, if present, otherwise divide equally
      const observationPeriod = series.seriesKey.observationPeriod;
      const increment =
        observationPeriod &&
        observationPeriod[observationPeriod.length - 1] == "Y" &&
        parseInt(observationPeriod.slice(1, observationPeriod.length - 1)) != 1
          ? parseInt(observationPeriod.slice(1, observationPeriod.length - 1))
          : Math.ceil((latestYear - earliestYear) / 9);

      for (let i = earliestYear; i < latestYear; i += increment) {
        dates.push(i + monthAndDay);
      }
      if (series.earlistDate != series.latestDate) {
        dates.push(series.latestDate);
      }
      const metatext = getMetaText({
        importName: provenance.importName,
        measurementMethod: series.seriesKey.measurementMethod,
        observationPeriod: observationPeriod,
        scalingFactor: series.seriesKey.scalingFactor,
        unit: series.seriesKey.unit,
      });
      if (metatext in metahashMap) {
        sampleDates[metahashMap[metatext]] = dates;
      }
      // Set best available dates as longest list with most recent and specific dates
      if (
        dates.length >= bestAvailable.length &&
        (bestAvailable.length == 0 ||
          (dates[0].length >= bestAvailable[0].length &&
            dates[dates.length - 1] >= bestAvailable[bestAvailable.length - 1]))
      ) {
        bestAvailable = Object.assign(bestAvailable, dates);
      }
    }
  }
  sampleDates["Best Available"] = bestAvailable;
  return sampleDates;
}
