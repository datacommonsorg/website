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

import _ from "lodash";
import { DEFAULT_FIELD_DELIMITER } from "./constants";
import {
  DataRow,
  EntityGroupedDataRow,
  FacetOverride,
  PerCapitaObservation,
} from "./data_commons_client_types";
import { Observation } from "./data_commons_web_client_types";

export const DEFAULT_WEB_API_ROOT = "https://datacommons.org";

/**
 * Default override for facets / stat metadata for particular unit dcids.
 * Used by DataCommonsClient (DataCommonsWebClient will still return raw values)
 */
export const DEFAULT_FACET_OVERRIDE: FacetOverride = {
  SDG_CON_USD_M: {
    scalingFactor: 1 / 1000000,
  },
  SDG_CUR_LCU_M: {
    scalingFactor: 1 / 1000000,
  },
  SDG_CU_USD_B: {
    scalingFactor: 1 / 1000000000,
  },
  SDG_CU_USD_M: {
    scalingFactor: 1 / 1000000,
  },
  SDG_HA_TH: {
    scalingFactor: 1 / 1000,
  },
  SDG_NUM_M: {
    scalingFactor: 1 / 1000000,
  },
  SDG_NUM_TH: {
    scalingFactor: 1 / 1000,
  },
  SDG_TONNES_M: {
    scalingFactor: 1 / 1000000,
  },
};

/**
 * Converts an object to URLSearchParams.
 *
 * Example:
 *
 * Input:
 * `{
 *   "string_key": "string_value",
 *   "number_key": 123,
 *   "string_arr_key": ["value1", "value2"]
 * }`
 *
 * Returns a URLSearchParams object with the equivalent query string:
 * `string_key=string_value&number_key=123&string_arr_key=value1&string_arr_key=value2`
 *
 * @param obj object to convert URLSearchParams
 * @returns URLSearchParams object
 */
export const toURLSearchParams = (
  obj: Record<string, string | string[] | number | null | undefined>
) => {
  const urlSearchParams = new URLSearchParams();
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined || obj[key] === null) {
      return;
    }
    if (typeof obj[key] == "object") {
      const values = obj[key] as string[];
      values.forEach((value) => {
        urlSearchParams.append(key, value);
      });
      return;
    }
    urlSearchParams.append(key, String(obj[key]));
  });
  // Sort search params for easier unit testing query string comparisons
  urlSearchParams.sort();
  return urlSearchParams;
};

/**
 * Encodes an array to a valid CSV row. Replaces double quotes with double-double quotes (`" -> ""`)
 *
 * Example: `["String one", 'String "two"', 123, null, true]`
 * Returns: `"String one","String ""two""",123,null,true`
 * @param items array of strings, numbers, booleans, etc.
 * @returns CSV row
 */
export function encodeCsvRow(items: any[]): string {
  return items
    .map((item) => {
      if (typeof item === "string") {
        // Quote strings and replace all double quotes (") with double-double quotes ("")
        return `"${item.replace(/"/g, '""')}"`;
      }
      if (item === null) {
        return `""`;
      }
      return String(item);
    })
    .join(",");
}

/**
 * Calculated per-capita values for the given variable observations using the
 * closest population observation by date to the passed in population
 * observations.
 *
 * Both `num` and `denom` series are sorted ascending by date.
 *
 * @param variableObservations Sorted numerator observation series.
 * @param populationObservations Sorted population observation series.
 * @param scaling Scale per capita value by dividing by this amount
 *
 * @returns A list of population observations along with calculated per capita
 *          values
 */
export function computePerCapitaRatio(
  variableObservations: Observation[],
  populationObservations: Observation[],
  scaling = 1
): PerCapitaObservation[] {
  if (_.isEmpty(populationObservations)) {
    return [];
  }
  const result: PerCapitaObservation[] = [];
  let j = 0; // denominator position
  for (let i = 0; i < variableObservations.length; i++) {
    const numDate = Date.parse(variableObservations[i].date);
    const denomDate = Date.parse(populationObservations[j].date);
    // Walk through the denom array to find entry with the closest date
    while (j < populationObservations.length - 1 && numDate > denomDate) {
      const denomDateNext = Date.parse(populationObservations[j + 1].date);
      const nextBetter =
        Math.abs(denomDateNext - numDate) < Math.abs(denomDate - numDate);
      if (nextBetter) {
        j++;
      } else {
        break;
      }
    }
    let quotientValue: number;
    if (populationObservations[j].value == 0) {
      quotientValue = 0;
    } else {
      quotientValue =
        variableObservations[i].value /
        populationObservations[j].value /
        scaling;
    }
    result.push({
      ...populationObservations[j],
      perCapitaValue: quotientValue,
    });
  }
  return result;
}

