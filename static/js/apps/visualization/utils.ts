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

import { TIMELINE_URL_PARAM_MAPPING } from "../../constants/app/visualization_constants";

/**
 * Helper functions for the Visualization Tool.
 */

/**
 * Get the equivalent URL for the "old" tools version of the current chart
 *
 * Get the equivalent /tools/map, /tools/timeline, /tools/scatter chart.
 * If the user is on the landing page or a tool is not specified, defaults to the map tool.
 *
 * @returns equivalent url that can be used for redirecting.
 */
export function getStandardizedToolUrl(): string {
  // Get visualization type from URL hash parameters
  const currentHashParams = new URLSearchParams(
    window.location.hash.replace("#", "")
  );
  // Default to map tool if no visType is provided
  const visType = currentHashParams.get("visType") || "map";

  // Get hash without "visType" to pass to new tools
  const newHashParams = getStandardizedHashParams(visType, currentHashParams);
  const newHashString = newHashParams.toString()
    ? `#${newHashParams.toString()}`
    : "";

  return `/tools/${visType}${newHashString}`;
}

/**
 * Convert current hash parameters into parameters for the "old" tools
 * @param visType which visualization type the url is for
 * @param currentHashParams current hash parameters
 * @returns a new set of hash parameters matching the equivalent "old" version of the tool
 */
function getStandardizedHashParams(
  visType: string,
  currentHashParams: URLSearchParams
): URLSearchParams {
  switch (visType) {
    case "scatter":
      return getStandardizedScatterHashParams(currentHashParams);
    case "timeline":
      return getStandardizedTimelineHashParams(currentHashParams);
    default:
      return getStandardizedMapHashParams(currentHashParams);
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
function getStandardizedMapHashParams(
  currentHashParams: URLSearchParams
): URLSearchParams {
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
function getStandardizedScatterHashParams(
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
function getStandardizedTimelineHashParams(
  currentHashParams: URLSearchParams
): URLSearchParams {
  const newHashParams = new URLSearchParams();
  // Convert each mappable parameter
  Object.keys(TIMELINE_URL_PARAM_MAPPING).forEach((key) => {
    if (currentHashParams.get(key)) {
      newHashParams.set(
        TIMELINE_URL_PARAM_MAPPING[key],
        currentHashParams.get(key)
      );
    }
  });
  return newHashParams;
}
