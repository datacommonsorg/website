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
 * Constants used by nl explore app.
 */

// URL hash param keys
export const URL_HASH_PARAMS = {
  PLACE: "p",
  TOPIC: "t",
  QUERY: "q",
  DC: "dc",
  DISABLE_EXPLORE_MORE: "em",
  // old query param
  DEPRECATED_QUERY: "oq",
  // Detection params
  DETECTOR: "detector",
  LLM_API: "llm_api",
  // auto play params
  AUTO_PLAY_QUERY: "aq",
  AUTO_PLAY_DISABLE_TYPING: "at",
  AUTO_PLAY_MANUAL_ENTER: "ae",
  MAXIMUM_BLOCK: "mb",
};
// Dcid of the default topic to use
export const DEFAULT_TOPIC = "dc/topic/Root";
// String used as a delimiter for url params
export const URL_DELIM = "___";
