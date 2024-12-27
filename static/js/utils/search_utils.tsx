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

import axios from "axios";
import React from "react";

import { StatVarSearchResult } from "../shared/types";

/**
 * Given a query for a list of places, returns a promise with stat vars and
 * stat var groups that match the query
 */
export function getStatVarSearchResults(
  query: string,
  places: string[],
  svOnly: boolean
): Promise<StatVarSearchResult> {
  const url = "/api/stats/stat-var-search";
  const payload = {
    query,
    places,
    svOnly,
  };
  return axios.post(url, payload).then((resp) => {
    const data = resp.data;
    return {
      matches: data.matches || [],
      statVars: data.statVars || [],
      statVarGroups: data.statVarGroups || [],
    };
  });
}

/**
 * Creates a jsx element with parts of the string matching a set of words
 * highlighted.
 * eg. s: "test string abc def", matches: ["abc", "blank"]
 * would return s with "abc" highlighted
 */
export function getHighlightedJSX(
  id: string,
  s: string,
  matches: string[]
): JSX.Element {
  let prevResult = [s];
  let currResult = [];
  matches.sort((a, b) => b.length - a.length);
  // Escape any invalid symbols in the returned matches
  const processedMatches = matches.map((match) =>
    match.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")
  );
  for (const match of processedMatches) {
    try {
      const re = new RegExp(`(${match})`, "gi");
      prevResult.forEach((stringPart) =>
        currResult.push(...stringPart.split(re))
      );
      prevResult = currResult;
      currResult = [];
    } catch (e) {
      // If trying to split the string on one of the returned matches fails,
      // should just continue through the rest of the matches
      continue;
    }
  }
  return (
    <>
      {prevResult.map((stringPart, i) => {
        if (matches.indexOf(stringPart.toLowerCase()) > -1) {
          return <b key={`${id}-${i}`}>{stringPart}</b>;
        } else {
          return stringPart;
        }
      })}
    </>
  );
}
