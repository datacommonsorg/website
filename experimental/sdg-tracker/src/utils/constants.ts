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
 * Root Data Commons variable group
 */
export const ROOT_VARIABLE_GROUP = "dc/g/Root";

/**
 * Root SDG variable group
 */
export const ROOT_SDG_VARIABLE_GROUP = "dc/g/SDG";

/**
 * Web api root
 */
export const WEB_API_ENDPOINT = appConfig.webApiEndpoint;
