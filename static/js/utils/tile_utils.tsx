/**
 * Copyright 2022 Google LLC
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
 * Util functions used by tile components.
 */

import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";
import React from "react";

import { NL_SOURCE_REPLACEMENTS } from "../constants/app/explore_constants";
import { SELF_PLACE_DCID_PLACEHOLDER } from "../constants/subject_page_constants";
import { CSV_FIELD_DELIMITER } from "../constants/tile_constants";
import {
  GA_EVENT_TILE_EXPLORE_MORE,
  GA_PARAM_URL,
  triggerGAEvent,
} from "../shared/ga_events";
import { PointApiResponse, SeriesApiResponse } from "../shared/stat_types";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { NamedTypedPlace, StatVarSpec } from "../shared/types";
import { getCappedStatVarDate, urlToDisplayText } from "../shared/util";
import { TileMetadataModal } from "../tools/shared/tile_metadata_modal";
import { getMatchingObservation } from "../tools/shared_util";
import { EventTypeSpec, TileConfig } from "../types/subject_page_proto_types";
import { stringifyFn } from "./axios";
import { isNlInterface } from "./explore_utils";
import { getUnit } from "./stat_metadata_utils";
import { addPerCapitaToTitle } from "./subject_page_utils";

const DEFAULT_PC_SCALING = 100;
const DEFAULT_PC_UNIT = "%";
const ERROR_MSG_PC = "Sorry, could not calculate per capita.";
const ERROR_MSG_DEFAULT = "Sorry, we do not have this data.";
const NUM_FRACTION_DIGITS = 1;
const SUPER_SCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/**
 * Override unit display when unit contains
 * "TH" (Thousands), "M" (Millions), "B" (Billions)
 */
interface UnitOverride {
  multiplier: number;
  numFractionDigits?: number;
  unit: string;
  unitDisplayName: string;
}
const UNIT_OVERRIDE_CONFIG: {
  [key: string]: UnitOverride;
} = {
  SDG_CON_USD_M: {
    unit: "SDG_CON_USD",
    multiplier: 1000000,
    unitDisplayName: "Constant USD",
  },
  SDG_CUR_LCU_M: {
    unit: "SDG_CUR_LCU",
    multiplier: 1000000,
    unitDisplayName: "Current local currency",
  },
  SDG_CU_USD_B: {
    unit: "SDG_CU_USD",
    multiplier: 1000000000,
    unitDisplayName: "USD",
  },
  SDG_CU_USD_M: {
    unit: "SDG_CU_USD",
    multiplier: 1000000,
    unitDisplayName: "USD",
  },
  SDG_HA_TH: {
    unit: "SDG_HA",
    multiplier: 1000,
    unitDisplayName: "Hectares",
  },
  SDG_NUM_M: {
    unit: "SDG_NUMBER",
    multiplier: 1000000,
    unitDisplayName: "",
  },
  SDG_NUM_TH: {
    unit: "SDG_NUMBER",
    multiplier: 1000,
    unitDisplayName: "",
  },
  SDG_TONNES_M: {
    unit: "SDG_TONNES",
    multiplier: 1000000,
    unitDisplayName: "Tonnes",
  },
  SDG_NUMBER: {
    unit: "SDG_NUMBER",
    multiplier: 1,
    numFractionDigits: 0,
    unitDisplayName: "",
  },
};

export interface ReplacementStrings {
  placeName?: string;
  date?: string;
  statVar?: string;
  xDate?: string;
  yDate?: string;
  placeDcid?: string;
}

/**
 * Formats a string with replacement strings.
 * NOTE: unspecified keys will not be replaced / removed from the string.
 *
 * @param s The string to format
 * @param rs The replacement strings to use
 */
export function formatString(s: string, rs: ReplacementStrings): string {
  let formattedString = s;
  for (const key in rs) {
    const re = new RegExp(`\\$\\{${key}\\}`, "g");
    formattedString = formattedString.replace(re, rs[key]);
  }
  return formattedString;
}

