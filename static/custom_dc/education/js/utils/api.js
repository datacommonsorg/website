/**
 * Copyright 2023 Google LLC
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
 * Get the API root URL from query params or default to current origin
 */
export function getApiRoot() {
  const params = new URLSearchParams(location.search);
  return params.get("apiRoot") || location.origin || "https://datacommons.org";
}

/**
 * Fetch domain configuration data
 * @param {Function} callback - Callback function to execute with domain info
 */
export async function fetchData(callback) {
  const apiRoot = getApiRoot();

  let domainInfo = {};

  try {
    const response = await fetch(apiRoot + "/admin/api/domain-config");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    domainInfo = await response.json();

    callback(domainInfo);
  } catch (error) {
    console.error("Error:", error);
  }
}
