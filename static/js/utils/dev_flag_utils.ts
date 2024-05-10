/**
 * Copyright 2024 Google LLC
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

/** URL flags for gating features under development */

import queryString from "query-string";

export const DEV_FLAGS = {
  // Temporary flag to gate new chart icons in the footer
  // TODO (juliawu): Remove this flag once all chart action icon changes are in.
  USE_CHART_ACTION_ICONS_FLAG: "chartIcons",
};

/**
 * Get the value set for a URL flag
 * @param flag flag to look for in URL
 * @returns value provided to flag as a string. If the flag is set multiple
 *          times, an array of values is returned instead.
 */
export function getFlagValue(flag: string): string | string[] {
  return queryString.parse(window.location.hash)[flag];
}

/**
 * Check whether a URL flag has a value set
 * @param flag flag to look for in URL
 * @returns true if flag has a value set, false otherwise.
 */
export function isFlagSet(flag: string): boolean {
  return !!getFlagValue(flag);
}
