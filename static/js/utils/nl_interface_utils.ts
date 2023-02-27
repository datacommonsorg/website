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
 * Utils used for the nl interface
 */

const FEEDBACK_LINK =
  "https://docs.google.com/forms/d/e/1FAIpQLSfqndIayVhN1bN5oeZT0Te-MhhBMBR1hn97Lgr77QTOpga8Iw/viewform?usp=pp_url";
// Param prefixes found when following the instructions here to get a prefilled
// link: https://support.google.com/docs/answer/2839588?hl=en&ref_topic=6063592#zippy=%2Csend-a-form-with-pre-filled-answers
const QUERY_PARAM_PREFIX = "&entry.1322830239=";
const SOURCE_PARAM_PREFIX = "&entry.1070482700=";
const VERSION_PARAM_PREFIX = "&entry.1420739572=";
const QUERY_CHAIN_PARAM_PREFIX = "&entry.1836374054=";

export function isNlInterface(): boolean {
  // Returns true if currently on the NL page.
  const path = window.location.pathname;
  return path === "/nl" || path === "/nl/";
}

export function getFeedbackLink(query: string, queryChain: string[]): string {
  const paramMap = {
    [QUERY_PARAM_PREFIX]: query,
    [SOURCE_PARAM_PREFIX]: window.location.toString(),
    [VERSION_PARAM_PREFIX]:
      document.getElementById("metadata").dataset.websiteHash || "",
    [QUERY_CHAIN_PARAM_PREFIX]: JSON.stringify(queryChain),
  };
  let link = FEEDBACK_LINK;
  Object.keys(paramMap).forEach((prefix) => {
    const value = paramMap[prefix];
    if (value) {
      link += `${prefix}${value}`;
    }
  });
  return encodeURI(link);
}
