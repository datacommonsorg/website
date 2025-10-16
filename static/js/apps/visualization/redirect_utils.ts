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

import { escape } from "lodash";

import {
  PARAM_VALUE_SEP,
  STAT_VAR_PARAM_KEYS,
  URL_PARAMS,
} from "../../constants/app/visualization_constants";
import { TIMELINE_URL_PARAM_KEYS } from "../../tools/timeline/util";
import {
  ALLOWED_VIS_TOOL_TYPES,
  ChartEntry,
  DcidList,
  DEFAULT_PARAM_SEPARATOR,
  MAP_URL_PARAM_MAPPING,
  OldToolChartOptions,
  ParamNameMapping,
  SCATTER_URL_PARAM_MAPPING,
  TIMELINE_STAT_VAR_SEPARATOR,
  TIMELINE_URL_PARAM_MAPPING,
  VisType,
} from "./redirect_constants";

/**
 * Helper functions for implementing the redirects from the Visualization Tool to the "old" tools.
 */

/**
 * Get the equivalent URL for the "old" tools version of the current chart
 *
 * Get the equivalent /tools/map, /tools/timeline, /tools/scatter chart.
 * If the user is on the landing page or a tool is not specified, defaults to the map tool.
 *
 * @param visType (optional) specify the visualization tool type to get the url for
 * @returns equivalent url that can be used for redirecting.
 */
export function getStandardizedToolUrl(visType?: VisType): string {
  let toolName = visType;
  if (!visType) {
    toolName = getVisTypeFromHash();
  }
  const currentHashParams = new URLSearchParams(
    decodeURIComponent(window.location.hash.replace("#", ""))
  );
  // Convert hash parameters
  const newHashParams = getStandardizedHashParams(toolName, currentHashParams);
  const newHashString = newHashParams.toString();
  return `/tools/${toolName}${newHashString ? `#${newHashString}` : ""}`;
}

/**
 * Fetch the visualization type (timeline, scatter, or map) based on URL hash parameters
 *
 * If no visualization type is specified, defaults to the "map"
 */