/**
 * Flattens a nested JavaScript object to a single level, preserving key/value
 * pairs. Combines keys using the specified delimiter
 *
 * Example:
 * object = {
 *   key1 : {
 *     key2 : "key2value"
 *   },
 *   arrayKey : [
 *     {
 *       arrayItem: "arrayItem1Value"
 *     },
 *     {
 *       arrayItem: "arrayItem2Value"
 *     }
 *   ]
 * }
 * delimiter = "."
 *
 * Result:
 * {
 *   "key1.key2": "key2value",
 *   "arrayKey.0.arrayItem": "arrayItem1Value",
 *   "arrayKey.1.arrayItem": "arrayItem2Value"
 * }
 * @param value object to flatten
 * @param delimiter delimiter used to combine key names
 * @return flattened object
 */
export function flattenNestedObject(
  object: any,
  delimiter = "."
): Record<string, string | number | boolean> {
  const resultObject: Record<string, string | number | boolean> = {};
  // Recursion helper
  const flattenNestedObjectHelper = (keyParts: string[], value: any) => {
    if (value !== null && typeof value === "object" && _.isEmpty(value)) {
      // Exclude empty objects and empty arrays
      return;
    } else if (Array.isArray(value)) {
      value.forEach((subValue, index) => {
        flattenNestedObjectHelper([...keyParts, `${index}`], subValue);
      });
    } else if (value !== null && typeof value === "object") {
      Object.keys(value).forEach((key) => {
        flattenNestedObjectHelper([...keyParts, key], value[key]);
      });
    } else {
      resultObject[keyParts.join(delimiter)] = value;
    }
  };

  Object.keys(object).forEach((key) => {
    flattenNestedObjectHelper([key], object[key]);
  });
  return resultObject;
}

/**
 * Converts the passed in data rows to a CSV string.
 * Flattens data row structure using the specified file delimiter.
 *
 * @param dataRows Data rows
 * @param fieldDelimiter Delimiter for flattening nested data row items
 * @param transformHeader Optional callback for transforming header text
 * @returns CSV string
 */
export function dataRowsToCsv(
  dataRows: DataRow[] | EntityGroupedDataRow[],
  fieldDelimiter: string = DEFAULT_FIELD_DELIMITER,
  transformHeader?: (columnHeader: string) => string
) {
  if (dataRows.length === 0) {
    return "";
  }
  // Build CSV header while flattening data rows
  const headerSet = new Set<string>();
  const flattenedDataRows = dataRows.map((dataRow) => {
    const flattenedDataRow = flattenNestedObject(dataRow, fieldDelimiter);
    Object.keys(flattenedDataRow).forEach((columnName) => {
      headerSet.add(columnName);
    });
    return flattenedDataRow;
  });

  const header = Array.from(headerSet).sort();
  const rows = flattenedDataRows.map((flattenedDataRow) =>
    header.map((column) => flattenedDataRow[column])
  );
  const transformedHeader = transformHeader
    ? header.map(transformHeader)
    : header;
  const csvRows = [transformedHeader, ...rows];
  const csvLines = csvRows.map(encodeCsvRow);
  return csvLines.join("\n");
}

/**
 * Returns true if an observation date falls between the specified startDate and
 * endDate. Also returns true if neither startDate nor endDate are specified.
 *
 * Dates are specified as ISO-8601 (Examples: "2023", "2023-01-01")
 *
 * Truncates observation date length to match the start and end date lengths for
 * respective comparisons.
 *
 * Example:
 *
 * observationDate = "2024-05-6"
 * startDate = "2023"
 * endDate = "2024-05"
 *
 * Truncating the observationDate when comparing to startDate gives us "2024"
 * Truncating the observation date when comparing to endDate gives us "2024-05"
 * Result is true because:
 *   truncatedObservationDate <= endDate (i.e., "2024-05 <= "2024-05)
 *   AND truncatedObservationDate >= startDate (i.e., "2024" >= "2023")
 *
 * @param observationDate Observation date string
 * @param startDate Start date string
 * @param endDate End date string
 * @returns boolean
 */
export function isDateInRange(
  observationDate: string,
  startDate: string | undefined,
  endDate: string | undefined
): boolean {
  if (startDate && startDate > observationDate.slice(0, startDate.length)) {
    return false;
  }
  if (endDate && endDate < observationDate.slice(0, endDate.length)) {
    return false;
  }
  return true;
}

/**
 * Parses the website apiRoot parameter for DataCommonsClient and
 * DataCommonsWebClient
 *
 * - Defaults to "https://datacommons.org" if apiRoot is undefined or ""
 * - If apiRoot is "/", returns an empty string that indicates we should use the
 * current hostname as the website API root.
 * - Otherwise, uses the website api root specified with trailing slashes
 * stripped
 *
 * @param apiRoot Data Commons Website API root
 * @returns API root URL
 */
export function parseWebsiteApiRoot(apiRoot?: string): string {
  return apiRoot ? apiRoot.replace(/\/$/, "") : DEFAULT_WEB_API_ROOT;
}