/**
 * Gets the stat var name to display
 * @param statVarDcid dcid of the stat var to get the name for
 * @param statVarSpecs list of available stat var specs
 * @param isPerCapita whether or not the name is for a per capita stat var
 */
export function getStatVarName(
  statVarDcid: string,
  statVarSpecs: StatVarSpec[],
  isPerCapita?: boolean
): string {
  for (const svs of statVarSpecs) {
    if (svs.statVar === statVarDcid) {
      if (svs.name) {
        return svs.name;
      }
      break;
    }
  }
  const label = getStatsVarLabel(statVarDcid);
  if (isPerCapita) {
    return `${label} Per Capita`;
  }
  return label;
}

/**
 * Gets the stat var names to display via node/propvals api call for all stat
 * vars in a statVarSpec collection.
 * Different from getStatVarName() in that if a stat var's name is not provided
 * in its spec, will try to query the name though an api call.
 * @param statVarSpecs specs of stat vars to get names for
 * @param apiRoot api root to use for api
 * @param getProcessedName If provided, use this function to get the processed
 *        stat var names.
 */
export async function getStatVarNames(
  statVarSpec: StatVarSpec[],
  apiRoot?: string,
  getProcessedName?: (name: string) => string
): Promise<{ [key: string]: string }> {
  if (_.isEmpty(statVarSpec)) {
    return Promise.resolve({});
  }
  const statVarDcids: string[] = [];
  const statVarNames: Record<string, string> = {};
  // If a name is already provided by statVarSpec, use that name
  statVarSpec.forEach((spec) => {
    if (spec.name) {
      statVarNames[spec.statVar] = spec.name;
    } else {
      // See if a label is provided in
      // /static/js/i18n/strings/en/stats_var_labels.json
      const label = getStatsVarLabel(spec.statVar);
      statVarNames[spec.statVar] = label;
      if (label === spec.statVar) {
        statVarDcids.push(spec.statVar);
      }
    }
  });

  // Promise that returns an object where key is stat var dcid and value is name
  let statVarNamesPromise;
  // If all names were provided by statVarSpec or stats_var_labels.json
  // skip propval api call
  if (_.isEmpty(statVarDcids)) {
    statVarNamesPromise = Promise.resolve(statVarNames);
  } else {
    statVarNamesPromise = axios
      .get(`${apiRoot || ""}/api/node/propvals/out`, {
        params: {
          dcids: statVarDcids,
          prop: "name",
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        for (const statVar in resp.data) {
          // If the api call can't find a name for the stat var (api returns []),
          // default to using its dcid
          statVarNames[statVar] = _.isEmpty(resp.data[statVar])
            ? statVar
            : resp.data[statVar][0].value;
        }
        return statVarNames;
      });
  }

  try {
    const statVarNamesResult = await statVarNamesPromise;
    // If there is a function for processing stat var names, use it
    if (getProcessedName) {
      Object.keys(statVarNamesResult).forEach((dcid) => {
        statVarNamesResult[dcid] = getProcessedName(statVarNamesResult[dcid]);
      });
    }
    return statVarNamesResult;
  } catch (error) {
    return await Promise.reject(error);
  }
}

interface SVGInfo {
  // the svg as an xml string
  svgXml: string;
  // height of the svg
  height: number;
  // width of the svg
  width: number;
}

/**
 * Gets a single svg that merges all the svgs within a containing html div.
 * @param svgContainer
 */
export function getMergedSvg(svgContainer: HTMLDivElement): SVGInfo {
  const svgElemList = svgContainer.getElementsByTagName("svg");
  // Create new svg element to return which will hold all the svgs coming from
  // containerRef
  const mergedSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  let width = 0;
  let height = 0;
  // Set embedSvgHeight as the max height of all svgs
  Array.from(svgElemList).forEach((svg) => {
    height = Math.max(svg.getBBox().height, height);
  });
  // Add each svg from svgElemList to embedSvg
  for (const svg of Array.from(svgElemList)) {
    const svgBBox = svg.getBBox();
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    // Set height of current svg to the height of the embedSvg
    clonedSvg.setAttribute("height", `${height}`);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // Move current svg to the right of svgs that have already been added to
    // embedSvg
    g.setAttribute("transform", `translate(${width})`);
    g.appendChild(clonedSvg);
    mergedSvg.appendChild(g);
    // Update width of embedSvg to include current svg width
    width += svgBBox.width + svgBBox.x;
  }
  mergedSvg.setAttribute("height", String(height));
  mergedSvg.setAttribute("width", String(width));
  const s = new XMLSerializer();
  const svgXml = !_.isEmpty(svgElemList) ? s.serializeToString(mergedSvg) : "";
  return { svgXml, height, width };
}

/**
 * Gets the chart title for a tile
 * @param title the title from the tile config
 * @param rs replacement strings to use to format the title
 */
export function getChartTitle(title: string, rs: ReplacementStrings): string {
  return title ? formatString(title, rs) : "";
}

/**
 * Gets the relevant event type specs for a disaster event tile (a tile that is
 * rendered in a disaster event block)
 * @param eventTypeSpec the full collection of event type specs
 * @param tile tile to get the event type specs for
 */
export function getTileEventTypeSpecs(
  eventTypeSpec: Record<string, EventTypeSpec>,
  tile: TileConfig
): Record<string, EventTypeSpec> {
  const relevantEventSpecs = {};
  if (tile.disasterEventMapTileSpec) {
    const pointEventTypeKeys =
      tile.disasterEventMapTileSpec.pointEventTypeKey || [];
    const polygonEventTypeKeys =
      tile.disasterEventMapTileSpec.polygonEventTypeKey || [];
    const pathEventTypeKeys =
      tile.disasterEventMapTileSpec.pathEventTypeKey || [];
    [
      ...pointEventTypeKeys,
      ...polygonEventTypeKeys,
      ...pathEventTypeKeys,
    ].forEach((specId) => {
      relevantEventSpecs[specId] = eventTypeSpec[specId];
    });
  }
  if (tile.topEventTileSpec) {
    const specId = tile.topEventTileSpec.eventTypeKey;
    relevantEventSpecs[specId] = eventTypeSpec[specId];
  }
  if (tile.histogramTileSpec) {
    const specId = tile.histogramTileSpec.eventTypeKey;
    relevantEventSpecs[specId] = eventTypeSpec[specId];
  }
  return relevantEventSpecs;
}

/**
 * Gets the JSX element for displaying a list of sources and stat vars.
 */
export function TileSources(props: {
  sources: Set<string> | string[];
  // If available, the stat vars to link to.
  statVarSpecs?: StatVarSpec[];
  containerRef?: React.RefObject<HTMLElement>;
  apiRoot?: string;
}): JSX.Element {
  const { sources, statVarSpecs } = props;
  if (!sources) {
    return null;
  }

  const sourceList: string[] = Array.from(sources);
  //const seenSourceText = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    // HACK for updating source for NL interface
    let sourceUrl = source;
    if (isNlInterface()) {
      sourceUrl = NL_SOURCE_REPLACEMENTS[source] || source;
    }
    const sourceText = urlToDisplayText(sourceUrl);
    return (
      <span key={sourceUrl}>
        {index > 0 ? ", " : ""}
        <a
          href={sourceUrl}
          rel="noreferrer"
          target="_blank"
          title={sourceUrl}
          onClick={(event) => {
            triggerGAEvent(GA_EVENT_TILE_EXPLORE_MORE, {
              [GA_PARAM_URL]: sourceUrl,
            });
            return true;
          }}
        >
          {sourceText}
        </a>
        {globalThis.viaGoogle ? " via Google" : ""}
      </span>
    );
  });
  return (
    <div className="sources" {...{ part: "source" }}>
      Source: <span {...{ part: "source-links" }}>{sourcesJsx}</span>
      {statVarSpecs && statVarSpecs.length > 0 && (
        <>
          <span {...{ part: "source-separator" }}> • </span>
          <span {...{ part: "source-show-metadata-link" }}>
            <TileMetadataModal
              apiRoot={props.apiRoot}
              containerRef={props.containerRef}
              statVarSpecs={statVarSpecs}
            ></TileMetadataModal>
          </span>
        </>
      )}
    </div>
  );
}