export function getVisTypeFromHash(): VisType {
  // Get visualization type from URL hash parameters
  const currentHashParams = new URLSearchParams(
    decodeURIComponent(window.location.hash.replace("#", ""))
  );
  // Default to map tool if no visType is provided
  const visType = currentHashParams.get("visType") || "map";

  // Sanitize visType to prevent path traversal and other injection attacks.
  if (!ALLOWED_VIS_TOOL_TYPES.includes(visType)) {
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
  const newHashParams = new URLSearchParams();
  // Convert each mappable parameter
  Object.keys(MAP_URL_PARAM_MAPPING).forEach((key) => {
    const paramValue = currentHashParams.get(key);
    if (!paramValue) {
      // Skip params not present in current URL
      return;
    }

    if (key === URL_PARAMS.STAT_VAR) {
      handleMapStatVars(paramValue, newHashParams);
    } else {
      const paramName = MAP_URL_PARAM_MAPPING[key];
      if (paramName) {
        setSanitizedParam(newHashParams, paramName, paramValue);
      }
    }
  });
  return newHashParams;
}

/**
 * Handles processing the stat var parameter for /tools/map.
 * @param paramValue the value of the stat var parameter
 * @param newHashParams the URLSearchParams to add the new parameters to
 */
function handleMapStatVars(
  paramValue: string,
  newHashParams: URLSearchParams
): void {
  const [statVarDcids, chartOptions] = parseSvObject(
    paramValue,
    MAP_URL_PARAM_MAPPING
  );

  const statVarDcid = statVarDcids.at(0);
  if (!statVarDcid) {
    return;
  }

  // Set first stat var as the stat var for the map
  setSanitizedParam(newHashParams, "sv", statVarDcid);

  const chartEntry = chartOptions[statVarDcid];
  if (chartEntry) {
    for (const [key, value] of Object.entries(chartEntry)) {
      if (key == MAP_URL_PARAM_MAPPING.pc) {
        // Map tool uses 0 or 1 for per capita
        const perCapitaValue = value == "true" ? "1" : "0";
        setSanitizedParam(newHashParams, key, perCapitaValue);
      } else {
        setSanitizedParam(newHashParams, key, value);
      }
    }
  }
}

/**
 * Sets the URL parameters for a single scatter plot axis
 * @param axis the axis to set parameters for, "x" or "y"
 * @param statVarDcid the dcid of the stat var to use for this axis
 * @param chartOptions the chart options for all the stat vars
 * @param newHashParams the URLSearchParams to add the new parameters to
 */
function setAxisParams(
  axis: "x" | "y",
  statVarDcid: string,
  chartOptions: OldToolChartOptions,
  newHashParams: URLSearchParams
): void {
  if (!statVarDcid) {
    return;
  }
  // Set the stat var for the axis
  newHashParams.set(`sv${axis}`, statVarDcid);
  const options = chartOptions[statVarDcid];
  if (options) {
    // Set each option for this stat var if present
    // Escape value to defend against XSS attacks
    Object.keys(options).forEach((key) => {
      newHashParams.set(`${key}${axis}`, escape(options[key]));
    });
  }
}

/**
 * Handles processing the stat var parameter and setting the x and y axis
 * parameters for scatter.
 * @param paramValue the value of the stat var parameter
 * @param newHashParams the URLSearchParams to add the new parameters to
 */
function handleScatterStatVars(
  paramValue: string,
  newHashParams: URLSearchParams
): void {
  const [statVarDcids, chartOptions] = parseSvObject(
    paramValue,
    SCATTER_URL_PARAM_MAPPING
  );

  if (!statVarDcids) {
    return;
  }
  // Set first stat var as the Y axis variable
  setAxisParams("y", statVarDcids.at(0), chartOptions, newHashParams);
  // Set second stat var as the X axis variable
  setAxisParams("x", statVarDcids.at(1), chartOptions, newHashParams);
}

/**
 * Handles processing the display options parameter for scatter plots.
 * @param paramValue the value of the display parameter, a JSON string of options.
 * @param newHashParams the URLSearchParams to add the new parameters to.
 */
function handleScatterDisplayOptions(
  paramValue: string,
  newHashParams: URLSearchParams
): void {
  try {
    const parsedDisplayOptions = JSON.parse(paramValue);
    for (const key of Object.keys(parsedDisplayOptions)) {
      if (SCATTER_URL_PARAM_MAPPING[key]) {
        // Set display option
        setSanitizedParam(
          newHashParams,
          SCATTER_URL_PARAM_MAPPING[key],
          parsedDisplayOptions[key]
        );
      }
    }
  } catch {
    // Invalid display value
    return;
  }
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
  const newHashParams = new URLSearchParams();
  let hasValidParams = false;
  // Convert each mappable parameter
  Object.keys(SCATTER_URL_PARAM_MAPPING).forEach((key) => {
    const paramValue = currentHashParams.get(key);
    if (!paramValue) {
      return;
    }
    hasValidParams = true;
    if (key === URL_PARAMS.STAT_VAR) {
      handleScatterStatVars(paramValue, newHashParams);
    } else if (key === URL_PARAMS.DISPLAY) {
      handleScatterDisplayOptions(paramValue, newHashParams);
    } else {
      const paramName = SCATTER_URL_PARAM_MAPPING[key];
      if (paramName) {
        // Otherwise, Add converted keys & values as new param
        setSanitizedParam(newHashParams, paramName, paramValue);
      }
    }
  });

  if (hasValidParams) {
    // If there are other params, set density mode to true
    // It is always on in /tools/visualization
    newHashParams.set("dd", "1");
  }
  return newHashParams;
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
        // Otherwise, Add converted keys & values as new param
        setSanitizedParam(newHashParams, paramName, paramValue);
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
  paramNameMapping: ParamNameMapping
): [DcidList, OldToolChartOptions] {
  try {
    // Convert to a valid JSON string for parsing
    const validJsonString = `[${svObjectString.replaceAll(
      PARAM_VALUE_SEP,
      ","
    )}]`;

    // Parse the valid string
    const parsedSvObject = JSON.parse(validJsonString);

    const dcids: DcidList = [];
    const chartOptions = {} as OldToolChartOptions;

    for (const item of parsedSvObject) {
      if (!item || !(STAT_VAR_PARAM_KEYS.DCID in item)) {
        continue; //Skip invalid items
      }

      // Add DCIDs to list
      // Escape DCID to defend against XSS attacks
      const itemDcid = escape(item[STAT_VAR_PARAM_KEYS.DCID]);
      dcids.push(itemDcid);

      // Build the chart entry for this item
      const chartEntry = {} as ChartEntry;
      for (const key of Object.keys(item)) {
        if (Object.keys(paramNameMapping).includes(key)) {
          // Add entry if this parameter is a valid /tools/* param
          let value = item[key];
          if (key == STAT_VAR_PARAM_KEYS.PER_CAPITA) {
            // Per capita needs to be translated from 1 or 0 to true or false
            value = item[key] == "1" ? "true" : "false";
          }
          // Escape value to defend against XSS attacks
          chartEntry[paramNameMapping[key]] = escape(value);
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

/**
 * Sets a sanitized parameter on a URLSearchParams object.
 * @param params the URLSearchParams object to set the parameter on.
 * @param key the key of the parameter to set.
 * @param value the value of the parameter to set.
 */
function setSanitizedParam(
  params: URLSearchParams,
  key: string,
  value: string,
  separator: string = DEFAULT_PARAM_SEPARATOR
): void {
  // Escape value to defend against XSS attacks
  params.set(key, escape(value.replaceAll(PARAM_VALUE_SEP, separator)));
}
