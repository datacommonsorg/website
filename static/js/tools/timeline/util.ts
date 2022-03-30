/**
 * Copyright 2020 Google LLC
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
import axios from "axios";
import _ from "lodash";

export const statVarSep = "__";
export const placeSep = ",";

export interface TokenInfo {
  name: string;
  sep: string;
  tokens: Set<string>;
}

export function getPlaceNames(
  dcids: string[]
): Promise<{ [key: string]: string }> {
  let url = "/api/place/name?";
  const urls = [];
  for (const place of dcids) {
    urls.push(`dcid=${place}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

export function getTokensFromUrl(name: string, sep: string): Set<string> {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  const tokenString = urlParams.get(name);
  let tokens: Set<string> = new Set();
  if (tokenString) {
    tokens = new Set(tokenString.split(sep));
  }
  return tokens;
}

export function setTokensToUrl(tokens: TokenInfo[]): void {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  for (const token of tokens) {
    urlParams.set(token.name, Array.from(token.tokens).join(token.sep));
  }
  window.location.hash = urlParams.toString();
}

// Add a token to the url. A token could either be a place dcid, a stat var or
// a [stat var,denominator] pair separated by comma.
export function addToken(name: string, sep: string, token: string): void {
  const tokens = getTokensFromUrl(name, sep);
  if (tokens.has(token)) {
    return;
  }
  tokens.add(token);
  setTokensToUrl([{ name, sep, tokens }]);
}

// Remove a token from the url.
export function removeToken(name: string, sep: string, token: string): void {
  const tokens = getTokensFromUrl(name, sep);
  if (!tokens.has(token)) {
    return;
  }
  tokens.delete(token);
  setTokensToUrl([{ name, sep, tokens }]);
}

// Set option for a chart, current support options are:
// - "pc": per capita.
// - "delta": increment of consecutive point in the time series.
export function setChartOption(
  mprop: string,
  name: string,
  value: boolean
): void {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  let chartOptions = JSON.parse(urlParams.get("chart"));
  if (!chartOptions) {
    chartOptions = {};
  }
  if (typeof chartOptions[mprop] == "boolean") {
    // To make this work with old url with only per capita option.
    chartOptions[mprop] = {
      pc: chartOptions[mprop],
    };
  }
  if (!chartOptions[mprop]) {
    chartOptions[mprop] = {};
  }
  chartOptions[mprop][name] = value;
  urlParams.set("chart", JSON.stringify(chartOptions));
  if (!value) {
    // "&<option-name>" means set the option for all charts.
    urlParams.delete(name);
  }
  window.location.hash = urlParams.toString();
}

// Set denom for a chart
export function setDenom(mprop: string, denom: string): void {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  if (urlParams.get("denom") != null) {
    urlParams.delete("denom");
  }
  let chartOptions = JSON.parse(urlParams.get("chart"));
  if (!chartOptions) {
    chartOptions = {};
  }
  if (!chartOptions[mprop]) {
    chartOptions[mprop] = {};
  }
  chartOptions[mprop]["denom"] = denom;
  urlParams.set("chart", JSON.stringify(chartOptions));
  window.location.hash = urlParams.toString();
}

// Get option for a chart, current support options are:
// - "pc": per capita.
// - "delta": increment of consecutive point in the time series.
export function getChartOption(mprop: string, name: string): boolean {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  if (urlParams.get(name) != null) {
    return true;
  }
  const chartOptions = JSON.parse(urlParams.get("chart"));
  if (!chartOptions) {
    return false;
  }
  if (mprop in chartOptions) {
    if (typeof chartOptions[mprop] == "boolean") {
      // To make this work with old url with only per capita option.
      if (name === "pc") {
        return chartOptions[mprop];
      }
      return false;
    } else if (name in chartOptions[mprop]) {
      return chartOptions[mprop][name];
    }
    return false;
  }
  return false;
}

export function getDenom(mprop: string): string {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  if (urlParams.get("denom") != null) {
    return urlParams.get("denom");
  }
  const chartOptions = JSON.parse(urlParams.get("chart"));
  if (!chartOptions) {
    return "";
  }
  if (mprop in chartOptions && "denom" in chartOptions[mprop]) {
    return chartOptions[mprop]["denom"];
  }
  return "";
}

// Set metahash map (a map of stat var dcid to hash representing the source to
// of data to use) in the URL
export function setMetahash(metahash: Record<string, string>): void {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  let metahashMap = JSON.parse(urlParams.get("metahash"));
  if (metahashMap) {
    urlParams.delete("metahash");
  } else {
    metahashMap = {};
  }
  for (const sv of Object.keys(metahash)) {
    metahashMap[sv] = metahash[sv];
    if (!metahashMap[sv]) {
      delete metahashMap[sv];
    }
  }
  if (!_.isEmpty(metahashMap)) {
    urlParams.set("metahash", JSON.stringify(metahashMap));
  }
  window.location.hash = urlParams.toString();
}

// Get the metahash map from the URL.
export function getMetahash(): Record<string, string> {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  const metahashMap = urlParams.get("metahash");
  if (!metahashMap) {
    return {};
  }
  return JSON.parse(metahashMap);
}
