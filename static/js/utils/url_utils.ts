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
 * URL related helpers shared across components.
 */

/**
 * Returns token for URL param.
 * @param param URL param
 * @returns Corresponding token
 */
export function getUrlToken(param: string): string {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  return urlParams.get(param);
}

/**
 * Returns token for URL param, or the given default.
 * @param param URL param
 * @def def default value
 * @returns Corresponding token
 */
export function getUrlTokenOrDefault(param: string, def: string): string {
  const res = getUrlToken(param);
  if (res === null) {
    return def;
  }
  return res;
}

/**
 * Gets the updated URL hash param given new param values
 * @param params Map of param to new value.
 */
export function getUpdatedHash(
  params: Record<string, string | string[]>
): string {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  for (const param in params) {
    if (!params[param]) {
      urlParams.delete(param);
      continue;
    }
    if (Array.isArray(params[param])) {
      urlParams.delete(param);
      (<string[]>params[param]).forEach((v) => urlParams.append(param, v));
    } else {
      urlParams.set(param, <string>params[param]);
    }
  }
  return urlParams.toString();
}

/**
 * Updates URL hash param with given value.
 * @param params Map of param to new value.
 */
export function updateHash(params: Record<string, string | string[]>): void {
  window.location.hash = getUpdatedHash(params);
}

/**
 * Returns a cleaned url host that can be used for creating URLs to DC tools.
 * @param apiRoot API root to clean.
 * @returns URL hostname that can be appended to.
 */
export function apiRootToHostname(apiRoot?: string): string {
  return apiRoot ? apiRoot.replace(/\/$/, "") : "";
}