// Processes a unit string by converting "X^Y" to "X<superscript Y>"
// e.g., km^2 will be km²
function getProcessedUnit(unit: string): string {
  const unitSplit = unit.split("^");
  if (unitSplit.length == 2) {
    const superScriptNumber = unitSplit[1].replace(/\d/g, (c) =>
      !_.isNaN(Number(c)) ? SUPER_SCRIPT_DIGITS[Number(c)] || "" : ""
    );
    return unitSplit[0] + superScriptNumber || unitSplit[1];
  }
  return unit;
}

/**
 * Gets the unit and scaling factor to use for a stat var spec
 * @param svSpec stat var spec to get unit and scaling for
 * @param statPointData stat data for the tile as a PointApiResponse
 * @param statSeriesData stat data for the tile as a SeriesApiResponse
 */
export function getStatFormat(
  svSpec: StatVarSpec,
  statPointData?: PointApiResponse,
  statSeriesData?: SeriesApiResponse
): { unit: string; scaling: number; numFractionDigits?: number } {
  const result = {
    unit: svSpec.unit,
    scaling: svSpec.scaling || 1,
    numFractionDigits: undefined,
  };
  // If unit was specified in the svSpec, use that unit
  if (result.unit) {
    result.unit = getProcessedUnit(result.unit);
    return result;
  }
  // Get stat metadata info from stat data
  let statMetadata = null;
  if (statPointData) {
    const obsWithFacet = Object.values(statPointData.data[svSpec.statVar]).find(
      (obs) => !!obs.facet
    );
    if (obsWithFacet) {
      statMetadata = statPointData.facets[obsWithFacet.facet];
    }
  } else if (statSeriesData) {
    const seriesWithFacet = Object.values(
      statSeriesData.data[svSpec.statVar]
    ).find((series) => !!series.facet);
    if (seriesWithFacet) {
      statMetadata = statSeriesData.facets[seriesWithFacet.facet];
    }
  }

  let overrideConfig = null;
  if (statMetadata) {
    const isComplexUnit = !!statMetadata.unit?.match(/\[.+ [0-9]+\]/);
    // If complex unit, use the unit part to get the override config, otherwise
    // use the whole unit to get the override config.
    const unitStr = isComplexUnit
      ? statMetadata.unit.substring(1, statMetadata.unit.indexOf(" "))
      : statMetadata.unit;
    overrideConfig = UNIT_OVERRIDE_CONFIG[unitStr];
  }
  // If there's a matching override config, use the format information from
  // the config. Otherwise, get unit from stat metadata.
  if (overrideConfig) {
    result.unit = overrideConfig.unitDisplayName;
    result.scaling = overrideConfig.multiplier;
    result.numFractionDigits = overrideConfig.numFractionDigits;
  } else {
    result.unit = getUnit(statMetadata);
  }
  // If this is a per capita case and no unit name has been found, use the
  // default per capita unit and multiply scaling by the default per capita
  // scaling.
  if (svSpec.denom && !result.unit) {
    result.unit = DEFAULT_PC_UNIT;
    result.scaling *= DEFAULT_PC_SCALING;
  }
  result.unit = getProcessedUnit(result.unit);
  return result;
}

