/**
 * Copyright 2025 Google LLC
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

import _ from "lodash";

import {
  PARAM_VALUE_SEP,
  STAT_VAR_PARAM_KEYS,
  TIMELINE_URL_PARAM_MAPPING,
  URL_PARAMS,
} from "../../constants/app/visualization_constants";
import { TIMELINE_URL_PARAM_KEYS } from "../../tools/timeline/util";

/**
 * Helper functions for implementing the redirects from the Visualization Tool to the "old" tools.
 */

// Allowed values for visType hash parameter
const VIS_TOOL_TYPES = ["map", "scatter", "timeline"];
type VisType = "map" | "scatter" | "timeline";
// Separator between multiple hash parameter values used by /tools/timeline
const TIMELINE_DEFAULT_SEPARATOR = ",";
// Separator between multiple variables used by /tools/timeline
const TIMELINE_STAT_VAR_SEPARATOR = "__"; // 2 underscores

/**
 * Get the equivalent URL for the "old" tools version of the current chart
 *
 * Get the equivalent /tools/map, /tools/timeline, /tools/scatter chart.
 * If the user is on the landing page or a tool is not specified, defaults to the map tool.
 *
 * @returns equivalent url that can be used for redirecting.
 */
export function getStandardizedToolUrl(): string {
  const currentHashParams = new URLSearchParams(
    window.location.hash.replace("#", "")
  );
  const visType = getVisTypeFromHash();

  // Convert hash parameters
  const newHashParams = getStandardizedHashParams(visType, currentHashParams);
  const newHashString = newHashParams.toString()
    ? `#${newHashParams.toString()}`
    : "";
  // Encode hash parameters to defend against XSS attacks
  const encodedNewHashString = encodeURIComponent(newHashString);
  return `/tools/${visType}${encodedNewHashString}`;
}

/**
 * Fetch the visualization type (timeline, scatter, or map) based on URL hash parameters
 *
 * If no visualization type is specified, defaults to the "map"
 */
export function getVisTypeFromHash(): VisType {
  // Get visualization type from URL hash parameters
  const currentHashParams = new URLSearchParams(
    window.location.hash.substring(1)
  );
  // Default to map tool if no visType is provided
  const visType = currentHashParams.get("visType") || "map";

  // Sanitize visType to prevent path traversal and other injection attacks.
  if (!VIS_TOOL_TYPES.includes(visType)) {
    return "map";
  }
  return visType as VisType;
}

/**
 * Convert current hash parameters into parameters for the "old" tools
 * @param visType which visualization type the url is for
 * @param currentHashParams current hash parameters
 * @returns a new set of hash parameters matching the equivalent "old" version of the tool
 */
function getStandardizedHashParams(
  visType: VisType,
  currentHashParams: URLSearchParams
): URLSearchParams {
  switch (visType) {
    case "scatter":
      return getScatterHashParams(currentHashParams);
    case "timeline":
      return getTimelineHashParams(currentHashParams);
    default:
      return getMapHashParams(currentHashParams);
  }
}

/**
 * Get equivalent hash parameters for /tools/map.
 *
 * Converts the given hash parameters into equivalent hash parameters used by /tools/map.
 * Note that because features are not 1:1 between /tools/visualization and /tools/map,
 * only hash parameters supported by /tools/map will be returned.
 *
 * @param currentHashParams hash parameters in the current URL
 * @returns a new set of hash parameters using the syntax of the old tools
 */
function getMapHashParams(currentHashParams: URLSearchParams): URLSearchParams {
  throw new Error("not implemented");
}

/**
 * Get equivalent hash parameters for /tools/scatter.
 *
 * Converts the given hash parameters into equivalent hash parameters used by /tools/scatter.
 * Note that because features are not 1:1 between /tools/visualization and /tools/scatter,
 * only hash parameters supported by /tools/scatter will be returned.
 *
 * @param currentHashParams hash parameters in the current URL
 * @returns a new set of hash parameters using the syntax of the old tools
 */
function getScatterHashParams(
  currentHashParams: URLSearchParams
): URLSearchParams {
  throw new Error("not implemented");
}

/**
 * Get equivalent hash parameters for /tools/timeline.
 *
 * Converts the given hash parameters into equivalent hash parameters used by /tools/timeline.
 * Note that because features are not 1:1 between /tools/visualization and /tools/timeline,
 * only hash parameters supported by /tools/timeline will be returned.
 *
 * @param currentHashParams hash parameters in the current URL
 * @returns a new set of hash parameters using the syntax of the old tools
 */
