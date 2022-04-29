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

import { StatMetadata } from "../../shared/stat_types";

export const BQ_QUERY_HEADER_COMMENT =
  "#\n# To use this query, please link Data Commons to your GCP Project (https://bit.ly/dc-bq-ah).\n# For more information on querying Data Commons, see https://bit.ly/dc-bq-doc.\n#\n";
const BQ_LINK =
  "https://console.cloud.google.com/bigquery;create-new-query-tab=";

/**
 * Sets up the bq button if it is in the html.
 * @returns
 */
export function setUpBqButton(getSqlQuery: () => string): HTMLAnchorElement {
  const bqLink = document.getElementById("bq-link") as HTMLAnchorElement;
  if (bqLink) {
    bqLink.onclick = () => {
      const query = BQ_QUERY_HEADER_COMMENT + getSqlQuery();
      const encodedQuery = encodeURIComponent(query)
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29");
      const url = BQ_LINK + encodedQuery;
      window.open(url, "_blank", "noreferrer");
    };
  }
  return bqLink;
}

/**
 * Gets the predicate string for matching stat metadata in a table
 * @param obsTableName
 * @param metadata
 * @returns
 */
export function getSvMetadataPredicates(
  obsTableName: string,
  provTableName: string,
  metadata: StatMetadata
): string[] {
  const result = [];
  const mMethodString = metadata.measurementMethod
    ? `= '${metadata.measurementMethod}'`
    : "IS NULL";
  result.push(`${obsTableName}.measurement_method ${mMethodString}`);
  const unitString = metadata.unit ? `= '${metadata.unit}'` : "IS NULL";
  result.push(`${obsTableName}.unit ${unitString}`);
  const obsPeriodString = metadata.observationPeriod
    ? `= '${metadata.observationPeriod}'`
    : "IS NULL";
  result.push(`${obsTableName}.observation_period ${obsPeriodString}`);
  const sFactorString = metadata.scalingFactor
    ? `= '${metadata.scalingFactor}'`
    : "IS NULL";
  result.push(`${obsTableName}.scaling_factor ${sFactorString}`);
  if (metadata.importName) {
    result.push(`${provTableName}.name = '${metadata.importName}'`);
  }
  return result;
}
