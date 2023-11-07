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

import appConfig from "../config/appConfig.json";

/**
 * Country place type
 */
export const COUNTRY_PLACE_TYPE = "Country";

/**
 * Variable DCID url parameter
 */
export const QUERY_PARAM_VARIABLE = "v";

/**
 * Place DCID url parameter
 */
export const QUERY_PARAM_PLACE = "p";

/**
 * Query search text url parameter
 */
export const QUERY_PARAM_QUERY = "q";

/**
 * DCID returned by fulfillment when no topic is identified
 */
export const NULL_TOPIC = "dc/topic/Root";

/**
 * Web api root
 */
export const WEB_API_ENDPOINT = appConfig.webApiEndpoint;

/**
 * Number of characters on footnote to show before ...
 */
export const FOOTNOTE_CHAR_LIMIT = 100;