function getTimelineHashParams(
  currentHashParams: URLSearchParams
): URLSearchParams {
  const newHashParams = new URLSearchParams();
  // Convert each mappable parameter
  Object.keys(TIMELINE_URL_PARAM_MAPPING).forEach((key) => {
    if (currentHashParams.get(key)) {
      const paramName = TIMELINE_URL_PARAM_MAPPING[key];
      const paramValue = currentHashParams.get(key);

      // Convert stat var json object used by the visualization tool
      if (key == URL_PARAMS.STAT_VAR) {
        // stat var key in /tools/visualization maps to both
        // stat var dcids and chart options parameters in /tools/timeline
        const [statVarDcids, chartOptions] = parseSvObject(
          paramValue,
          TIMELINE_URL_PARAM_MAPPING
        );

        // Set stat var DCIDs
        if (statVarDcids) {
          newHashParams.set(
            TIMELINE_URL_PARAM_MAPPING[URL_PARAMS.STAT_VAR],
            statVarDcids.join(TIMELINE_STAT_VAR_SEPARATOR)
          );
        }

        // Set chart options
        if (chartOptions && Object.keys(chartOptions).length > 0) {
          newHashParams.set(
            TIMELINE_URL_PARAM_KEYS.CHART_OPTIONS,
            JSON.stringify(chartOptions)
          );
        }
      } else if (paramName && paramValue) {
        // Otherwise, Add converted keys values as new param
        newHashParams.set(
          paramName,
          paramValue.replaceAll(PARAM_VALUE_SEP, TIMELINE_DEFAULT_SEPARATOR)
        );
      }
    }
  });
  return newHashParams;
}

/**
 * Parses the stat var object string from the URL
 *
 * The visualization tools stores stat var dcids and  chart options (per capita, denominator, log, etc)
 * as a list ofJSON objects, one for each stat var. This function extracts a list of stat var dcids
 * and returns a new JSON object of chart options keyed by stat var dcid with parameter names
 * translated into the equivalent old tool param names.
 *
 * E.g.,
 * From: [{dcid: "dcid1", property1: "value1"}, {dcid: "dcid2", property1: "value2"}]
 * to: {"dcid1": {equivalent_property: "value1"}, "dcid2": {equilavent_property: "value2"}}
 *
 * Note: The chart options will only be populated for a stat var if there are other properties
 *       (per capita, denomnator, etc) associated with that stat var. This prevents issues with
 *       parsing empty parameter values downstream in /tools/*.
 *
 * @param svObjectString the string representation of the stat var object
 * @param paramNameMapping a mapping of vis tool param names to the equivalent old tool param names
 * @returns a tuple with a list of stat var dcids and a mapping of stat var dcis
 *          to a mapping of chart options to their values
 */
function parseSvObject(
  svObjectString: string,
  paramNameMapping: Record<string, string>
): [string[], Record<string, Record<string, string>>] {
  try {
    // Convert to a valid JSON string for parsing
    const validJsonString = `[${svObjectString.replaceAll(
      PARAM_VALUE_SEP,
      ","
    )}]`;

    // Parse the valid string
    const parsedSvObject = JSON.parse(validJsonString);

    const dcids: string[] = [];
    const chartOptions = {};

    for (const item of parsedSvObject) {
      if (!item || !(STAT_VAR_PARAM_KEYS.DCID in item)) {
        continue; //Skip invalid items
      }

      // Add DCIDs to list
      const itemDcid = item[STAT_VAR_PARAM_KEYS.DCID];
      dcids.push(itemDcid);

      // Build the chart entry for this item
      const chartEntry: Record<string, string> = {};
      for (const key of Object.keys(item)) {
        if (
          Object.values(STAT_VAR_PARAM_KEYS).includes(key) &&
          Object.keys(paramNameMapping).includes(key)
        ) {
          // Add entry if this parameter is both a valid
          // /visualization param and a valid /tools/* params
          let value = item[key];
          if (key == STAT_VAR_PARAM_KEYS.PER_CAPITA) {
            value = item[key] == "1" ? "true" : "false";
          }
          chartEntry[paramNameMapping[key]] = value;
        }
      }
      if (Object.keys(chartEntry).length > 0) {
        // Only add this stat var's chart options if not empty
        chartOptions[itemDcid] = chartEntry;
      }
    }
    return [dcids, chartOptions];
  } catch (error) {
    // Invalid svObjectString
    return [null, null];
  }
}
