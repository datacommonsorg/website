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
  const newHashParams = new URLSearchParams(currentHashParams.toString());
  newHashParams.delete("visType");
  const newHashString = newHashParams.toString()
    ? `#${newHashParams.toString()}`
    : "";

  return `/tools/${visType}${newHashString}`;
}

export function getStandardizedHash(): string {
  // Get the current hash parameters
  const currentHashParams = new URLSearchParams(
    window.location.hash.replace("#", "")
  );
  // Convert each parameter to the new parameter
  for 
  return "";
}