interface DenomInfo {
  value: number;
  date: string;
  source: string;
}

/**
 * Gets information needed to calculate per capita for a single stat data point.
 * Uses the denom value with the closest date to the mainStatDate and returns
 * null if no matching value is found or matching value is 0.
 * @param svSpec the stat var spec of the data point to calculate per capita for
 * @param denomData population data to use for the calculation
 * @param placeDcid place of the data point
 * @param mainStatDate date of the data point
 * @param mainStatUnit unit of the data point
 */
export function getDenomInfo(
  svSpec: StatVarSpec,
  denomData: SeriesApiResponse,
  placeDcid: string,
  mainStatDate: string
): DenomInfo {
  if (!denomData || !(svSpec.denom in denomData.data)) {
    return null;
  }
  const placeDenomData = denomData.data[svSpec.denom][placeDcid];
  if (!placeDenomData || _.isEmpty(placeDenomData.series)) {
    return null;
  }
  const denomSeries = placeDenomData.series;
  const denomObs = getMatchingObservation(denomSeries, mainStatDate);
  if (!denomObs || !denomObs.value) {
    return null;
  }
  let source = "";
  if (denomData.facets[placeDenomData.facet]) {
    source = denomData.facets[placeDenomData.facet].provenanceUrl;
  }
  return {
    value: denomObs.value,
    date: denomObs.date,
    source,
  };
}

