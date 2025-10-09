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

import { DataCommonsClient } from "@datacommonsorg/client";

/**
 * Default @datacommonsorg/client apiRoot value is "/", meaning the current
 * hostname in the browser
 * It also uses the website surface value for usage logging in mixer.
 */
export const DEFAULT_CLIENT_API_ROOT = "/";

/**
 * Returns a DataCommonsClient instance.
 * Creates a new client with the passed in apiRoot if specified, otherwise
 * returns the default DataCommonsClient with apiRoot = "/", meaning the current
 * window.location.origin
 *
 * @param apiRoot
 * @param surface Used in mixer usage logs. Indicates which surface (website, web components, etc) is making the call.
 * @returns DataCommonsClient instance
 */
export function getDataCommonsClient(
  apiRoot?: string,
  surface?: string
): DataCommonsClient {
  console.log("calling getDataCommonsClient, surface: ", surface);
  return new DataCommonsClient({
    apiRoot: apiRoot ?? DEFAULT_CLIENT_API_ROOT,
    surface: surface ?? null,
  });
}