/**
 * Gets the error message to show when there's no data for a tile.
 * @param statVarSpec stat var spec for the tile.
 */
export function getNoDataErrorMsg(statVarSpec: StatVarSpec[]): string {
  return statVarSpec.findIndex((spec) => !!spec.denom) >= 0
    ? ERROR_MSG_PC
    : ERROR_MSG_DEFAULT;
}

/**
 * Shows an error message in a container div
 * @param errorMsg the message to show
 * @param container the container div to show the message
 */
export function showError(errorMsg: string, container: HTMLDivElement): void {
  // Remove contents of the container
  const containerSelection = d3.select(container);
  containerSelection.selectAll("*").remove();
  // Show error message in the container
  containerSelection.html(errorMsg);
}

/**
 * Gets the list of comparison places to use
 * @param tileConfig tile config to get comparison places from
 * @param place the main place for the tile
 */
export function getComparisonPlaces(
  tileConfig: TileConfig,
  place: NamedTypedPlace
): string[] {
  if (!tileConfig.comparisonPlaces) {
    return undefined;
  }
  return tileConfig.comparisonPlaces.map((p) =>
    p == SELF_PLACE_DCID_PLACEHOLDER ? place.dcid : p
  );
}

/**
 * Transforms CSV column headers to make them more readable. Specifically:
 * - Capitalizes header
 * - Changes "dcid" to "DCID" (Example: "Entity dcid" -> "Entity DCID")
 *
 * @param columnHeader CSV column header
 * @returns capitalized column header
 */
export function transformCsvHeader(columnHeader: string) {
  if (columnHeader.length === 0) {
    return columnHeader;
  }
  const capitalizedColumnHeader =
    columnHeader[0].toUpperCase() + columnHeader.slice(1);
  return capitalizedColumnHeader.replace(
    `${CSV_FIELD_DELIMITER}dcid`,
    `${CSV_FIELD_DELIMITER}DCID`
  );
}

/**
 * Gets the first date from a list of stat var spec objects
 *
 * Tiles in the subject config page currently operate with the assumption that
 * all dates set for a subject page config will have the same date
 *
 * @param variables stat var spec variables
 * @returns first date found or undefined if stat var spec list is empty
 */
export function getFirstCappedStatVarSpecDate(
  variables: StatVarSpec[]
): string {
  if (variables.length === 0) {
    return "";
  }
  return getCappedStatVarDate(variables[0].statVar, variables[0].date);
}

/**
 * Gets the description for a highlight tile given the tile config and block
 * level denominator
 *
 * @param tile the tile config
 * @param blockDenom the block level denominator
 * @returns description for the highlight tile
 */
export function getHighlightTileDescription(
  tile: TileConfig,
  blockDenom?: string
): string {
  let description = tile.description.includes("${date}")
    ? tile.description
    : tile.description + " (${date})";
  description = blockDenom ? addPerCapitaToTitle(description) : description;
  return description;
}
